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
        const g=polylineGeometry(verts,(number(header,70)&1)!==0);if(g)features.push({type:'Feature',geometry:g,properties:{name:value(header,8)||'POLYLINE',dxf_type:'POLYLINE'}});else skipped++;continue;
      }
      if(r.type==='VERTEX'||r.type==='SEQEND')continue;
      const g=entityGeometry(r,factor);if(g)features.push({type:'Feature',geometry:g,properties:{name:value(r,8)||r.type,dxf_layer:value(r,8)||'0',dxf_type:r.type}});else skipped++;
    }
    if(!features.length)throw Error('No se encontraron entidades DXF compatibles (POINT, LINE, polilíneas, CIRCLE o ARC)');
    return{type:'FeatureCollection',metadata:{crs:referenced?mapCrs:'local',coordinate_status:referenced?'georeferenced':'local',dxf_units_factor:unitFactor},features,skipped};
  }
  root.OcartoDxf={parseDxf};if(typeof module==='object'&&module.exports)module.exports=root.OcartoDxf;
})(typeof globalThis!=='undefined'?globalThis:this);
