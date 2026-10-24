/* Ocarto v248 runtime assets. Original bundled licenses retained. */

/* kml-export.js */
/* KMZ export for georeferenced Ocarto GeoJSON maps. */
(function(root){
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
  function geoJsonToKml(data,transformCoordinate){
    if(data?.metadata?.coordinate_status!=='georeferenced')throw Error('Para exportar a KMZ, georreferencia el mapa y asigna su CRS');
    const source=String(data.metadata.crs||'').trim().toUpperCase();
    if(!/^EPSG:(4326|258(?:2[8-9]|3[0-8])|326(?:0[1-9]|[1-5][0-9]|60)|327(?:0[1-9]|[1-5][0-9]|60))$/.test(source))throw Error('La exportación KMZ requiere EPSG:4326 o un CRS UTM EPSG:258xx, 326xx o 327xx compatible');
    if(typeof transformCoordinate!=='function')throw Error('No está disponible la conversión de coordenadas');
    const xy=coord=>{
      if(!Array.isArray(coord)||coord.length<2||!Number.isFinite(Number(coord[0]))||!Number.isFinite(Number(coord[1])))throw Error('El mapa contiene coordenadas no válidas');
      const p=source==='EPSG:4326'?{x:Number(coord[0]),y:Number(coord[1])}:transformCoordinate(Number(coord[0]),Number(coord[1]),source,'EPSG:4326');
      if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x < -180||p.x>180||p.y < -90||p.y>90)throw Error('Una coordenada no se pudo convertir a longitud/latitud');
      const lon=Number(p.x.toFixed(8)),lat=Number(p.y.toFixed(8));
      return `${lon},${lat}`;
    };
    const line=coords=>{if(!Array.isArray(coords)||coords.length<2)throw Error('Línea sin suficientes vértices');return coords.map(xy).join(' ')};
    const ring=coords=>{if(!Array.isArray(coords)||coords.length<3)throw Error('Polígono sin suficientes vértices');const pts=coords.slice(),a=pts[0],b=pts.at(-1);if(!Array.isArray(b)||Number(a[0])!==Number(b[0])||Number(a[1])!==Number(b[1]))pts.push(a);return line(pts)};
    const geometry=g=>{
      if(!g||!g.type)throw Error('Geometría vacía');
      if(g.type==='Point')return `<Point><coordinates>${xy(g.coordinates)}</coordinates></Point>`;
      if(g.type==='MultiPoint')return `<MultiGeometry>${g.coordinates.map(c=>geometry({type:'Point',coordinates:c})).join('')}</MultiGeometry>`;
      if(g.type==='LineString')return `<LineString><tessellate>1</tessellate><coordinates>${line(g.coordinates)}</coordinates></LineString>`;
      if(g.type==='MultiLineString')return `<MultiGeometry>${g.coordinates.map(c=>geometry({type:'LineString',coordinates:c})).join('')}</MultiGeometry>`;
      if(g.type==='Polygon'){
        if(!Array.isArray(g.coordinates)||!g.coordinates.length)throw Error('Polígono sin anillo exterior');
        const [outer,...holes]=g.coordinates;
        return `<Polygon><tessellate>1</tessellate><outerBoundaryIs><LinearRing><coordinates>${ring(outer)}</coordinates></LinearRing></outerBoundaryIs>${holes.map(h=>`<innerBoundaryIs><LinearRing><coordinates>${ring(h)}</coordinates></LinearRing></innerBoundaryIs>`).join('')}</Polygon>`;
      }
      if(g.type==='MultiPolygon')return `<MultiGeometry>${g.coordinates.map(c=>geometry({type:'Polygon',coordinates:c})).join('')}</MultiGeometry>`;
      throw Error(`Geometría ${g.type} no compatible con KML`);
    };
    const hiddenLayers=new Set((data.metadata.vector_layers||[]).filter(layer=>layer.visible===false).map(layer=>layer.name));
    const features=(Array.isArray(data.features)?data.features:[]).filter(feature=>!hiddenLayers.has(feature?.properties?.vector_layer));
    if(!features.length)throw Error('No hay elementos visibles para exportar');
    const placemarks=features.map(feature=>{
      const props=feature?.properties||{},name=props.symbol_name||props.name||props.vector_layer||'Elemento';
      const geometryXml=geometry(feature.geometry);
      const fields=[['símbolo',props.symbol],['capa',props.vector_layer],['candidato LiDAR',props.candidate?'sí':null],['origen',props.source]].filter(pair=>pair[1]!==undefined&&pair[1]!==null&&pair[1]!=='');
      const extended=fields.length?`<ExtendedData>${fields.map(([k,v])=>`<Data name="${esc(k)}"><value>${esc(v)}</value></Data>`).join('')}</ExtendedData>`:'';
      return `<Placemark><name>${esc(name)}</name>${extended}<Style><LineStyle><color>ff469b55</color><width>1.5</width></LineStyle><PolyStyle><color>55469b55</color><fill>1</fill><outline>1</outline></PolyStyle><IconStyle><color>ff469b55</color><scale>0.8</scale></IconStyle></Style>${geometryXml}</Placemark>`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${esc(data.name||'Mapa Ocarto')}</name>${placemarks}</Document></kml>`;
  }
  async function toKmz(kml,zipApi){if(!zipApi||typeof zipApi.prototype?.file!=='function')throw Error('No está disponible el creador de archivos KMZ');const zip=new zipApi();zip.file('doc.kml',kml);return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}})}
  root.OcartoKmlExport={geoJsonToKml,toKmz};
  if(typeof module==='object'&&module.exports)module.exports=root.OcartoKmlExport;
})(typeof globalThis!=='undefined'?globalThis:this);

;

/* dxf-import.js */
/* Basic ASCII DXF entities to GeoJSON. CRS must come from the active map. */
(function(root){
  'use strict';
  function parsePairs(text){
    if(String(text).startsWith('AutoCAD Binary DXF'))throw Error('El DXF binario aún no se admite; guárdalo como DXF ASCII');
    const lines=String(text).replace(/^\uFEFF/,'').replace(/\r/g,'').split('\n'),pairs=[];
    for(let i=0;i+1<lines.length;i+=2){const code=Number(lines[i].trim());if(Number.isInteger(code))pairs.push({code,value:lines[i+1].trim()})}
    return pairs;
  }
  function splitRecords(pairs){const records=[];let current=null;for(const pair of pairs){if(pair.code===0){if(current)records.push(current);current={type:pair.value.toUpperCase(),pairs:[]}}else if(current)current.pairs.push(pair)}if(current)records.push(current);return records}
  const value=(record,code)=>record.pairs.find(p=>p.code===code)?.value;
  const number=(record,code,fallback=0)=>{const n=Number(value(record,code));return Number.isFinite(n)?n:fallback};
  function unitsFactor(pairs){for(let i=0;i<pairs.length-1;i++){if(pairs[i].code===9&&pairs[i].value.toUpperCase()==='$INSUNITS'){for(let j=i+1;j<pairs.length&&j<i+5;j++)if(pairs[j].code===70){const units=Number(pairs[j].value);return({1:.0254,2:.3048,4:.001,5:.01,6:1,7:1000,14:.1,15:10,16:100})[units]??1}}}return 1}
  function pairPoint(record,xCode,yCode,factor=1){const x=Number(value(record,xCode)),y=Number(value(record,yCode));return Number.isFinite(x)&&Number.isFinite(y)?[x*factor,y*factor]:null}
  function bulgeSegment(a,b,bulge){if(!bulge)return[];const dx=b[0]-a[0],dy=b[1]-a[1],chord=Math.hypot(dx,dy);if(!chord)return[];const theta=4*Math.atan(bulge),offset=chord*(1-bulge*bulge)/(4*bulge),mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,cx=mx-dy/chord*offset,cy=my+dx/chord*offset,start=Math.atan2(a[1]-cy,a[0]-cx),steps=Math.min(720,Math.max(1,Math.ceil(Math.abs(theta)/(Math.PI/18)))),radius=Math.hypot(a[0]-cx,a[1]-cy),out=[];for(let i=1;i<steps;i++){const angle=start+theta*i/steps;out.push([cx+radius*Math.cos(angle),cy+radius*Math.sin(angle)])}return out}
  function polylineVertices(record,factor){const out=[];let point=null;for(const p of record.pairs){if(p.code===10){if(point)out.push(point);point={x:Number(p.value)*factor,y:null,bulge:0}}else if(point&&p.code===20)point.y=Number(p.value)*factor;else if(point&&p.code===42)point.bulge=Number(p.value)}if(point)out.push(point);return out.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))}
  function polylineGeometry(vertices,closed){if(vertices.length<(closed?3:2))return null;const out=[];for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length];out.push([a.x,a.y]);if((i<vertices.length-1||closed)&&a.bulge)out.push(...bulgeSegment([a.x,a.y],[b.x,b.y],a.bulge))}if(closed)out.push(out[0]);return{type:closed?'Polygon':'LineString',coordinates:closed?[out]:out}}
  function sampleArc(cx,cy,r,start,end,factor,full=false){let sweep=end-start;if(sweep<=0&&full)sweep=360;else if(sweep<=0)sweep+=360;const steps=Math.min(720,Math.max(2,Math.ceil(sweep/10))),out=[];for(let i=0;i<=steps;i++){const angle=(start+sweep*i/steps)*Math.PI/180;out.push([(cx+r*Math.cos(angle))*factor,(cy+r*Math.sin(angle))*factor])}return out}
  function entityGeometry(record,factor){const t=record.type;
    if(t==='POINT'){const p=pairPoint(record,10,20,factor);return p?{type:'Point',coordinates:p}:null}
    if(t==='LINE'){const a=pairPoint(record,10,20,factor),b=pairPoint(record,11,21,factor);return a&&b?{type:'LineString',coordinates:[a,b]}:null}
    if(t==='LWPOLYLINE'){const vertices=polylineVertices(record,factor);return polylineGeometry(vertices,(number(record,70)&1)!==0)}
    if(t==='CIRCLE'){const c=pairPoint(record,10,20),r=number(record,40);if(!c||r<=0)return null;return{type:'Polygon',coordinates:[sampleArc(c[0],c[1],r,0,360,factor,true)]}}
    if(t==='ARC'){const c=pairPoint(record,10,20),r=number(record,40);if(!c||r<=0)return null;return{type:'LineString',coordinates:sampleArc(c[0],c[1],r,number(record,50),number(record,51),factor)}}
    return null;
  }
  function parseDxf(text,options={}){
    const pairs=parsePairs(text),records=splitRecords(pairs);let inEntities=false,entities=[];
    for(const r of records){if(r.type==='SECTION'){inEntities=value(r,2)?.toUpperCase()==='ENTITIES';continue}if(r.type==='ENDSEC'){inEntities=false;continue}if(inEntities)entities.push(r)}
    if(!entities.length)throw Error('El DXF no contiene entidades en la sección ENTITIES');
    const referenced=!!options.referenced,mapCrs=String(options.mapCrs||'').trim();if(referenced&&!mapCrs)throw Error('Indica el CRS del mapa antes de importar DXF georreferenciado');
    const unitFactor=unitsFactor(pairs),factor=referenced&&mapCrs.toUpperCase()!=='EPSG:4326'?unitFactor:1,features=[];let skipped=0;
    for(let i=0;i<entities.length;i++){
      const r=entities[i];if(r.type==='POLYLINE'){
        const header=r;let verts=[];i++;while(i<entities.length&&entities[i].type==='VERTEX'){const p=pairPoint(entities[i],10,20,factor);if(p)verts.push({x:p[0],y:p[1],bulge:number(entities[i],42)});i++}if(entities[i]?.type!=='SEQEND')i--;
        const g=polylineGeometry(verts,(number(header,70)&1)!==0);if(g)features.push({type:'Feature',geometry:g,properties:{name:value(header,8)||'POLYLINE',dxf_layer:value(header,8)||'0',dxf_type:'POLYLINE'}});else skipped++;continue;
      }
      if(r.type==='VERTEX'||r.type==='SEQEND')continue;
      const g=entityGeometry(r,factor);if(g)features.push({type:'Feature',geometry:g,properties:{name:value(r,8)||r.type,dxf_layer:value(r,8)||'0',dxf_type:r.type}});else skipped++;
    }
    if(!features.length)throw Error('No se encontraron entidades DXF compatibles (POINT, LINE, polilíneas, CIRCLE o ARC)');
    return{type:'FeatureCollection',metadata:{crs:referenced?mapCrs:'local',coordinate_status:referenced?'georeferenced':'local',dxf_units_factor:unitFactor,layers:[...new Set(features.map(f=>f.properties?.dxf_layer).filter(Boolean))]},features,skipped};
  }
  root.OcartoDxf={parseDxf};if(typeof module==='object'&&module.exports)module.exports=root.OcartoDxf;
})(typeof globalThis!=='undefined'?globalThis:this);

;

/* terrain-grid.js */
/* Ocarto v17: conservative, non-extrapolating ground-grid interpolation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoTerrain=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function buildModel(points,cell,opts={}){
 if(!Number.isFinite(cell)||cell<=0)throw Error('Tamaño de celda inválido');
 if(!Array.isArray(points)||points.length>1000000)throw Error('Rejilla demasiado grande');
 const maxOutput=Number.isInteger(opts.maxOutput)?opts.maxOutput:1000000;
 const observed=new Map();let duplicate=0;
 for(const p of points){if(!Array.isArray(p)||p.length<4||![p[0],p[1],p[2],p[3]].every(Number.isFinite)||p[3]<1)throw Error('Celda de suelo inválida');
  const cx=Math.floor(p[0]/cell),cy=Math.floor(p[1]/cell),key=cx+','+cy;
  if(observed.has(key)){duplicate++;const old=observed.get(key);if(p[2]<old.z)old.z=p[2];old.n+=p[3]}
  else observed.set(key,{cx,cy,z:p[2],n:p[3],source:'observado'});
 }
 // Only one-cell enclosed gaps surrounded by four *observed* neighbours.
 // Do not recurse into interpolated cells or extrapolate outside coverage.
 const pending=new Set();for(const p of observed.values()){
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const cx=p.cx+dx,cy=p.cy+dy,key=cx+','+cy;if(!observed.has(key))pending.add(key)}
 }
 const out=[...observed.values()];let filled=0,unfilled=0;
 for(const key of pending){const [cx,cy]=key.split(',').map(Number),neighbors=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>observed.get((cx+dx)+','+(cy+dy)));
  if(neighbors.every(Boolean)){
   if(out.length>=maxOutput)throw Error('Demasiadas celdas MDT; aumenta el tamaño de celda');
   out.push({cx,cy,z:neighbors.reduce((n,p)=>n+p.z,0)/4,n:0,source:'interpolado'});filled++
  }else unfilled++;
 }
 out.sort((a,b)=>a.cy-b.cy||a.cx-b.cx);
 return{rows:out.map(p=>[(p.cx+.5)*cell,(p.cy+.5)*cell,p.z,p.n,p.source]),observed:observed.size,filled,unfilled,duplicates:duplicate,method:'vecinos cardinales 4, solo huecos internos de una celda; sin extrapolación'};
}
return{buildModel};
});

;

/* contours.js */
/* Ocarto v18: preliminary, unsmoothed contours from ground-only MDT cell centres. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoContours=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function generate(rows,cell,interval,opts={}){
 if(!Number.isFinite(cell)||cell<=0||!Number.isFinite(interval)||interval<=0)throw Error('Celda o equidistancia inválida');
 if(!Array.isArray(rows)||rows.length>1000000)throw Error('MDT demasiado grande');
 const limit=Number.isInteger(opts.maxSegments)?opts.maxSegments:1000000;
 if(limit<1||limit>1000000)throw Error('Límite de segmentos inválido');
 const map=new Map(); let min=Infinity,max=-Infinity;
 for(const p of rows){if(!Array.isArray(p)||p.length<3||!p.slice(0,3).every(Number.isFinite))throw Error('Cota MDT inválida');
  const i=Math.round(p[0]/cell-.5),j=Math.round(p[1]/cell-.5),k=i+','+j;
  if(Math.abs((i+.5)*cell-p[0])>cell*1e-5||Math.abs((j+.5)*cell-p[1])>cell*1e-5)throw Error('Coordenadas de centro de celda inválidas');
  if(map.has(k))throw Error('Celda MDT repetida');map.set(k,{i,j,z:p[2]});min=Math.min(min,p[2]);max=Math.max(max,p[2]);
 }
 const segments=[];let squares=0,skipped=0;
 if(!map.size)return {features:[],segments:0,squares:0,skipped:0,interval};
 if((max-min)/interval>20000)throw Error('Equidistancia demasiado pequeña para las cotas');
 for(const p of map.values()){
  const right=map.get((p.i+1)+','+p.j),up=map.get(p.i+','+(p.j+1)),diag=map.get((p.i+1)+','+(p.j+1));
  if(!right||!up||!diag){skipped++;continue} squares++;
  // Counterclockwise: lower-left, lower-right, upper-right, upper-left.
  const v=[p.z,right.z,diag.z,up.z],xy=[[p.i+.5,p.j+.5],[p.i+1.5,p.j+.5],[p.i+1.5,p.j+1.5],[p.i+.5,p.j+1.5]];
  const lo=Math.min(...v),hi=Math.max(...v),k0=Math.floor(lo/interval)+1,k1=Math.ceil(hi/interval)-1;
  for(let k=k0;k<=k1;k++){
   const elevation=k*interval,edges=[];
   for(let e=0;e<4;e++){
    const a=e,b=(e+1)%4,za=v[a],zb=v[b];
    // Half-open crossing: exactly-on-contour vertex assigned deterministically.
    if((za<elevation&&zb>=elevation)||(zb<elevation&&za>=elevation)){
     const t=(elevation-za)/(zb-za);edges.push({edge:e,coord:[(xy[a][0]+t*(xy[b][0]-xy[a][0]))*cell,(xy[a][1]+t*(xy[b][1]-xy[a][1]))*cell]});
    }
   }
   if(edges.length===2){segments.push({elevation,coords:[edges[0].coord,edges[1].coord]});}
   else if(edges.length===4){
    // Asymptotic decider: evaluate bilinear centre to choose saddle connectivity.
    const centre=(v[0]+v[1]+v[2]+v[3])/4;
    const high0=v[0]>=elevation;
    const pairs=(high0===(centre>=elevation))?[[0,1],[2,3]]:[[0,3],[1,2]];
    for(const pair of pairs)segments.push({elevation,coords:[edges[pair[0]].coord,edges[pair[1]].coord]});
   }
   if(segments.length>limit)throw Error('Demasiados segmentos de curva; aumenta la equidistancia o el tamaño de celda');
  }
 }
 const features=segments.map((s,i)=>({type:'Feature',properties:{elevation:s.elevation,source:'MDT preliminar',unsmoothed:true},geometry:{type:'LineString',coordinates:s.coords}}));
 return {features,segments:segments.length,squares,skipped,interval,method:'marching squares sin suavizado; segmentos provisionales sin unir; sin extrapolación'};
}
// Connect only matching endpoints at the SAME elevation. Junctions remain separate:
// automatically guessing a route through a crossing would destroy cartographic detail.
function connect(features, opts={}) {
 if(!Array.isArray(features)||features.length>1000000)throw Error('Segmentos inválidos o demasiados');
 const tolerance=opts.tolerance===undefined?1e-7:Number(opts.tolerance);
 if(!Number.isFinite(tolerance)||tolerance<=0)throw Error('Tolerancia de unión inválida');
 const buckets=new Map(),edges=[];
 function key(x,y,z) {return String(z)+'|'+x+','+y}
 function endpoint(xy,z){
  const gx=Math.floor(xy[0]/tolerance),gy=Math.floor(xy[1]/tolerance);let match=null;
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
   const bucket=buckets.get(key(gx+dx,gy+dy,z));
   if(bucket){const candidates=Array.isArray(bucket)?bucket:[bucket];for(const node of candidates)if(Math.hypot(xy[0]-node.xy[0],xy[1]-node.xy[1])<=tolerance){if(match&&match!==node)throw Error('Coincidencia ambigua de vértices; reduce tolerancia');match=node}}
  }
  if(match)return match;
  const k=key(gx,gy,z),node={xy,links:[]},bucket=buckets.get(k);
  if(!bucket)buckets.set(k,node);else if(Array.isArray(bucket))bucket.push(node);else buckets.set(k,[bucket,node]);
  return node;
 }
 function forEachNode(fn){for(const bucket of buckets.values())if(Array.isArray(bucket)){for(const node of bucket)fn(node)}else fn(bucket)}
 for(const f of features){
  const coords=f?.geometry?.coordinates,z=f?.properties?.elevation;
  if(f?.geometry?.type!=='LineString'||!Array.isArray(coords)||coords.length!==2||!Number.isFinite(z)||!coords.every(c=>Array.isArray(c)&&c.length>=2&&Number.isFinite(c[0])&&Number.isFinite(c[1])))throw Error('Segmento de curva inválido');
  const a=endpoint(coords[0],z),b=endpoint(coords[1],z);
  if(a===b)continue;
  const e={a,b,z,used:false};edges.push(e);a.links.push(e);b.links.push(e);
 }
 const output=[];let closed=0,junctions=0;
 forEachNode(n=>{if(n.links.length>2)junctions++});
 function walk(start,first) {
  const points=[start.xy],elevation=first.z;let current=start,e=first,end;
  while(e&&!e.used){
   e.used=true; const next=e.a===current?e.b:e.a;
   points.push(next.xy);current=next;
   if(next===start){closed++;break}
   if(next.links.length!==2)break;
   e=next.links.find(v=>!v.used);
  }
  end=current;
  output.push({type:'Feature',properties:{elevation,source:'MDT preliminar',unsmoothed:true,connected:true,closed:end===start,review_required:true},geometry:{type:'LineString',coordinates:points.map(pt=>[pt[0],pt[1]])}});
 }
 // Prefer open ends and graph junctions. A pure cycle is handled afterwards.
 forEachNode(n=>{if(n.links.length!==2)for(const e of n.links)if(!e.used)walk(n,e)});
 for(const e of edges)if(!e.used)walk(e.a,e);
 return {features:output,segments:edges.length,lines:output.length,closed,junctions,tolerance,method:'v52: extremos coincidentes por cota y tolerancia espacial; sin suavizado; bifurcaciones separadas'};
}
return {generate,connect};
});

;

/* lidar-exports.js */
/* Ocarto v54: georeferenced PNG grids and contour DXF exports. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoLidarExports=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const MAX_PIXELS=12000000;
const DEFAULT_HEIGHT_STOPS=[{height:0,color:'#f2dc72'},{height:.3,color:'#e53935'},{height:2,color:'#48a868'},{height:5,color:'#ffffff'}];
function normalizeHeightStops(raw){
 const stops=raw===undefined||raw===null?DEFAULT_HEIGHT_STOPS:raw;
 if(!Array.isArray(stops)||stops.length!==4)throw Error('Configura cuatro alturas crecientes y colores hexadecimales válidos');
 const out=stops.map((s,i)=>({height:Number(s?.height),color:String(s?.color||'').toLowerCase()}));
 if(out.some(s=>!Number.isFinite(s.height)||s.height<0||!/^#[0-9a-f]{6}$/.test(s.color))||out.some((s,i)=>i>0&&s.height<=out[i-1].height))throw Error('Configura cuatro alturas crecientes y colores hexadecimales válidos');
 return out;
}
function heightColor(value,rawStops){const stops=normalizeHeightStops(rawStops),rgb=s=>[1,3,5].map(i=>parseInt(s.color.slice(i,i+2),16));if(value<=stops[0].height)return rgb(stops[0]);if(value>=stops.at(-1).height)return rgb(stops.at(-1));let i=1;while(value>stops[i].height)i++;const a=stops[i-1],b=stops[i],t=(value-a.height)/(b.height-a.height),ca=rgb(a),cb=rgb(b);return ca.map((v,k)=>Math.round(v+(cb[k]-v)*t))}
function rasterGrid(rows,cell,field='elevation',opts={}){
 if(!Array.isArray(rows)||!rows.length||!Number.isFinite(cell)||cell<=0)throw Error('MDT o tamaño de celda inválido');
 if(!['elevation','canopy','vegetation_density'].includes(field))throw Error('Variable de imagen inválida');
 let minI=Infinity,maxI=-Infinity,minJ=Infinity,maxJ=-Infinity;const cells=new Map();
 for(const row of rows){const x=field==='elevation'?row[0]:row.x,y=field==='elevation'?row[1]:row.y,v=field==='elevation'?row[2]:field==='canopy'?row.canopy_max_above_ground_m:row.vegetation_return_fraction;
  if(![x,y].every(Number.isFinite))throw Error('Coordenadas de celda inválidas');const i=Math.round(x/cell-.5),j=Math.round(y/cell-.5);
  if(Math.abs((i+.5)*cell-x)>cell*1e-5||Math.abs((j+.5)*cell-y)>cell*1e-5)throw Error('Coordenadas no alineadas a la rejilla');if(cells.has(i+','+j))throw Error('Celda duplicada en rejilla');
  cells.set(i+','+j,Number.isFinite(v)?v:null);minI=Math.min(i,minI);maxI=Math.max(i,maxI);minJ=Math.min(j,minJ);maxJ=Math.max(j,maxJ);
 }
 const width=maxI-minI+1,height=maxJ-minJ+1;if(width*height>(opts.maxPixels||MAX_PIXELS))throw Error('Imagen demasiado grande; aumenta el tamaño de celda');
 // Nunca expandir cientos de miles de alturas como argumentos de Math.min/max:
 // supera el límite de pila y duplica memoria en mosaicos LiDAR grandes.
 let observedMin=Infinity,observedMax=-Infinity,validCount=0;
 for(const v of cells.values())if(Number.isFinite(v)){
  if(field==='vegetation_density'&&(v<0||v>1))throw Error('La proporción de retornos de vegetación debe estar entre 0 y 1');
  if(v<observedMin)observedMin=v;
  if(v>observedMax)observedMax=v;
  validCount++;
 }
 if(!validCount)throw Error('No hay valores válidos para pintar');
 const min=Number.isFinite(opts.min)?opts.min:observedMin,max=Number.isFinite(opts.max)?opts.max:observedMax,rgba=new Uint8ClampedArray(width*height*4);
 const heightStops=field==='canopy'?normalizeHeightStops(opts.heightStops):null;
 for(const [key,v] of cells){if(!Number.isFinite(v))continue;const [i,j]=key.split(',').map(Number),col=i-minI,row=maxJ-j,index=(row*width+col)*4,t=max===min?.5:Math.max(0,Math.min(1,(v-min)/(max-min)));
  // Colour ramps are intended for visual interpretation, not official map symbols.
  if(field==='elevation'){rgba[index]=Math.round(35+220*t);rgba[index+1]=Math.round(85+105*(1-Math.abs(t-.5)*2));rgba[index+2]=Math.round(190-155*t)}else if(field==='vegetation_density'){rgba[index]=Math.round(245-205*t);rgba[index+1]=Math.round(247-145*t);rgba[index+2]=Math.round(230-205*t)}else{const color=heightColor(v,heightStops);rgba[index]=color[0];rgba[index+1]=color[1];rgba[index+2]=color[2]}rgba[index+3]=255;
 }
 const left=minI*cell,top=(maxJ+1)*cell;
 return{width,height,rgba,cell,min,max,field,heightStops,bounds:{left,bottom:minJ*cell,right:(maxI+1)*cell,top},worldFile:[cell,0,0,-cell,left+cell/2,top-cell/2].join('\n')+'\n'};
}
function prjWkt(crs){
 const value=String(crs||'').trim().toUpperCase().replace(/^URN:OGC:DEF:CRS:EPSG::/, 'EPSG:').replace(/^EPSG\s*:/,'EPSG:');
 const match=value.match(/^EPSG:(\d+)$/);if(!match)throw Error('Para crear un PRJ válido indica un código EPSG, por ejemplo EPSG:25830');
 const code=Number(match[1]);
 if(code===4326)return 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433],AUTHORITY["EPSG","4326"]]';
 if(code===4258)return 'GEOGCS["ETRS89",DATUM["European_Terrestrial_Reference_System_1989",SPHEROID["GRS 1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433],AUTHORITY["EPSG","4258"]]';
 const isEtrs=code>=25828&&code<=25838,isWgsNorth=code>=32601&&code<=32660,isWgsSouth=code>=32701&&code<=32760;
 if(!isEtrs&&!isWgsNorth&&!isWgsSouth)throw Error(`El CRS ${value} no está incluido en el generador PRJ. Usa EPSG:25828–25838, EPSG:32601–32660, EPSG:32701–32760, EPSG:4258 o EPSG:4326.`);
 const zone=isEtrs?code-25800:isWgsNorth?code-32600:code-32700,centralMeridian=zone*6-183,south=isWgsSouth;
 const datum=isEtrs?'European_Terrestrial_Reference_System_1989':'WGS_1984',spheroid=isEtrs?'GRS 1980':'WGS 84',inverseFlattening=isEtrs?'298.257222101':'298.257223563',name=isEtrs?'ETRS89':'WGS 84',auth=String(code);
 return `PROJCS["${name} / UTM zone ${zone}${south?'S':'N'}",GEOGCS["${name}",DATUM["${datum}",SPHEROID["${spheroid}",6378137,${inverseFlattening}]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",${centralMeridian}],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",${south?10000000:0}],UNIT["metre",1],AUTHORITY["EPSG","${auth}"]]`;
}
function contoursToDxf(features,crs=''){
 if(!Array.isArray(features)||!features.length)throw Error('No hay curvas para exportar');let out=['0','SECTION','2','HEADER','9','$INSUNITS','70','6','0','ENDSEC','0','SECTION','2','ENTITIES'];let count=0;
 for(const f of features){const pts=f?.geometry?.coordinates,z=Number(f?.properties?.elevation);if(f?.geometry?.type!=='LineString'||!Array.isArray(pts)||pts.length<2||!Number.isFinite(z)||!pts.every(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])))continue;
  const layer=('CURVA_'+z.toFixed(3)).replace(/[^A-Za-z0-9_.-]/g,'_').slice(0,31);out.push('0','LWPOLYLINE','8',layer,'90',String(pts.length),'70',pts.length>2&&Math.hypot(pts[0][0]-pts.at(-1)[0],pts[0][1]-pts.at(-1)[1])<1e-8?'1':'0','38',String(z));for(const p of pts)out.push('10',String(p[0]),'20',String(p[1]),'30','0');count++;
 }
 if(!count)throw Error('No hay líneas de curva válidas');out.push('0','ENDSEC','0','EOF');return{content:out.join('\r\n')+'\r\n',count,crs:String(crs||'')};
}
return{rasterGrid,prjWkt,contoursToDxf,DEFAULT_HEIGHT_STOPS,normalizeHeightStops,heightColor};
});

;

/* feature-map.js */
/* Ocarto v1.113: shaded near-ground LiDAR Feature Map renderer. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoFeatureMap=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const MAX_PIXELS=12000000,MAX_CELLS=1000000;
function render(cells,cell){
 cell=Number(cell);if(!Number.isFinite(cell)||cell<.1)throw Error('La celda del Feature Map debe ser de 0,1 m o mayor');
 const ii=cells?.i,jj=cells?.j,hh=cells?.height;if(!ii||!jj||!hh||ii.length!==jj.length||ii.length!==hh.length||!ii.length||ii.length>MAX_CELLS)throw Error('No hay celdas válidas para el Feature Map');
 let minI=Infinity,maxI=-Infinity,minJ=Infinity,maxJ=-Infinity;const values=new Map();
 for(let k=0;k<ii.length;k++){const i=Number(ii[k]),j=Number(jj[k]),h=Number(hh[k]);if(!Number.isSafeInteger(i)||!Number.isSafeInteger(j)||!Number.isFinite(h)||h<0)throw Error('Celda Feature Map inválida');const key=i+','+j;if(values.has(key))throw Error('Celda duplicada en Feature Map');values.set(key,h);minI=Math.min(minI,i);maxI=Math.max(maxI,i);minJ=Math.min(minJ,j);maxJ=Math.max(maxJ,j)}
 const width=maxI-minI+1,height=maxJ-minJ+1;if(width*height>MAX_PIXELS)throw Error('Imagen Feature Map demasiado grande; usa una celda mayor');
 const grid=new Float32Array(width*height);grid.fill(NaN);for(const [key,h] of values){const [i,j]=key.split(',').map(Number);grid[(maxJ-j)*width+(i-minI)]=h}
 const rgba=new Uint8ClampedArray(width*height*4),az=315*Math.PI/180,alt=45*Math.PI/180,zFactor=2;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const at=y*width+x,h=grid[at];if(!Number.isFinite(h))continue;
  const sample=(sx,sy)=>{const xx=Math.max(0,Math.min(width-1,sx)),yy=Math.max(0,Math.min(height-1,sy)),v=grid[yy*width+xx];return Number.isFinite(v)?v:h};
  const dx=(sample(x+1,y)-sample(x-1,y))/(2*cell)*zFactor,dy=(sample(x,y+1)-sample(x,y-1))/(2*cell)*zFactor,slope=Math.atan(Math.hypot(dx,dy)),aspect=Math.atan2(dy,-dx);
  const illumination=Math.max(0,Math.cos(alt)*Math.cos(slope)+Math.sin(alt)*Math.sin(slope)*Math.cos(az-aspect)),shade=Math.round(40+215*illumination),p=at*4;rgba[p]=rgba[p+1]=rgba[p+2]=shade;rgba[p+3]=255;
 }
 const left=minI*cell,top=(maxJ+1)*cell,worldFile=[cell,0,0,-cell,left+cell/2,top-cell/2].join('\n')+'\n';
 return{width,height,rgba,cell,cells:ii.length,bounds:{left,bottom:minJ*cell,right:(maxI+1)*cell,top},worldFile,method:'sombreado del relieve de retornos entre las alturas configuradas sobre el suelo local'};
}
return{render,MAX_PIXELS,MAX_CELLS};
});

;

/* terrain-relief.js */
/* Optional georeferenced terrain images from the prepared ground grid. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoTerrainRelief=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const MAX_PIXELS=12000000,MAX_CELLS=1000000;
function render(points,cell,mode='multidirectional',options={}){
 cell=Number(cell);if(!Number.isFinite(cell)||cell<.1)throw Error('La celda del relieve debe ser de 0,1 m o mayor');
 if(!Array.isArray(points)||!points.length||points.length>MAX_CELLS)throw Error('Prepara primero una rejilla de terreno LiDAR válida');
 if(!['multidirectional','slope','local-relief','roughness'].includes(mode))throw Error('Modo de imagen de relieve no válido');
 const radius=mode==='roughness'?Number(options.radius??1):0;if(mode==='roughness'&&(!Number.isInteger(radius)||radius<1||radius>3))throw Error('El radio de rugosidad debe ser de 1 a 3 celdas');
 let minI=Infinity,maxI=-Infinity,minJ=Infinity,maxJ=-Infinity;const values=new Map();
 for(const p of points){if(!Array.isArray(p)||p.length<3||!p.slice(0,3).every(Number.isFinite))throw Error('Cota MDT inválida');const i=Math.floor(p[0]/cell),j=Math.floor(p[1]/cell),key=i+','+j;if(values.has(key))throw Error('Hay más de una cota en una celda MDT');values.set(key,p[2]);minI=Math.min(minI,i);maxI=Math.max(maxI,i);minJ=Math.min(minJ,j);maxJ=Math.max(maxJ,j)}
 const width=maxI-minI+1,height=maxJ-minJ+1;if(width*height>MAX_PIXELS)throw Error('La imagen de relieve sería demasiado grande; vuelve a preparar el MDT con una celda mayor');if(mode==='roughness'&&width*height>MAX_CELLS)throw Error('La imagen de rugosidad supera 1 000 000 de celdas de salida; prepara el MDT con una celda mayor o recorta el área');
 const grid=new Float32Array(width*height);grid.fill(NaN);for(const [key,z] of values){const [i,j]=key.split(',').map(Number);grid[(maxJ-j)*width+i-minI]=z}
 const rgba=new Uint8ClampedArray(width*height*4),azimuths=Array.from({length:8},(_,i)=>i*Math.PI/4),altitude=Math.PI/4,roughness=mode==='roughness'?new Float32Array(width*height):null;if(roughness)roughness.fill(NaN);
 const at=(x,y)=>x<0||y<0||x>=width||y>=height?NaN:grid[y*width+x];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const index=y*width+x,z=grid[index],px=index*4;if(!Number.isFinite(z))continue;
  const west=at(x-1,y),east=at(x+1,y),north=at(x,y-1),south=at(x,y+1);
  const gradient=(a,b,center)=>Number.isFinite(a)&&Number.isFinite(b)?(b-a)/(2*cell):Number.isFinite(b)?(b-center)/cell:Number.isFinite(a)?(center-a)/cell:0;
  const dx=gradient(west,east,z),dy=gradient(south,north,z),slope=Math.atan(Math.hypot(dx,dy));let shade;
  if(mode==='slope')shade=Math.round(255*(1-slope/(Math.PI/2)));
  else if(mode==='local-relief'){
   let sum=0,n=0;for(let yy=Math.max(0,y-4);yy<=Math.min(height-1,y+4);yy++)for(let xx=Math.max(0,x-4);xx<=Math.min(width-1,x+4);xx++){const v=at(xx,yy);if(Number.isFinite(v)){sum+=v;n++}}
   const relief=z-(n?sum/n:z);shade=Math.round(Math.max(0,Math.min(255,128+relief*24)));
  }else if(mode==='roughness'){
   const sums=[0,0,0,0,0,0];let n=0,uv=0,uh=0,vh=0;for(let yy=Math.max(0,y-radius);yy<=Math.min(height-1,y+radius);yy++)for(let xx=Math.max(0,x-radius);xx<=Math.min(width-1,x+radius);xx++){const h=at(xx,yy);if(!Number.isFinite(h))continue;const u=(xx-x)*cell,v=(y-yy)*cell;n++;sums[0]++;sums[1]+=u;sums[2]+=v;sums[3]+=h;sums[4]+=u*u;sums[5]+=v*v;uv+=u*v;uh+=u*h;vh+=v*h}
   if(n<4){rgba[px+3]=0;continue}
   const matrix=[[sums[0],sums[1],sums[2]],[sums[1],sums[4],uv],[sums[2],uv,sums[5]]],rhs=[sums[3],uh,vh];
   let validFit=true;for(let col=0;col<3;col++){let pivot=col;for(let row=col+1;row<3;row++)if(Math.abs(matrix[row][col])>Math.abs(matrix[pivot][col]))pivot=row;if(Math.abs(matrix[pivot][col])<1e-12){validFit=false;break}if(pivot!==col){[matrix[pivot],matrix[col]]=[matrix[col],matrix[pivot]];[rhs[pivot],rhs[col]]=[rhs[col],rhs[pivot]]}const d=matrix[col][col];for(let j=col;j<3;j++)matrix[col][j]/=d;rhs[col]/=d;for(let row=0;row<3;row++)if(row!==col){const factor=matrix[row][col];for(let j=col;j<3;j++)matrix[row][j]-=factor*matrix[col][j];rhs[row]-=factor*rhs[col]}}
   if(!validFit||!Number.isFinite(rhs[0])){rgba[px+3]=0;continue}let error=0;for(let yy=Math.max(0,y-radius);yy<=Math.min(height-1,y+radius);yy++)for(let xx=Math.max(0,x-radius);xx<=Math.min(width-1,x+radius);xx++){const h=at(xx,yy);if(!Number.isFinite(h))continue;const u=(xx-x)*cell,v=(y-yy)*cell,e=h-(rhs[0]+rhs[1]*u+rhs[2]*v);error+=e*e}roughness[index]=Math.sqrt(error/n);
  }else{
   let illum=0;for(const az of azimuths){const aspect=Math.atan2(dy,-dx);illum+=Math.max(0,Math.cos(altitude)*Math.cos(slope)+Math.sin(altitude)*Math.sin(slope)*Math.cos(az-aspect))}
   shade=Math.round(40+215*illum/azimuths.length);
  }
  if(mode!=='roughness'){rgba[px]=rgba[px+1]=rgba[px+2]=shade;rgba[px+3]=255}
 }
 let roughnessRange=null;if(mode==='roughness'){const sample=[];let max=0;for(let i=0;i<roughness.length;i++)if(Number.isFinite(roughness[i])&&roughness[i]>0){max=Math.max(max,roughness[i]);if(i%Math.max(1,Math.floor(roughness.length/20000))===0)sample.push(roughness[i])}sample.sort((a,b)=>a-b);const percentile95=sample.length?sample[Math.min(sample.length-1,Math.floor((sample.length-1)*.95))]:0,upper=Math.max(percentile95,max*.01,.001);roughnessRange={p95_m:+percentile95.toFixed(4),displayMax_m:+upper.toFixed(4),max_m:+max.toFixed(4),radiusCells:radius};for(let i=0;i<roughness.length;i++){const px=i*4,v=roughness[i];if(!Number.isFinite(v))continue;const t=Math.max(0,Math.min(1,v/upper));rgba[px]=Math.round(248-180*t);rgba[px+1]=Math.round(244-198*t);rgba[px+2]=Math.round(232-207*t);rgba[px+3]=255}}
 const left=minI*cell,top=(maxJ+1)*cell,worldFile=[cell,0,0,-cell,left+cell/2,top-cell/2].join('\n')+'\n';
 const names={multidirectional:'sombreado multidireccional del MDT de suelo',slope:'pendiente del MDT de suelo en escala de grises', 'local-relief':'relieve local respecto a una ventana de 9 × 9 celdas',roughness:'rugosidad local como RMS de residuos tras descontar el plano del terreno'};
 return{width,height,rgba,cell,cells:values.size,bounds:{left,bottom:minJ*cell,right:(maxI+1)*cell,top},worldFile,method:names[mode],mode,roughnessRange};
}
return{render,MAX_PIXELS,MAX_CELLS};
});

;

/* vegetation-height-exports.js */
/* Ocarto v1.113: colored vector exports for vegetation-height classes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoVegetationHeightExports=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function classes(fc){if(!fc||fc.type!=='FeatureCollection'||!Array.isArray(fc.features))throw Error('Capa de alturas vectoriales inválida');const out=new Map();for(const f of fc.features){const p=f?.properties||{},key=String(p.category||''),color=String(p.color||'');if(!/^vegetation_height_[1-4]$/.test(key)||!/^#[0-9a-f]{6}$/i.test(color))continue;out.set(key,{name:String(p.description||key),color:color.toLowerCase()})}return out}
function toOmapCollection(fc){const styles=classes(fc),features=[];let skippedHoles=0;for(const f of fc.features){const p=f?.properties||{},rings=f?.geometry?.type==='Polygon'?f.geometry.coordinates:null;if(!rings||!styles.has(String(p.category)))continue;if(rings.length!==1){skippedHoles++;continue}features.push({...f,properties:{...p,symbol:String(p.category),symbol_name:String(p.description||p.category),color:styles.get(p.category).color}})}return{collection:{type:'FeatureCollection',metadata:{name:'Ocarto · vegetación por alturas'},features},skippedHoles}}
function toOcartoObjects(fc,{layerId='cartography',worldToLocal=null}={}){if(!fc||fc.type!=='FeatureCollection'||!Array.isArray(fc.features))throw Error('Capa de alturas vectoriales inválida');const styles=classes(fc),objects=[],skippedHoles=[];for(const f of fc.features){const p=f?.properties||{},rings=f?.geometry?.type==='Polygon'?f.geometry.coordinates:null;if(!rings||!styles.has(String(p.category)))continue;if(rings.length!==1){skippedHoles.push(p.category);continue}const ring=rings[0],source=ring.slice(0,-1);if(source.length<3||!source.every(q=>Array.isArray(q)&&Number.isFinite(q[0])&&Number.isFinite(q[1])))continue;const points=source.map(([x,y])=>{const q=worldToLocal?worldToLocal(x,y):{x:-x,y:-y};if(!q||!Number.isFinite(q.x)||!Number.isFinite(q.y))throw Error('No se pudo convertir la coordenada de una banda de altura al mapa');return{x:q.x,y:q.y,vertexType:'corner'}});objects.push({type:'area',x:0,y:0,points,symbol:'vegetation',layerId,transparent:false,heightBand:true,fillColor:styles.get(p.category).color,properties:{...p,kind:'vegetation-height-band',symbol_name:String(p.description||p.category),color:styles.get(p.category).color,review_required:true,auto_accept:false}})}return{objects,skippedHoles:skippedHoles.length,skippedByClass:skippedHoles}}
return{toOmapCollection,toOcartoObjects};
});

;

/* contour-smoothing.js */
/* Ocarto v20: conservative, optional contour smoothing. Original lines remain unchanged. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoContourSmoothing=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function smooth(features,opts={}) {
 if(!Array.isArray(features)||features.length>500000)throw Error('Curvas inválidas o demasiadas');
 const intensity=opts.intensity===undefined?25:Number(opts.intensity);
 const protectedAngle=opts.protectedAngle===undefined?55:Number(opts.protectedAngle);
 const maxShift=opts.maxShift===undefined?Infinity:Number(opts.maxShift);
 if(!Number.isFinite(intensity)||intensity<0||intensity>100)throw Error('Intensidad fuera de 0–100');
 if(!Number.isFinite(protectedAngle)||protectedAngle<0||protectedAngle>180)throw Error('Ángulo de protección inválido');
 if(!(maxShift===Infinity||(Number.isFinite(maxShift)&&maxShift>0)))throw Error('Desplazamiento máximo inválido');
 let moved=0,protectedVertices=0,skipped=0;
 const output=features.map(f=>{
  const original=f?.geometry?.coordinates, props=f?.properties||{};
  if(f?.geometry?.type!=='LineString'||!Array.isArray(original)||original.length<2||original.some(p=>!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1]))||!Number.isFinite(props.elevation))throw Error('Curva inválida');
  const points=original.map(p=>[p[0],p[1]]);const closed=points.length>=4&&Math.hypot(points[0][0]-points[points.length-1][0],points[0][1]-points[points.length-1][1])<1e-8;
  const n=closed?points.length-1:points.length;
  if(n<3||intensity===0){skipped++;return {type:'Feature',properties:{...props,smoothed:false,smoothingIntensity:0},geometry:{type:'LineString',coordinates:points}}}
  const result=points.map(p=>p.slice()),fraction=Math.min(.45,intensity*.0045);
  for(let i=0;i<n;i++){
   if(!closed&&(i===0||i===n-1))continue;
   const p=points[i],prev=points[(i+n-1)%n],next=points[(i+1)%n];
   const ax=prev[0]-p[0],ay=prev[1]-p[1],bx=next[0]-p[0],by=next[1]-p[1];
   const al=Math.hypot(ax,ay),bl=Math.hypot(bx,by);
   if(al<1e-9||bl<1e-9){protectedVertices++;continue}
   const angle=Math.acos(Math.max(-1,Math.min(1,(ax*bx+ay*by)/(al*bl))))*180/Math.PI;
   const turn=180-angle; // Small interior detail: sharp change of direction.
   if(turn>=protectedAngle){protectedVertices++;continue}
   const tx=(prev[0]+next[0])/2-p[0],ty=(prev[1]+next[1])/2-p[1];
   const shift=Math.hypot(tx,ty)*fraction;
   const clamp=shift===0?0:Math.min(1,maxShift/shift);
   result[i]=[p[0]+fraction*clamp*tx,p[1]+fraction*clamp*ty];
   if(Math.hypot(result[i][0]-p[0],result[i][1]-p[1])>1e-9)moved++;
  }
  if(closed)result[result.length-1]=result[0].slice();
  return {type:'Feature',properties:{...props,smoothed:true,smoothingIntensity:intensity,smoothingProtectedAngle:protectedAngle,review_required:true},geometry:{type:'LineString',coordinates:result}};
 });
 return {features:output,moved,protectedVertices,skipped,method:'v20: Laplaciano limitado, extremos fijos, vértices angulosos protegidos; requiere revisión topológica y cartográfica'};
}
return {smooth};
});

;

/* contour-profiles.js */
/* Ocarto v21: separate editable/general and high-detail template contours. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoContourProfiles=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function detailInterval(general,requested){
 const g=Number(general),d=requested===undefined||requested===null||requested===''?g/5:Number(requested);
 if(!Number.isFinite(g)||g<=0||!Number.isFinite(d)||d<=0||d>g)throw Error('Equidistancias inválidas');
 return d;
}
function build(rows,cell,interval,options={}){
 if(!globalThis.OcartoContours||!globalThis.OcartoContourSmoothing)throw Error('Módulos de curvas no disponibles');
 const detail=detailInterval(interval,options.detailInterval);
 const cap=options.maxSegments??500000;
 const opts={maxSegments:cap};
 // Generate separate equidistances directly from identical MDT, not by filtering a coarser output.
 const rawGeneral=OcartoContours.generate(rows,cell,Number(interval),opts);
 const generalJoined=OcartoContours.connect(rawGeneral.features,{tolerance:Math.max(1e-9,cell*1e-7)});
 const rawDetail=OcartoContours.generate(rows,cell,detail,opts);
 const detailJoined=OcartoContours.connect(rawDetail.features,{tolerance:Math.max(1e-9,cell*1e-7)});
 const intensity=options.intensity===undefined?25:Number(options.intensity);
 const protectedAngle=options.protectedAngle===undefined?55:Number(options.protectedAngle);
 const general=OcartoContourSmoothing.smooth(generalJoined.features,{intensity,protectedAngle,maxShift:cell*.2});
 const originals=generalJoined.features.map(f=>({type:'Feature',properties:{...f.properties,layer:'original',editable:false},geometry:{type:'LineString',coordinates:f.geometry.coordinates.map(p=>p.slice())}}));
 const detailed=detailJoined.features.map(f=>({type:'Feature',properties:{...f.properties,layer:'detail-template',editable:false,template:true,review_required:true},geometry:{type:'LineString',coordinates:f.geometry.coordinates.map(p=>p.slice())}}));
 const work=general.features.map(f=>({type:'Feature',properties:{...f.properties,layer:'general-work',editable:true,review_required:true},geometry:{type:'LineString',coordinates:f.geometry.coordinates.map(p=>p.slice())}}));
 return {interval:Number(interval),detailInterval:detail, general:work,detail:detailed,original:originals,auxiliary:[],stats:{general:work.length,detail:detailed.length,original:originals.length,detailSegments:rawDetail.segments,generalSegments:rawGeneral.segments},warning:'Curvado preliminar: las curvas de 1 m pueden contener ruido LiDAR; verificar las formas sobre terreno antes de cartografiar'};
}
function geojson(profile,layer){
 if(!profile||!['general','detail','original','auxiliary'].includes(layer)||!Array.isArray(profile[layer]))throw Error('Capa de curvas inválida');
 return {type:'FeatureCollection',name:'Ocarto v21 '+layer,properties:{interval:layer==='detail'?profile.detailInterval:profile.interval,layer,warning:profile.warning,source:'MDT preliminar LiDAR; comprobar precisión y presencia real de elementos'},features:profile[layer]};
}
return {build,detailInterval,geojson};
});

;

/* valley-proposals.js */
/* Ocarto v22: diagnostic candidates for potentially under-resolved incised gullies.
   Never edits the source DTM: depth suggestion is an unverified hypothesis. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoValleys=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function detect(rows,cell,opts={}){
 if(!Number.isFinite(cell)||cell<=0||!Array.isArray(rows)||rows.length>1000000)throw Error('MDT o celda inválidos');
 const minIncision=opts.minIncision===undefined?.6:Number(opts.minIncision);
 const maxProposal=opts.maxProposal===undefined?1:Number(opts.maxProposal);
 const minGround=opts.minGround===undefined?1:Number(opts.minGround);
 if(!Number.isFinite(minIncision)||minIncision<=0||!Number.isFinite(maxProposal)||maxProposal<=0||maxProposal>2||!Number.isInteger(minGround)||minGround<1)throw Error('Parámetros de vaguada inválidos');
 const m=new Map();
 for(const r of rows){if(!Array.isArray(r)||r.length<4||!r.slice(0,4).every(Number.isFinite))throw Error('Celda MDT inválida');const i=Math.round(r[0]/cell-.5),j=Math.round(r[1]/cell-.5);if(Math.abs(r[0]-(i+.5)*cell)>cell*1e-5||Math.abs(r[1]-(j+.5)*cell)>cell*1e-5)throw Error('Celda fuera de rejilla');const k=i+','+j;if(m.has(k))throw Error('Celda duplicada');m.set(k,{i,j,x:r[0],y:r[1],z:r[2],n:r[3],source:r[4]||'observado'});}
 const get=(i,j)=>m.get(i+','+j);let skipped=0;const features=[];
 for(const p of m.values()){
  if(p.source!=='observado'||p.n<minGround){skipped++;continue}
  const n=get(p.i,p.j+1),s=get(p.i,p.j-1),e=get(p.i+1,p.j),w=get(p.i-1,p.j);
  // Opposite shoulders must both have observed ground; no extrapolation or synthetic cells.
  const axes=[{axis:'NS',a:e,b:w,along:[n,s]},{axis:'EW',a:n,b:s,along:[e,w]}];
  let best=null;
  for(const a of axes){if(!a.a||!a.b||a.a.source!=='observado'||a.b.source!=='observado'||a.a.n<minGround||a.b.n<minGround)continue;
   const left=a.a.z-p.z,right=a.b.z-p.z;
   if(left<minIncision||right<minIncision)continue;
   // The valley must have continuity along its axis. Reject isolated depressions/holes.
   if(a.along.filter(q=>q&&q.source==='observado'&&q.n>=minGround).length!==2)continue;
   // Verify the cross-section remains incised in BOTH adjacent cells along the valley.
   // A one-cell pit otherwise looks like a V in either cross-section.
   const alongDirs=a.axis==='NS'?[[0,1],[0,-1]]:[[1,0],[-1,0]];
   const sideDirs=a.axis==='NS'?[[1,0],[-1,0]]:[[0,1],[0,-1]];
   const continuous=alongDirs.every(([dx,dy])=>{
    const q=get(p.i+dx,p.j+dy),side1=get(q.i+sideDirs[0][0],q.j+sideDirs[0][1]),side2=get(q.i+sideDirs[1][0],q.j+sideDirs[1][1]);
    return side1&&side2&&side1.source==='observado'&&side2.source==='observado'&&side1.n>=minGround&&side2.n>=minGround&&side1.z-q.z>=minIncision&&side2.z-q.z>=minIncision;
   });
   if(!continuous)continue;
   const steepness=Math.min(left,right),longSlope=Math.abs(a.along[0].z-a.along[1].z)/(2*cell);
   const score=steepness/(1+longSlope);
   if(!best||score>best.score)best={axis:a.axis,incision:steepness,score,shoulders:[a.a.z,a.b.z],along:a.along.map(q=>q.z)};
  }
  if(!best){skipped++;continue}
  // Max 1m by default, only an upper envelope for inspection, NOT measured depth.
  const suggestion=Math.min(maxProposal,best.incision*.25);
  features.push({type:'Feature',properties:{kind:'possible-underresolved-valley',axis:best.axis,ground_z:p.z,shoulder_min_z:Math.min(...best.shoulders),incision_m:best.incision,possible_extra_depth_max_m:+suggestion.toFixed(3),source:'observed-ground-only',confidence:'unverified',review_required:true,apply_automatically:false,warning:'Posible vaguada; comprobar puntos originales y terreno. La profundidad adicional NO está medida.'},geometry:{type:'Point',coordinates:[p.x,p.y]}});
 }
 return {type:'FeatureCollection',name:'Ocarto v22: vaguadas candidatas para revisión',properties:{cellSize:cell,source:'MDT original sin modificar',uncertainty:'El fondo real puede diferir del MDT. Cota adicional orientativa, nunca modificación automática.',candidateCount:features.length,skipped},features};
}
return {detect};
});

;

/* depression-proposals.js */
/* Ocarto: candidate closed depressions from observed LiDAR ground cells. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoDepressions=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function detect(rows,cell,opts={}){
 const minRelief=Number(opts.minRelief??0.5),radius=Number(opts.radius??2),minGround=Number(opts.minGround??1);
 if(!Array.isArray(rows)||rows.length>1000000||!Number.isFinite(cell)||cell<=0)throw Error('MDT o tamaño de celda inválidos');
 if(!Number.isFinite(minRelief)||minRelief<=0||!Number.isInteger(radius)||radius<1||radius>8||!Number.isInteger(minGround)||minGround<1)throw Error('Parámetros de depresiones no válidos');
 const cells=new Map();
 for(const r of rows){if(!Array.isArray(r)||r.length<4||!r.slice(0,4).every(Number.isFinite)||r[3]<0)throw Error('Celda MDT no válida');const i=Math.round(r[0]/cell-.5),j=Math.round(r[1]/cell-.5);if(Math.abs(r[0]-(i+.5)*cell)>cell*1e-5||Math.abs(r[1]-(j+.5)*cell)>cell*1e-5)throw Error('Celda fuera de rejilla');const key=i+','+j;if(cells.has(key))throw Error('Celdas MDT duplicadas');cells.set(key,{i,j,x:r[0],y:r[1],z:r[2],n:r[3],source:r[4]||'observado'});}
 const features=[];let skipped=0;
 for(const p of cells.values()){
  if(p.source!=='observado'||p.n<minGround){skipped++;continue;}
  let lower=false,ringMin=Infinity,ringMax=-Infinity,valid=0;
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
   if(!dx&&!dy)continue;const q=cells.get((p.i+dx)+','+(p.j+dy));if(!q||q.source!=='observado'||q.n<minGround)continue;
   valid++;ringMin=Math.min(ringMin,q.z);ringMax=Math.max(ringMax,q.z);if(q.z<=p.z+1e-9)lower=true;
  }
  // Require a complete observed ring: interpolation edges and missing cells are not evidence.
  const expected=(radius*2+1)**2-1;if(valid!==expected||lower||ringMin-p.z<minRelief)continue;
  features.push({type:'Feature',geometry:{type:'Point',coordinates:[p.x,p.y]},properties:{kind:'depresion-candidata-lidar',ground_elevation_m:+p.z.toFixed(3),rim_min_elevation_m:+ringMin.toFixed(3),rim_max_elevation_m:+ringMax.toFixed(3),local_relief_m:+(ringMin-p.z).toFixed(3),radius_cells:radius,cell_size_m:cell,source:'MDT de celdas observadas',confidence:'candidata',review_required:true,auto_accept:false,warning:'Mínimo cerrado local del MDT; puede ser ruido, hueco, extracción deficiente del suelo o depresión real. Confirmar con puntos LiDAR y terreno.'}});
 }
 return{type:'FeatureCollection',name:'Ocarto · depresiones candidatas LiDAR · revisar',properties:{cellSize:cell,minReliefM:minRelief,radiusCells:radius,source:'MDT original; solo celdas observadas',candidateCount:features.length,skipped,nonAutomatic:true,warning:'Los candidatos son indicios geométricos y no se convierten automáticamente en símbolos cartográficos.'},features};
}
return{detect};
});

;

/* valley-tracing.js */
/* Ocarto v23: plan-view channel/thalweg candidates from the observed ground grid.
   This does not alter terrain elevation or claim to measure missing incision depth. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoValleyTrace=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const DIR=[[1,0],[1,1],[0,1],[-1,1]], EIGHT=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
function detect(rows,cell,options={}){
 if(!Number.isFinite(cell)||cell<=0||!Array.isArray(rows)||rows.length>1000000)throw Error('Rejilla de terreno inválida');
 const minLength=options.minLength===undefined?20:Number(options.minLength),minIncision=options.minIncision===undefined?.6:Number(options.minIncision);
 const radius=options.radius===undefined?2:Number(options.radius),minGround=options.minGround===undefined?1:Number(options.minGround);
 if(!Number.isFinite(minLength)||minLength<5||minLength>10000||!Number.isFinite(minIncision)||minIncision<=0||!Number.isInteger(radius)||radius<1||radius>4||!Number.isInteger(minGround)||minGround<1)throw Error('Parámetros de vaguada inválidos');
 const cells=new Map();
 for(const r of rows){if(!Array.isArray(r)||r.length<4||!r.slice(0,4).every(Number.isFinite))throw Error('Celda MDT inválida');const i=Math.round(r[0]/cell-.5),j=Math.round(r[1]/cell-.5);if(Math.abs(r[0]-(i+.5)*cell)>cell*1e-5||Math.abs(r[1]-(j+.5)*cell)>cell*1e-5)throw Error('Rejilla incompatible con tamaño de celda');const key=i+','+j;if(cells.has(key))throw Error('Celdas repetidas');cells.set(key,{key,i,j,x:r[0],y:r[1],z:r[2],n:r[3],source:r[4]||'observado'});}
 const get=(i,j)=>cells.get(i+','+j), good=p=>p&&p.source==='observado'&&p.n>=minGround;
 const candidates=new Map();
 for(const p of cells.values()){
  if(!good(p))continue;
  let best=null;
  for(let d=0;d<4;d++){
   const [dx,dy]=DIR[d],normal=[-dy,dx];let bestSide=null;
   for(let rad=1;rad<=radius;rad++){
    const a=get(p.i+normal[0]*rad,p.j+normal[1]*rad),b=get(p.i-normal[0]*rad,p.j-normal[1]*rad);
    if(!good(a)||!good(b))continue;
    const v=Math.min(a.z-p.z,b.z-p.z);
    if(v>=minIncision&&(!bestSide||v>bestSide.incision))bestSide={incision:v,radius:rad};
   }
   if(!bestSide)continue;
   // At least one observed neighbour on each side of the axis: avoid isolated pits.
   const ahead=get(p.i+dx,p.j+dy),back=get(p.i-dx,p.j-dy);
   if(!good(ahead)||!good(back))continue;
   // A small tolerance in the axial neighbours allows a channel that descends with the slope.
   const directionalGradient=Math.abs(ahead.z-back.z)/(2*cell*Math.hypot(dx,dy));
   const score=bestSide.incision/(1+.2*directionalGradient);
   if(!best||score>best.score)best={d,score,incision:bestSide.incision,radius:bestSide.radius};
  }
  if(best)candidates.set(p.key,{...p,...best});
 }
 // Trace candidate ridge-orthogonal lines in all 8 directions, allowing turns.
 // Every candidate has at most two links, with a mutual axial-alignment requirement.
 const graph=new Map([...candidates].map(([k])=>[k,new Set()]));
 const proposals=[];
 for(const p of candidates.values()){
  const forward=DIR[p.d];
  const opts=[];
  for(const [dx,dy] of EIGHT){const q=candidates.get((p.i+dx)+','+(p.j+dy));if(!q)continue;
   const unit=Math.hypot(dx,dy);const along=Math.abs((dx*forward[0]+dy*forward[1])/(unit*Math.hypot(...forward)));
   const qaxis=DIR[q.d],match=Math.abs((dx*qaxis[0]+dy*qaxis[1])/(unit*Math.hypot(...qaxis)));
   if(along<.70||match<.70)continue;
   // Penalize sharp turns and prefer points with a consistent incision signature.
   opts.push({q,dx,dy,rank:along+match-Math.abs(p.incision-q.incision)*.03});
  }
  for(const sign of [-1,1]){const side=opts.filter(v=>Math.sign(v.dx*forward[0]+v.dy*forward[1])===sign).sort((a,b)=>b.rank-a.rank)[0];if(side)proposals.push({a:p.key,b:side.q.key,rank:side.rank});}
 }
 // Build an undirected graph without degrees > 2; this keeps crossing/junction cases separate.
 proposals.sort((a,b)=>b.rank-a.rank);const used=new Set();
 for(const e of proposals){const pair=[e.a,e.b].sort().join('|');if(used.has(pair))continue;used.add(pair);
  if(graph.get(e.a).size>=2||graph.get(e.b).size>=2)continue;
  graph.get(e.a).add(e.b);graph.get(e.b).add(e.a);
 }
 const visited=new Set(),paths=[];
 function walk(start){const path=[],seen=new Set();let p=start,prev=null,closed=false;
  while(p&&!seen.has(p)){seen.add(p);visited.add(p);path.push(candidates.get(p));const next=[...graph.get(p)].find(n=>n!==prev&&!seen.has(n));
   if(!next){closed=graph.get(p).has(start)&&path.length>2;break;}prev=p;p=next;
  }
  if(path.length<2)return;
  let length=0;for(let n=1;n<path.length;n++)length+=Math.hypot(path[n].x-path[n-1].x,path[n].y-path[n-1].y);
  if(closed)length+=Math.hypot(path[0].x-path.at(-1).x,path[0].y-path.at(-1).y);
  if(length<minLength)return;
  const inc=path.map(x=>x.incision).sort((a,b)=>a-b),mean=inc.reduce((a,b)=>a+b,0)/inc.length;
  const coords=path.map(p=>[p.x,p.y]);if(closed)coords.push(coords[0]);
  paths.push({type:'Feature',properties:{kind:'vaguada-pronunciada-candidata',length_m:+length.toFixed(2),cells:path.length,closed,incision_median_m:+inc[Math.floor(inc.length/2)].toFixed(2),incision_mean_m:+mean.toFixed(2),min_length_m:minLength,min_incision_m:minIncision,confidence:'pendiente-de-validacion',review_required:true,apply_automatically:false,extra_depth_m:null,warning:'Eje candidato: no representa profundidad adicional medida. Comprobar relieve, cauce y puntos LiDAR antes de exagerar curvas.'},geometry:{type:'LineString',coordinates:coords}});
 }
 for(const [k,links] of graph)if(links.size===1&&!visited.has(k))walk(k);
 for(const k of graph.keys())if(!visited.has(k))walk(k);
 paths.sort((a,b)=>b.properties.length_m-a.properties.length_m);
 return {type:'FeatureCollection',name:'Ocarto v23 - ejes de vaguadas para revision',properties:{cellSize:cell,candidateCells:candidates.size,minLength,minIncision,axes:'8 direcciones y giros',source:'solo terreno observado, sin alterar MDT',review_required:true},features:paths};
}
return {detect};
});

;

/* valley-extend.js */
/* Ocarto v61: extend a mapped valley axis to the next selected 1 m contour.
   Geometry-only operation: it never edits the terrain grid or the contour template. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoValleyExtend=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function extend(line,contours,options={}){
 const target=Number(options.targetElevation),startElevation=options.startElevation===undefined?null:Number(options.startElevation),maxDistance=options.maxDistance===undefined?100:Number(options.maxDistance),end=options.end||'end';
 if(!Array.isArray(line)||line.length<2||line.some(p=>!Array.isArray(p)||p.length<2||!p.slice(0,2).every(Number.isFinite)))throw Error('Eje de vaguada no válido');
 if(!Array.isArray(contours)||!Number.isFinite(target)||!Number.isFinite(maxDistance)||maxDistance<=0||!['start','end'].includes(end)||(startElevation!==null&&(!Number.isFinite(startElevation)||target<=startElevation)))throw Error('Curva objetivo superior o distancia no válidas');
 const origin=end==='end'?line.at(-1):line[0],near=end==='end'?line.at(-2):line[1];
 let dx=origin[0]-near[0],dy=origin[1]-near[1],len=Math.hypot(dx,dy);if(!len)throw Error('El extremo de la vaguada no tiene dirección');dx/=len;dy/=len;
 let best=null;
 for(const f of contours){if(f?.geometry?.type!=='LineString'||!Number.isFinite(f.properties?.elevation)||Math.abs(f.properties.elevation-target)>1e-8)continue;const pts=f.geometry.coordinates;if(!Array.isArray(pts)||pts.length<2)continue;
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];if(!Array.isArray(a)||!Array.isArray(b)||!a.slice(0,2).every(Number.isFinite)||!b.slice(0,2).every(Number.isFinite))continue;
   const sx=b[0]-a[0],sy=b[1]-a[1],den=dx*sy-dy*sx;if(Math.abs(den)<1e-12)continue;
   const ax=a[0]-origin[0],ay=a[1]-origin[1],t=(ax*sy-ay*sx)/den,u=(ax*dy-ay*dx)/den;
   if(t<=1e-8||t>maxDistance||u< -1e-8||u>1+1e-8)continue;
   if(!best||t<best.distance)best={distance:t,point:[origin[0]+dx*t,origin[1]+dy*t]};
  }
 }
 if(!best)throw Error('La vaguada no cruza la curva superior dentro de la distancia indicada');
 const coordinates=line.map(p=>p.slice());if(end==='end')coordinates.push(best.point);else coordinates.unshift(best.point);
 return {coordinates,extension_m:best.distance,target_elevation:target,start_elevation:startElevation,end,source:'eje prolongado hasta curva 1 m',review_required:true};
}
const DIRS=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
function followTerrain(line,rows,cell,options={}){
 if(!Number.isFinite(cell)||cell<=0||!Array.isArray(rows)||rows.length>1000000)throw Error('MDT LiDAR o celda no válidos');
 const target=Number(options.targetElevation),startElevation=Number(options.startElevation),end=options.end||'end',maxDistance=options.maxDistance===undefined?250:Number(options.maxDistance),maxUphillGrade=options.maxUphillGrade===undefined?1.2:Number(options.maxUphillGrade);
 if(!Number.isFinite(target)||!Number.isFinite(startElevation)||target<=startElevation||!['start','end'].includes(end)||!Number.isFinite(maxDistance)||maxDistance<=0||!Number.isFinite(maxUphillGrade)||maxUphillGrade<=0)throw Error('Curva superior o distancia no válidas');
 if(!Array.isArray(line)||line.length<2||line.some(p=>!Array.isArray(p)||p.length<2||!p.slice(0,2).every(Number.isFinite)))throw Error('Eje de vaguada no válido');
 const origin=end==='end'?line.at(-1):line[0],near=end==='end'?line.at(-2):line[1];let hx=origin[0]-near[0],hy=origin[1]-near[1],hl=Math.hypot(hx,hy);if(!hl)throw Error('El extremo de la vaguada no tiene dirección');hx/=hl;hy/=hl;
 const cells=new Map();for(const r of rows){if(!Array.isArray(r)||r.length<4||!r.slice(0,4).every(Number.isFinite))throw Error('Celda MDT inválida');if(r[4]&&r[4]!=='observado')continue;const i=Math.round(r[0]/cell-.5),j=Math.round(r[1]/cell-.5);if(Math.abs(r[0]-(i+.5)*cell)>cell*1e-5||Math.abs(r[1]-(j+.5)*cell)>cell*1e-5)throw Error('MDT fuera de rejilla');const id=i+','+j;if(cells.has(id))throw Error('Celda MDT repetida');cells.set(id,{i,j,x:r[0],y:r[1],z:r[2],n:r[3]});}
 const nearest=[...cells.values()].reduce((best,p)=>{const d=Math.hypot(p.x-origin[0],p.y-origin[1]);return !best||d<best.d?{p,d}:best},null);if(!nearest||nearest.d>cell*1.5)throw Error('El extremo debe estar cerca de terreno LiDAR observado');
 const start=nearest.p;if(start.z>=target)throw Error('El extremo ya está en la curva objetivo o por encima');
 const keys=[...cells.keys()],idx=new Map(keys.map((k,i)=>[k,i])),list=keys.map(k=>cells.get(k)),N=list.length,states=N*9,dist=new Float64Array(states);dist.fill(Infinity);const parent=new Int32Array(states);parent.fill(-2);const pathLen=new Float64Array(states);pathLen.fill(Infinity);
 class Heap{constructor(){this.a=[]}push(v){let i=this.a.length;this.a.push(v);while(i){const p=(i-1)>>1;if(this.a[p].cost<=v.cost)break;this.a[i]=this.a[p];i=p}this.a[i]=v}pop(){if(!this.a.length)return null;const top=this.a[0],last=this.a.pop();if(this.a.length){let i=0;while(true){let c=i*2+1;if(c>=this.a.length)break;if(c+1<this.a.length&&this.a[c+1].cost<this.a[c].cost)c++;if(this.a[c].cost>=last.cost)break;this.a[i]=this.a[c];i=c}this.a[i]=last}return top}}
 const heap=new Heap(),si=idx.get(start.i+','+start.j),sstate=si*9+8;dist[sstate]=0;pathLen[sstate]=nearest.d;parent[sstate]=-1;heap.push({state:sstate,cost:0});let goal=null;
 const get=(i,j)=>{const k=idx.get(i+','+j);return k===undefined?null:list[k]};
 while(heap.a.length){const cur=heap.pop(),s=cur.state;if(cur.cost!==dist[s])continue;const ci=Math.floor(s/9),prevDir=s%9,p=list[ci],plen=pathLen[s];for(let d=0;d<8;d++){const[dx,dy]=DIRS[d],q=get(p.i+dx,p.j+dy);if(!q)continue;const step=cell*Math.hypot(dx,dy),nextLen=plen+step;if(nextLen>maxDistance||q.z-p.z>maxUphillGrade*step)continue;
   if(p.z<target&&q.z>=target){const t=(target-p.z)/(q.z-p.z),point=[p.x+t*(q.x-p.x),p.y+t*(q.y-p.y)];goal={state:s,point,distance:nextLen-step+step*t};break}
   const n1=get(q.i-dy,q.j+dx),n2=get(q.i+dy,q.j-dx),inc=n1&&n2?Math.max(0,Math.min(n1.z-q.z,n2.z-q.z)):0;
   const dot=prevDir===8?(dx/Math.hypot(dx,dy)*hx+dy/Math.hypot(dx,dy)*hy):((dx*DIRS[prevDir][0]+dy*DIRS[prevDir][1])/(Math.hypot(dx,dy)*Math.hypot(...DIRS[prevDir])));
   const turn=prevDir===8?.8*(1-dot):.42*(1-dot),channel=1/(1+3*inc),slope=.08*Math.abs(q.z-p.z)/cell,cost=cur.cost+step*(channel+slope)+turn;
   const ni=idx.get(q.i+','+q.j),ns=ni*9+d;if(cost<dist[ns]){dist[ns]=cost;parent[ns]=s;pathLen[ns]=nextLen;heap.push({state:ns,cost})}
  }if(goal)break;
 }
 if(!goal)throw Error('No se pudo seguir la vaguada hasta la curva superior dentro del límite');
 const reversed=[];for(let s=goal.state;s>=0;s=parent[s]){const p=list[Math.floor(s/9)];reversed.push([p.x,p.y]);if(parent[s]===-1)break}const route=reversed.reverse();route.push(goal.point);
 const same=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<cell*1e-6;let coords;if(end==='end'){const extra=same(line.at(-1),route[0])?route.slice(1):route;coords=[...line,...extra]}else{const extra=route.reverse();if(same(extra.at(-1),line[0]))extra.pop();coords=[...extra,...line]}return{coordinates:coords,extension_m:+goal.distance.toFixed(3),target_elevation:target,start_elevation:startElevation,end,source:'eje seguido por LiDAR hasta curva 1 m',review_required:true};
}
return {extend,followTerrain};
});

;

/* line-tools.js */
/* Ocarto: edición geométrica avanzada de líneas, conservando la línea original. */
(function(root){
  function valid(line){return Array.isArray(line)&&line.length>=2&&line.every(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]))}
  function parallel(line,distance,side=1){
    if(!valid(line)) throw Error('Línea no válida');
    const d=Number(distance); if(!Number.isFinite(d)) throw Error('Distancia no válida');
    const out=[];
    for(let i=0;i<line.length;i++){
      const a=line[Math.max(0,i-1)], b=line[Math.min(line.length-1,i+1)];
      let dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy); if(!l) {out.push(line[i].slice());continue}
      const nx=-dy/l*side,ny=dx/l*side; out.push([line[i][0]+nx*d,line[i][1]+ny*d]);
    }
    return out;
  }
  function reverse(line){if(!valid(line))throw Error('Línea no válida');return line.slice().reverse().map(p=>p.slice())}
  function join(a,b,tolerance=1){if(!valid(a)||!valid(b))throw Error('Línea no válida');const ends=[[a.at(-1),b[0],true,false],[a[0],b.at(-1),false,true],[a[0],b[0],false,false],[a.at(-1),b.at(-1),true,true]];let best=null;for(const q of ends){const d=Math.hypot(q[0][0]-q[1][0],q[0][1]-q[1][1]);if(!best||d<best.d)best={q,d}}if(best.d>tolerance)throw Error('Los extremos están demasiado separados');const aa=best.q[2]?a.slice():a.slice().reverse(),bb=best.q[3]?b.slice().reverse():b.slice();return aa.concat(bb.slice(1))}
  function extendToNearest(line,targets,maxDistance=10){if(!valid(line)||!Array.isArray(targets)||!Number.isFinite(maxDistance)||maxDistance<0)throw Error('Geometría o distancia no válida');let best=null;for(const t of targets){if(!valid(t)||t===line)continue;for(const end of [0,line.length-1]){const p=line[end],adjacent=line[end===0?1:end-1],d0=[p[0]-adjacent[0],p[1]-adjacent[1]],len=Math.hypot(...d0);if(!len)continue;const ray=[d0[0]/len,d0[1]/len];for(let i=0;i<t.length-1;i++){const a=t[i],b=t[i+1],s=[b[0]-a[0],b[1]-a[1]],den=ray[0]*s[1]-ray[1]*s[0],ap=[a[0]-p[0],a[1]-p[1]];let q,d;if(Math.abs(den)>1e-12){const distance=(ap[0]*s[1]-ap[1]*s[0])/den,u=(ap[0]*ray[1]-ap[1]*ray[0])/den;if(distance< -1e-9||u< -1e-9||u>1+1e-9)continue;q=[p[0]+Math.max(0,distance)*ray[0],p[1]+Math.max(0,distance)*ray[1]];d=Math.max(0,distance)}else{const l2=ray[0]**2+ray[1]**2,ta=ap[0]*ray[0]+ap[1]*ray[1],tb=(b[0]-p[0])*ray[0]+(b[1]-p[1])*ray[1],lo=Math.min(ta,tb),hi=Math.max(ta,tb);if(Math.abs(ap[0]*ray[1]-ap[1]*ray[0])>1e-9||hi<0)continue;d=Math.max(0,lo);q=[p[0]+d*ray[0],p[1]+d*ray[1]]}if(d<=maxDistance&&(!best||d<best.d))best={d,end,point:q,targetIndex:targets.indexOf(t),segmentIndex:i}}}}if(!best)throw Error('Ningún tramo cruza la prolongación dentro de la distancia máxima');const out=line.map(p=>p.slice());out[best.end]=best.point.slice();return{line:out,distance:best.d,target:best.point.slice(),endIndex:best.end,targetIndex:best.targetIndex,segmentIndex:best.segmentIndex}}
  root.OcartoLineTools={parallel,reverse,join,extendToNearest};
  if(typeof module!=='undefined')module.exports=root.OcartoLineTools;
})(typeof window!=='undefined'?window:globalThis);

;

/* area-tools.js */
/* Cierre controlado de pequeños huecos entre áreas; no fusiona símbolos distintos. */
(function(root){
  function ring(a){return Array.isArray(a)&&a.length>=3&&a.every(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]))}
  function bridge(a,b,maxDistance=10){if(!ring(a)||!ring(b))throw Error('Áreas no válidas');let best=null;for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){const d=Math.hypot(a[i][0]-b[j][0],a[i][1]-b[j][1]);if(!best||d<best.d)best={i,j,d}}if(!best||best.d>maxDistance)throw Error('El hueco supera la distancia máxima');return{gap:best.d,connector:[a[best.i].slice(),b[best.j].slice()],indices:[best.i,best.j],review_required:true}}
  function cross(a,b,c){return(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])}
  function intersects(a,b,c,d){const eps=1e-10,ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b);return((ab1>eps&&ab2< -eps)||(ab1< -eps&&ab2>eps))&&((cd1>eps&&cd2< -eps)||(cd1< -eps&&cd2>eps))}
  function simpleQuad(q){if(q.length!==4)return false;for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){if(j===i||j===(i+1)%4||i===(j+1)%4)continue;if(intersects(q[i],q[(i+1)%4],q[j],q[(j+1)%4]))return false}let area=0;for(let i=0;i<4;i++)area+=q[i][0]*q[(i+1)%4][1]-q[(i+1)%4][0]*q[i][1];return Math.abs(area)>1e-10}
  function bridgeArea(a,b,maxDistance=10){
    if(!ring(a)||!ring(b))throw Error('Áreas no válidas');
    let best=null;for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){const d=Math.hypot(a[i][0]-b[j][0],a[i][1]-b[j][1]);if(!best||d<best.d)best={i,j,d}}
    const limit=Number(maxDistance);if(!Number.isFinite(limit)||limit<0)throw Error('Distancia máxima no válida');
    if(!best||best.d>limit)throw Error('El hueco supera la distancia máxima');
    if(best.d<=1e-10)throw Error('Las áreas ya se tocan; no hay hueco que cerrar');
    let choice=null;
    for(const ai of [(best.i+a.length-1)%a.length,(best.i+1)%a.length])for(const bj of [(best.j+b.length-1)%b.length,(best.j+1)%b.length]){
      const polygon=[a[best.i].slice(),a[ai].slice(),b[bj].slice(),b[best.j].slice()];
      if(!simpleQuad(polygon))continue;
      const score=Math.hypot(a[ai][0]-b[bj][0],a[ai][1]-b[bj][1]);
      if(!choice||score<choice.score)choice={polygon,score,ai,bj};
    }
    if(!choice)throw Error('No se puede crear un puente de área simple entre estos bordes');
    return{gap:best.d,connector:[a[best.i].slice(),b[best.j].slice()],polygon:choice.polygon,indices:[best.i,best.j],review_required:true};
  }
  function signedArea(points){let area=0;for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];area+=p[0]*q[1]-q[0]*p[1]}return area/2}
  function pointOnSegment(p,a,b,eps){const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<eps)return Math.hypot(p[0]-a[0],p[1]-a[1])<=eps;const crossValue=Math.abs(dx*(p[1]-a[1])-dy*(p[0]-a[0]))/length;if(crossValue>eps)return false;const dot=(p[0]-a[0])*dx+(p[1]-a[1])*dy;return dot>=-eps&&dot<=dx*dx+dy*dy+eps}
  function validateRing(points,eps){if(!ring(points)||points.length<3)throw Error('Áreas no válidas');for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){if(j===i||j===(i+1)%points.length||i===(j+1)%points.length)continue;if(intersects(points[i],points[(i+1)%points.length],points[j],points[(j+1)%points.length]))throw Error('Hay áreas con contornos cruzados')}if(Math.abs(signedArea(points))<=eps*eps)throw Error('Área degenerada')}
  function unionAdjacent(a,b,tolerance=1){
    const tol=Number(tolerance);if(!Number.isFinite(tol)||tol<0)throw Error('Tolerancia no válida');const eps=Math.max(1e-9,Math.min(tol,1e-5));
    validateRing(a,eps);validateRing(b,eps);
    const rings=[a.map(p=>p.slice()),b.map(p=>p.slice())].map(r=>signedArea(r)<0?r.reverse():r);
    const allVertices=rings.flat(),edges=[];
    for(let ringIndex=0;ringIndex<rings.length;ringIndex++){
      const points=rings[ringIndex];
      for(let i=0;i<points.length;i++){
        const start=points[i],end=points[(i+1)%points.length],dx=end[0]-start[0],dy=end[1]-start[1],length2=dx*dx+dy*dy;
        if(length2<=eps*eps)throw Error('Hay vértices duplicados en el contorno');
        const splits=[{t:0,p:start},{t:1,p:end}];
        for(const p of allVertices){if(p===start||p===end||!pointOnSegment(p,start,end,eps))continue;const t=((p[0]-start[0])*dx+(p[1]-start[1])*dy)/length2;if(t>eps&&t<1-eps)splits.push({t,p})}
        splits.sort((x,y)=>x.t-y.t);
        for(let j=1;j<splits.length;j++){const p=splits[j-1].p,q=splits[j].p;if(Math.hypot(q[0]-p[0],q[1]-p[1])>eps)edges.push({a:p.slice(),b:q.slice(),ringIndex})}
      }
    }
    const removed=new Set();let shared=0;
    for(let i=0;i<edges.length;i++){if(removed.has(i))continue;for(let j=i+1;j<edges.length;j++){if(removed.has(j)||edges[i].ringIndex===edges[j].ringIndex)continue;const x=edges[i],y=edges[j],reverse=Math.hypot(x.a[0]-y.b[0],x.a[1]-y.b[1])<=eps&&Math.hypot(x.b[0]-y.a[0],x.b[1]-y.a[1])<=eps,same=Math.hypot(x.a[0]-y.a[0],x.a[1]-y.a[1])<=eps&&Math.hypot(x.b[0]-y.b[0],x.b[1]-y.b[1])<=eps;if(reverse){removed.add(i);removed.add(j);shared++;break}if(same)throw Error('Las áreas se solapan y no se pueden unir con seguridad')}}
    if(!shared)throw Error('Las áreas deben compartir al menos un borde');
    const boundary=edges.filter((_,i)=>!removed.has(i));if(boundary.length<3)throw Error('La unión no forma un contorno válido');
    const key=p=>`${Math.round(p[0]/eps)},${Math.round(p[1]/eps)}`,outgoing=new Map();
    boundary.forEach((edge,i)=>{const k=key(edge.a);if(!outgoing.has(k))outgoing.set(k,[]);outgoing.get(k).push(i)});
    if([...outgoing.values()].some(list=>list.length!==1))throw Error('Las áreas solo se tocan en un punto o forman una unión ambigua');
    const unused=new Set(boundary.map((_,i)=>i)),loops=[];
    while(unused.size){const first=unused.values().next().value,loop=[],start=key(boundary[first].a);let current=first,guard=0,closed=false;while(current!==undefined&&unused.has(current)&&guard++<=boundary.length+1){const edge=boundary[current];unused.delete(current);loop.push(edge.a.slice());const nextKey=key(edge.b);if(nextKey===start){closed=true;break}const candidates=outgoing.get(nextKey)||[];current=candidates.find(index=>unused.has(index))}if(!closed)throw Error('No se pudo cerrar el contorno unido');loops.push(loop)}
    if(loops.length!==1)throw Error('La unión produciría varios contornos');
    const result=loops[0];validateRing(result,eps);return result;
  }
  function validateHole(outer,holes,candidate){
    if(!root.OcartoTopologyTools?.validatePolygon)throw Error('Validador topológico no disponible');
    if(!Array.isArray(holes)||!Array.isArray(candidate))throw Error('Anillo interior no válido');
    const result=root.OcartoTopologyTools.validatePolygon(outer,[...holes,candidate]);
    if(!result.valid)throw Error(result.issues.join('; '));
    return candidate.map(p=>p.slice());
  }
  root.OcartoAreaTools={bridge,bridgeArea,unionAdjacent,validateHole};if(typeof module!=='undefined')module.exports=root.OcartoAreaTools;
})(typeof window!=='undefined'?window:globalThis);

;

/* reshape-tools.js */
/* Sustituye solo un tramo de una línea o anillo por una nueva firma dibujada. */
(function(root){
  function ok(p){return Array.isArray(p)&&p.length>=2&&p.every(q=>Array.isArray(q)&&Number.isFinite(q[0])&&Number.isFinite(q[1]))}
  function nearestIndex(path,p){let best=0,d=Infinity;for(let i=0;i<path.length;i++){const q=Math.hypot(path[i][0]-p[0],path[i][1]-p[1]);if(q<d){d=q;best=i}}return{index:best,distance:d}}
  function replace(path,start,end,signature,closed=false){if(!ok(path)||!ok(signature)||signature.length<2)throw Error('Geometría no válida');const a=nearestIndex(path,start).index,b=nearestIndex(path,end).index;if(a===b)throw Error('Los puntos inicial y final deben ser distintos');if(!closed&&a>b){const rev=signature.slice().reverse();return path.slice(0,b+1).concat(rev.slice(1,-1),path.slice(a))}if(!closed)return path.slice(0,a+1).concat(signature.slice(1,-1),path.slice(b));const n=path.length,forward=(b-a+n)%n,back=(a-b+n)%n,walk=(from,to)=>{const out=[];for(let i=(from+1)%n;i!==to;i=(i+1)%n)out.push(path[i]);return out};if(forward<=back)return[path[a],...signature.slice(1,-1),path[b],...walk(b,a)];const rev=signature.slice().reverse();return[path[b],...rev.slice(1,-1),path[a],...walk(a,b)];}
  root.OcartoReshapeTools={replace,nearestIndex};if(typeof module!=='undefined')module.exports=root.OcartoReshapeTools;
})(typeof window!=='undefined'?window:globalThis);

;

/* measure-tools.js */
/* Medición cartográfica sobre geometrías rectas y curvas Bézier. */
(function(root){
  function validPoints(points,min){return Array.isArray(points)&&points.length>=min&&points.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y))}
  function sample(points,closed,steps,forceCurve=false){
    if(!validPoints(points,closed?3:2)||!Number.isInteger(steps)||steps<1)throw Error('Geometría no válida para medir');
    const curved=forceCurve||points.some(p=>p.tangent||p.inTangent||p.outTangent),out=[{x:points[0].x,y:points[0].y}],count=closed?points.length:points.length-1;
    for(let i=0;i<count;i++){
      const a=points[i],b=points[(i+1)%points.length];
      if(!curved){out.push({x:b.x,y:b.y});continue}
      const dx=b.x-a.x,dy=b.y-a.y,av=a.outTangent||a.tangent||{x:dx/3,y:dy/3},bi=b.inTangent||(b.tangent?{x:-b.tangent.x,y:-b.tangent.y}:{x:-dx/3,y:-dy/3}),c1={x:a.x+av.x,y:a.y+av.y},c2={x:b.x+bi.x,y:b.y+bi.y};
      for(let j=1;j<=steps;j++){const t=j/steps,u=1-t;out.push({x:u*u*u*a.x+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*b.x,y:u*u*u*a.y+3*u*u*t*c1.y+3*u*t*t*c2.y+t*t*t*b.y})}
    }
    if(closed)out.pop();return out;
  }
  function options(opts={}){const offset=opts.offset||{x:0,y:0},transform=opts.toWorld||((p)=>p),steps=opts.steps??64;if(![offset.x,offset.y].every(Number.isFinite)||typeof transform!=='function'||!Number.isInteger(steps)||steps<1||steps>512)throw Error('Parámetros de medición no válidos');return{offset,transform,steps,curved:!!opts.curved}}
  function worldPoints(points,closed,opts){return sample(points,closed,opts.steps,opts.curved).map(p=>{const q=opts.transform({x:p.x+opts.offset.x,y:p.y+opts.offset.y});if(!q||!Number.isFinite(q.x)||!Number.isFinite(q.y))throw Error('Coordenadas transformadas no válidas');return q})}
  function measureLine(points,config={}){const opts=options(config),path=worldPoints(points,false,opts);let length=0;for(let i=1;i<path.length;i++)length+=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);return length}
  function measurePerimeter(ring,config={}){const opts=options(config),path=worldPoints(ring,true,opts);let length=0;for(let i=0;i<path.length;i++){const a=path[i],b=path[(i+1)%path.length];length+=Math.hypot(b.x-a.x,b.y-a.y)}return length}
  function ringArea(ring,opts){const path=worldPoints(ring,true,opts);let twice=0;for(let i=0;i<path.length;i++){const a=path[i],b=path[(i+1)%path.length];twice+=a.x*b.y-b.x*a.y}return Math.abs(twice)/2}
  function measureArea(outer,holes=[],config={}){if(!Array.isArray(holes))throw Error('Huecos no válidos para medir');const opts=options(config),outside=ringArea(outer,opts),inside=holes.reduce((sum,hole)=>sum+ringArea(hole,opts),0),area=outside-inside;if(area< -Math.max(1e-8,outside*1e-10))throw Error('La superficie de los huecos supera el contorno');return Math.max(0,area)}
  root.OcartoMeasureTools={sample,measureLine,measurePerimeter,measureArea};if(typeof module!=='undefined'&&module.exports)module.exports=root.OcartoMeasureTools;
})(typeof window!=='undefined'?window:globalThis);

;

/* smooth-tools.js */
/* Suavizado de geometrías: conservador y geométrico. */
(function(root){
  const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  function simplify(path,tolerance=0.5,closed=false){if(!Array.isArray(path)||path.length<3)return path?.map(p=>p.slice())||[];const end=closed?path.length-1:path.length-1,out=[path[0].slice()];for(let i=1;i<end;i++){const a=out.at(-1),b=path[i],c=path[i+1],ab=[c[0]-a[0],c[1]-a[1]],len=Math.hypot(...ab)||1,t=Math.max(0,Math.min(1,((b[0]-a[0])*ab[0]+(b[1]-a[1])*ab[1])/(len*len))),d=Math.hypot(b[0]-(a[0]+t*ab[0]),b[1]-(a[1]+t*ab[1]));if(d>tolerance)out.push(b.slice())}out.push(path[end].slice());if(closed)out.push(out[0].slice());return out}
  function smooth(path,intensity=.35,closed=false){if(!Array.isArray(path)||path.length<3)return path?.map(p=>p.slice())||[];const end=closed?path.length-1:path.length-1,out=path.map(p=>p.slice()),k=Math.max(0,Math.min(.9,Number(intensity)||0));for(let i=1;i<end;i++){const p=path[i],a=path[i-1],b=path[i+1];out[i]=[p[0]*(1-k)+(a[0]+b[0])*k/2,p[1]*(1-k)+(a[1]+b[1])*k/2]}if(closed)out[end]=out[0].slice();return out}
  function apply(path,{mode='conservative',simplification=.5,intensity=.35,closed=false}={}){const reduced=simplify(path,mode==='conservative'?1e-12:Number(simplification),closed);return mode==='geometric'?smooth(reduced,intensity,closed):reduced}
  root.OcartoSmoothTools={simplify,smooth,apply};if(typeof module!=='undefined')module.exports=root.OcartoSmoothTools;
})(typeof window!=='undefined'?window:globalThis);

;

/* simplify-tools.js */
/* Douglas–Peucker simplification that keeps endpoints and marked corner/dash vertices. */
(function(root){
  'use strict';
  const distanceToSegment=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy;if(!len2)return Math.hypot(p.x-a.x,p.y-a.y);const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len2));return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy))};
  function simplify(path,tolerance=1,{closed=false}={}){
    if(!Array.isArray(path))throw Error('Geometría no válida');
    const points=path.map(p=>{if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))throw Error('Vértice no válido');return {...p}});
    if(closed&&points.length>3&&points[0].x===points.at(-1).x&&points[0].y===points.at(-1).y)points.pop();
    if(points.length<(closed?3:2)||!Number.isFinite(tolerance)||tolerance<=0)return points;
    let winding=0;if(closed)for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];winding+=a.x*b.y-b.x*a.y}const orientation=winding>=0?1:-1;
    const work=closed?[...points,{...points[0]}]:points,n=work.length,last=n-1,keep=new Uint8Array(n),anchors=[0];
    for(let i=1;i<last;i++){
      const p=work[i];if(p.vertexType==='corner'||p.vertexType==='dash'){anchors.push(i);continue}
      const a=work[i-1],b=work[i+1],ax=p.x-a.x,ay=p.y-a.y,bx=b.x-p.x,by=b.y-p.y,al=Math.hypot(ax,ay),bl=Math.hypot(bx,by);
      if(al<tolerance||bl<tolerance)continue;
      const cosine=(ax*bx+ay*by)/(al*bl),cross=ax*by-ay*bx;
      if((closed?cosine<.5&&cross*orientation<0:cosine<-.7))anchors.push(i);
    }
    anchors.push(last);anchors.sort((a,b)=>a-b);for(const i of anchors)keep[i]=1;
    for(let k=1;k<anchors.length;k++){
      const start=anchors[k-1],end=anchors[k];if(end<=start+1)continue;
      const stack=[[start,end]];
      while(stack.length){const [a,b]=stack.pop();let best=-1,max=tolerance;for(let i=a+1;i<b;i++){const d=distanceToSegment(work[i],work[a],work[b]);if(d>max){max=d;best=i}}if(best>=0){keep[best]=1;stack.push([a,best],[best,b])}}
    }
    let result=work.filter((_,i)=>keep[i]);if(closed)result.pop();
    if(closed&&result.length<3){const selected=new Set([...work.map((_,i)=>keep[i]?i:-1).filter(i=>i>=0),last]);for(const i of [Math.floor(last/3),Math.floor(2*last/3)])if(selected.size<4)selected.add(i);result=[...selected].filter(i=>i<last).sort((a,b)=>a-b).map(i=>({...work[i]}))}
    return result;
  }
  function sampleBezier(points,steps=24){
    if(!Array.isArray(points)||points.length<2||!Number.isInteger(steps)||steps<4||steps>256)throw Error('Curva Bézier no válida');
    const out=[{...points[0]}];
    for(let i=0;i<points.length-1;i++){
      const a=points[i],b=points[i+1],dx=b.x-a.x,dy=b.y-a.y,av=a.outTangent||a.tangent||{x:dx/3,y:dy/3},bi=b.inTangent||(b.tangent?{x:-b.tangent.x,y:-b.tangent.y}:{x:-dx/3,y:-dy/3}),c1={x:a.x+av.x,y:a.y+av.y},c2={x:b.x+bi.x,y:b.y+bi.y};
      for(let j=1;j<=steps;j++){const t=j/steps,u=1-t,p={x:u*u*u*a.x+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*b.x,y:u*u*u*a.y+3*u*u*t*c1.y+3*u*t*t*c2.y+t*t*t*b.y};if(j===steps)Object.assign(p,b);out.push(p)}
    }
    return out;
  }
  function pointSegmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;if(!l2)return Math.hypot(p.x-a.x,p.y-a.y);const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l2));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)}
  function directedPathDistance(from,to){let max=0;for(const p of from){let best=Infinity;for(let i=1;i<to.length;i++)best=Math.min(best,pointSegmentDistance(p,to[i-1],to[i]));max=Math.max(max,best)}return max}
  function simplifyBezierLine(points,tolerance=1,{steps=24,curveTools=root.OcartoNaturalCurves}={}){
    if(!Number.isFinite(tolerance)||tolerance<0)throw Error('Tolerancia no válida');
    if(tolerance===0)return null;
    if(!curveTools||typeof curveTools.apply!=='function')throw Error('Conversor Bézier no disponible');
    if(!Array.isArray(points)||points.length<3)return null;
    const original=sampleBezier(points,steps);let candidate=null,proposal=tolerance;
    for(let attempt=0;attempt<12;attempt++,proposal*=2){const reduced=simplify(original,proposal);if(reduced.length<points.length){candidate=reduced;break}}
    if(!candidate||candidate.length<2)return null;
    const converted=curveTools.apply({type:'line',points:candidate.map(({tangent,inTangent,outTangent,...p})=>p)});
    if(converted?.curve==='bezier'){
      // Preserve the endpoint derivatives when collapsing several original
      // segments into fewer ones; this exactly recovers subdivided cubics.
      const ratio=(points.length-1)/(converted.points.length-1),first=points[0],next=points[1],last=points.at(-1),prev=points.at(-2),out=first.outTangent||first.tangent||{x:(next.x-first.x)/3,y:(next.y-first.y)/3},incoming=last.inTangent||(last.tangent?{x:-last.tangent.x,y:-last.tangent.y}:{x:-(last.x-prev.x)/3,y:-(last.y-prev.y)/3});
      converted.points[0].outTangent={x:out.x*ratio,y:out.y*ratio};converted.points.at(-1).inTangent={x:incoming.x*ratio,y:incoming.y*ratio};
      const fitted=sampleBezier(converted.points,steps),error=Math.max(directedPathDistance(original,fitted),directedPathDistance(fitted,original));
      if(error<=tolerance)return converted.points;
    }
    return null;
  }
  function simplifyBezierArea(points,tolerance=1,{steps=24,curveTools=root.OcartoNaturalCurves,topologyTools=root.OcartoTopologyTools}={}){
    if(!Number.isFinite(tolerance)||tolerance<0)throw Error('Tolerancia no válida');
    if(tolerance===0)return null;
    if(!curveTools||typeof curveTools.apply!=='function')throw Error('Conversor Bézier no disponible');
    if(!topologyTools||typeof topologyTools.validate!=='function')throw Error('Validador topológico no disponible');
    if(!Array.isArray(points)||points.length<4||points.some(p=>p.vertexType==='corner'||p.vertexType==='dash'))return null;
    const original=sampleBezier(points,steps), originalRing=original.map(p=>[p.x,p.y]);
    if(!topologyTools.validate(originalRing,true).valid)return null;
    let candidate=null,proposal=tolerance;
    for(let attempt=0;attempt<12;attempt++,proposal*=2){const reduced=simplify(original,proposal,{closed:true});if(reduced.length<points.length){candidate=reduced;break}}
    if(!candidate||candidate.length<3)return null;
    const converted=curveTools.apply({type:'area',points:candidate.map(({tangent,inTangent,outTangent,...p})=>p)});
    if(converted?.curve!=='bezier'||converted.points.length>=points.length)return null;
    const fitted=sampleBezier(converted.points,steps),fittedRing=fitted.map(p=>[p.x,p.y]);
    if(!topologyTools.validate(fittedRing,true).valid)return null;
    const error=Math.max(directedPathDistance(original,fitted),directedPathDistance(fitted,original));
    return error<=tolerance?converted.points:null;
  }
  function simplifyBezierPolygon(points,holes=[],tolerance=1,{steps=24,curveTools=root.OcartoNaturalCurves,topologyTools=root.OcartoTopologyTools}={}){
    if(!Array.isArray(holes))throw Error('Lista de huecos no válida');
    if(!holes.length){const outer=simplifyBezierArea(points,tolerance,{steps,curveTools,topologyTools});return outer?{points:outer,holes:[]}:null}
    if(!Number.isFinite(tolerance)||tolerance<=0||!curveTools||typeof curveTools.apply!=='function'||!topologyTools||typeof topologyTools.validatePolygon!=='function')return null;
    const source=[points,...holes];
    if(source.some(r=>!Array.isArray(r)||r.length<4||r.some(p=>p.vertexType==='corner'||p.vertexType==='dash')))return null;
    const sampled=source.map(r=>sampleBezier(r,steps)),coords=sampled.map(r=>r.map(p=>[p.x,p.y]));
    if(!topologyTools.validatePolygon(coords[0],coords.slice(1)).valid)return null;
    let changed=false;
    const converted=source.map((ring,index)=>{
      let candidate=null,proposal=tolerance;
      for(let attempt=0;attempt<12;attempt++,proposal*=2){const reduced=simplify(sampled[index],proposal,{closed:true});if(reduced.length<ring.length){candidate=reduced;break}}
      if(!candidate||candidate.length<3)return ring.map(p=>({...p}));
      const result=curveTools.apply({type:'area',points:candidate.map(({tangent,inTangent,outTangent,...p})=>p)});
      if(result?.curve!=='bezier'||result.points.length>=ring.length)return ring.map(p=>({...p}));
      const fitted=sampleBezier(result.points,steps),error=Math.max(directedPathDistance(sampled[index],fitted),directedPathDistance(fitted,sampled[index]));
      if(error>tolerance)return ring.map(p=>({...p}));
      changed=true;return result.points;
    });
    if(!changed)return null;
    const fitted=converted.map(r=>sampleBezier(r,steps).map(p=>[p.x,p.y]));
    if(!topologyTools.validatePolygon(fitted[0],fitted.slice(1)).valid)return null;
    return{points:converted[0],holes:converted.slice(1)};
  }
  root.OcartoSimplifyTools={simplify,sampleBezier,simplifyBezierLine,simplifyBezierArea,simplifyBezierPolygon};if(typeof module!=='undefined'&&module.exports)module.exports=root.OcartoSimplifyTools;
})(typeof window!=='undefined'?window:globalThis);

;

/* split-tools.js */
(function(root){
  function split(path,index){
    if(!Array.isArray(path)||path.length<3||index<=0||index>=path.length-1)throw Error('El punto de corte debe estar dentro de la línea');
    return [path.slice(0,index+1),path.slice(index)];
  }
  function splitArea(path,a,b){
    if(!Array.isArray(path)||path.length<4)throw Error('El área no tiene suficientes vértices');
    const n=path.length;if(a===b||a<0||b<0||a>=n||b>=n)throw Error('Índices de corte no válidos');
    const walk=(from,to)=>{const out=[path[from]];let i=from;while(i!==to){i=(i+1)%n;out.push(path[i])}return out};
    const p=walk(a,b),q=walk(b,a);if(p.length<3||q.length<3)throw Error('El corte debe formar dos áreas');return [p,q];
  }
  function splitAreaByLine(path,cut){
    const topo=root.OcartoTopologyTools;if(!topo?.validatePolygon)throw Error('Validador topológico no disponible');
    if(!Array.isArray(path)||path.length<3||path.some(p=>!Array.isArray(p)||p.length<2||!p.every(Number.isFinite)))throw Error('El área no es válida');
    if(!Array.isArray(cut)||cut.length<2||cut.length>2500||cut.some(p=>!Array.isArray(p)||p.length<2||!p.every(Number.isFinite)))throw Error('El trazo de corte no es válido');
    const source=topo.validatePolygon(path);if(!source.valid)throw Error(`El área de origen no es válida: ${source.issues[0]}`);
    const scale=path.flat().reduce((m,v)=>Math.max(m,Math.abs(v)),1),eps=scale*1e-10,paramEps=1e-10,cross=(a,b)=>a[0]*b[1]-a[1]*b[0],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],hits=[];
    for(let i=0;i<cut.length-1;i++){
      const p=cut[i],q=cut[i+1],r=sub(q,p);if(Math.hypot(...r)<=eps)continue;
      for(let j=0;j<path.length;j++){
        const a=path[j],b=path[(j+1)%path.length],s=sub(b,a),den=cross(r,s),ap=sub(a,p);
        if(Math.abs(den)<=eps*eps){if(Math.abs(cross(ap,r))<=eps*Math.max(Math.hypot(...r),1))throw Error('El trazo coincide con un tramo del contorno y el corte es ambiguo');continue}
        const t=cross(ap,s)/den,u=cross(ap,r)/den;if(t< -paramEps||t>1+paramEps||u< -paramEps||u>1+paramEps)continue;
        const tc=Math.max(0,Math.min(1,t)),uc=Math.max(0,Math.min(1,u)),atStart=uc<=paramEps,atEnd=uc>=1-paramEps,point=atStart?a.slice():atEnd?b.slice():[p[0]+tc*r[0],p[1]+tc*r[1]],ringPos=atStart?j:atEnd?(j+1)%path.length:j+uc,cutPos=i+tc;
        if(!hits.some(h=>Math.hypot(h.point[0]-point[0],h.point[1]-point[1])<=eps))hits.push({point,ringPos,cutPos});
      }
    }
    if(hits.length!==2)throw Error('El trazo debe atravesar el contorno exactamente dos veces');
    hits.sort((a,b)=>a.cutPos-b.cutPos);const [first,last]=hits;
    const cutBetween=[first.point,...cut.slice(1).map((p,i)=>({p,pos:i+1})).filter(x=>x.pos>first.cutPos+paramEps&&x.pos<last.cutPos-paramEps).map(x=>x.p),last.point];
    const boundary=(start,end)=>{let from=start.ringPos,to=end.ringPos;if(to<=from)to+=path.length;const out=[start.point];for(let k=Math.floor(from)+1;k<to-paramEps;k++)out.push(path[k%path.length].slice());out.push(end.point);return out};
    const one=boundary(first,last),two=boundary(last,first),inside=cutBetween.slice(1,-1);
    const parts=[one.concat(inside.slice().reverse()),two.concat(inside)];
    for(const part of parts){if(part.length<3)throw Error('El corte no forma dos áreas');const checked=topo.validatePolygon(part);if(!checked.valid)throw Error(`El corte produciría un área inválida: ${checked.issues[0]}`)}
    return parts;
  }
  function cutLine(path,a,b){
    if(!Array.isArray(path)||path.length<3)throw Error('La línea no tiene suficientes vértices');
    if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=path.length||b>=path.length||a===b)throw Error('Índices de corte no válidos');
    const lo=Math.min(a,b),hi=Math.max(a,b),left=path.slice(0,lo+1),right=path.slice(hi);if(left.length<2||right.length<2)throw Error('El tramo debe quedar entre dos extremos');return [left,right];
  }
  const api={split,splitArea,splitAreaByLine,cutLine};
  root.OcartoSplitTools=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

;