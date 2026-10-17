/* Ocarto v248 runtime assets. Original bundled licenses retained. */

/* editor-tools-v224.js */
(()=>{const bar=document.querySelector('.toolbar');if(!bar||document.getElementById('fillClosedBoundary'))return;const b=document.createElement('button');b.id='fillClosedBoundary';b.type='button';b.className='action';b.textContent='Rellenar contorno';b.title='Crea un área con el símbolo activo, conservando el borde o la valla';bar.appendChild(b);b.onclick=()=>{try{const refs=S.multiSelection?.length?S.multiSelection:(S.selection?[S.selection]:[]);if(refs.length!==1||refs[0].collection!=='feature')throw Error('Selecciona un solo borde cerrado');const source=S.features[refs[0].index],def=SYMBOL_CATALOG.find(x=>x.id===S.symbol);if(!source||!['line','area'].includes(source.type))throw Error('Selecciona una línea cerrada o un área');if(def&&def.geometry!=='area')throw Error('El símbolo activo debe ser de área, por ejemplo Verde privado');if(source.locked||symbolStatus(source.symbol)!=='normal'||vectorLayerFor(source)?.referenceOnly)throw Error('Desbloquea el borde y su capa');if(source.curve==='bezier'||source.points?.some(p=>p.tangent||p.inTangent||p.outTangent))throw Error('El relleno requiere un contorno recto');let points=source.points.map(p=>({...p}));if(source.type==='line'){if(points.length<3)throw Error('El borde necesita al menos tres vértices');const first=points[0],last=points.at(-1),close=12/S.zoom;if(Math.hypot(first.x-last.x,first.y-last.y)>close)throw Error('El borde no está cerrado: acerca el último vértice al primero')}if(points.length>3&&Math.hypot(points[0].x-points.at(-1).x,points[0].y-points.at(-1).y)<=12/S.zoom)points.pop();const x=source.x||0,y=source.y||0,ring=points.map(p=>[p.x+x,p.y+y]),holes=(source.type==='area'?source.holes||[]:[]).map(r=>r.map(p=>[p.x+x,p.y+y])),valid=OcartoTopologyTools.validatePolygon(ring,holes);if(!valid.valid)throw Error('Contorno no válido: '+valid.issues[0]);const before=snapshotMap(),fill={...source,type:'area',points,holes:holes.map(r=>r.map(([px,py])=>mapPoint({x:px-x,y:py-y}))),curve:'polyline',symbol:S.symbol,layerId:activeVectorLayer()?.id||source.layerId,properties:{...(source.properties||{}),derivedFrom:'closed-boundary-fill',review_required:true,fillBoundaryId:source.id||null}};if(source.type==='line')fill.holes=[];const index=S.features.indexOf(source);S.features.splice(index,0,fill);S.selection={collection:'feature',index};S.multiSelection=[];S.selectedVertices=[];recordMapEdit(before);renderVectorLayers();draw();toast('Área rellenada; el borde original se conserva encima')}catch(err){toast('Rellenar contorno: '+err.message)}}})();
(()=>{const bar=document.querySelector('.toolbar');if(!bar||document.getElementById('rotate180Selected'))return;const b=document.createElement('button');b.id='rotate180Selected';b.type='button';b.className='action';b.textContent='Voltear 180°';b.title='Gira cada objeto seleccionado 180° alrededor de su centro';const anchor=document.getElementById('rotateSelected');(anchor||bar.lastElementChild)?.insertAdjacentElement('afterend',b);if(!anchor)bar.appendChild(b);b.onclick=()=>{try{const refs=S.multiSelection?.length?S.multiSelection:(S.selection?[S.selection]:[]),items=refs.map(r=>({r,f:r.collection==='candidate'?S.candidates[r.index]:S.features[r.index]})).filter(x=>x.f&&(x.r.collection==='candidate'||(!x.f.locked&&symbolStatus(x.f.symbol)==='normal'&&!vectorLayerFor(x.f)?.referenceOnly)));if(!items.length)throw Error('Selecciona uno o varios objetos editables');const before=snapshotMap();for(const{f}of items){if(Array.isArray(f.points)&&f.points.length){const cx=f.points.reduce((n,p)=>n+p.x,0)/f.points.length,cy=f.points.reduce((n,p)=>n+p.y,0)/f.points.length,turn=p=>{const q={...p,x:2*cx-p.x,y:2*cy-p.y};if(S.georef&&S.renderGeo){const w=localToWorld(q);q.rawX=w.x;q.rawY=w.y}else if(S.cloudTransform?.scale){q.rawX=S.cloudTransform.centerX+q.x/S.cloudTransform.scale;q.rawY=S.cloudTransform.centerY-q.y/S.cloudTransform.scale}return q};f.points=f.points.map(turn);if(Array.isArray(f.holes))f.holes=f.holes.map(r=>r.map(turn))}else if(f.type==='point')f.angle=(Number(f.angle)||0)+180}recordMapEdit(before);renderVectorLayers();draw();toast(`${items.length} objeto${items.length===1?'':'s'} girado${items.length===1?'':'s'} 180°`)}catch(err){toast('Voltear 180°: '+err.message)}}})();
(()=>{const bar=document.querySelector('.toolbar');if(!bar||document.getElementById('clipLineOutsideArea'))return;const make=(id,label,title)=>{const b=document.createElement('button');b.id=id;b.type='button';b.className='action';b.textContent=label;b.title=title;bar.appendChild(b);return b};const refs=()=>S.multiSelection?.length?S.multiSelection:(S.selection?[S.selection]:[]),convert=(line,parts,ox,oy)=>{const originals=line.points.map(p=>[p.x+(line.x||0),p.y+(line.y||0)]);return parts.map(part=>part.map(([x,y])=>{let best=-1,d=Infinity;for(let i=0;i<originals.length;i++){const v=Math.hypot(originals[i][0]-x,originals[i][1]-y);if(v<d){d=v;best=i}}const old=d<=1e-7?line.points[best]:null,q=mapPoint({...old,x:x-ox,y:y-oy,vertexType:old?.vertexType||'normal'});return{...q,x:x-ox,y:y-oy}}))};make('clipLineOutsideArea','Recortar línea exterior','Conserva los tramos de línea que quedan fuera del área').onclick=()=>{try{const r=refs();if(r.length!==2||r.some(x=>x.collection!=='feature'))throw Error('Selecciona una línea y un área');const fs=r.map(x=>S.features[x.index]),line=fs.find(f=>f.type==='line'),area=fs.find(f=>f.type==='area');if(!line||!area)throw Error('La selección debe contener una línea y un área');if([line,area].some(f=>f.locked||symbolStatus(f.symbol)!=='normal'||vectorLayerFor(f)?.referenceOnly))throw Error('Desbloquea la línea, el área y sus capas');if([line,area].some(f=>f.curve==='bezier'||f.points?.some(p=>p.tangent||p.inTangent||p.outTangent))||(area.holes||[]).some(r=>r.some(p=>p.tangent||p.inTangent||p.outTangent)))throw Error('El recorte requiere geometrías rectas');const lx=line.x||0,ly=line.y||0,ax=area.x||0,ay=area.y||0,path=line.points.map(p=>[p.x+lx,p.y+ly]),outer=area.points.map(p=>[p.x+ax,p.y+ay]),holes=(area.holes||[]).map(r=>r.map(p=>[p.x+ax,p.y+ay])),parts=OcartoTopologyTools.clipLineOutsidePolygon(path,outer,holes);if(!parts.length)throw Error('No queda línea fuera del área');const before=snapshotMap(),pieces=convert(line,parts,lx,ly),updated={...line,x:0,y:0,curve:'polyline',points:pieces[0]};S.features[S.features.indexOf(line)]=updated;const indices=[S.features.indexOf(updated)];for(const points of pieces.slice(1)){indices.push(S.features.length);S.features.push({...updated,points})}S.selection=null;S.multiSelection=indices.map(index=>({collection:'feature',index}));recordMapEdit(before);draw();toast(`${pieces.length} tramo${pieces.length===1?'':'s'} exterior${pieces.length===1?'':'es'} seleccionado${pieces.length===1?'':'s'}`)}catch(err){toast('Recorte exterior de línea: '+err.message)}};make('clipAreaOutsideArea','Recortar área exterior','Conserva la parte exterior al límite convexo seleccionado').onclick=()=>{try{const r=refs();if(r.length!==2||r.some(x=>x.collection!=='feature'))throw Error('Selecciona dos áreas');const [subject,clip]=r.map(x=>S.features[x.index]);if(subject.type!=='area'||clip.type!=='area')throw Error('Selecciona dos áreas');if([subject,clip].some(f=>f.locked||symbolStatus(f.symbol)!=='normal'||vectorLayerFor(f)?.referenceOnly))throw Error('Desbloquea las áreas y sus capas');if([subject,clip].some(f=>f.curve==='bezier'||f.holes?.length||f.points?.some(p=>p.tangent||p.inTangent||p.outTangent)))throw Error('El recorte exterior requiere áreas rectas y sin huecos');const ox=subject.x||0,oy=subject.y||0,cx=clip.x||0,cy=clip.y||0,a=subject.points.map(p=>[p.x+ox,p.y+oy]),c=clip.points.map(p=>[p.x+cx,p.y+cy]),parts=OcartoTopologyTools.differenceConvexArea(a,c);if(!parts.length)throw Error('El área queda completamente dentro del límite');const originals=new Map(subject.points.map(p=>[`${p.x+ox},${p.y+oy}`,p])),convertRing=ring=>ring.map(([x,y])=>({...originals.get(`${x},${y}`),x:x-ox,y:y-oy})),before=snapshotMap(),updated={...subject,x:0,y:0,curve:'polyline',points:convertRing(parts[0])};S.features[S.features.indexOf(subject)]=updated;const indices=[S.features.indexOf(updated)];for(const ring of parts.slice(1)){indices.push(S.features.length);S.features.push({...updated,points:convertRing(ring)})}S.selection=null;S.multiSelection=indices.map(index=>({collection:'feature',index}));recordMapEdit(before);renderVectorLayers();draw();toast(`${parts.length} pieza${parts.length===1?'':'s'} exterior${parts.length===1?'':'es'} creada${parts.length===1?'':'s'}; revisa los contornos`)}catch(err){toast('Recorte exterior de área: '+err.message)}}})()

;

/* stamp-tools.js */
(function(root){
  'use strict';
  const orient=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
  function onSegment(a,b,p,tolerance){
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(length===0)return Math.hypot(p[0]-a[0],p[1]-a[1])<=tolerance;
    return Math.abs(orient(a,b,p))/length<=tolerance&&p[0]>=Math.min(a[0],b[0])-tolerance&&p[0]<=Math.max(a[0],b[0])+tolerance&&p[1]>=Math.min(a[1],b[1])-tolerance&&p[1]<=Math.max(a[1],b[1])+tolerance;
  }
  function pointInRing(point,ring,tolerance=1e-9){
    if(!Array.isArray(point)||point.length<2||!point.every(Number.isFinite)||!Array.isArray(ring)||ring.length<3)return false;
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[j],b=ring[i];
      if(onSegment(a,b,point,tolerance))return true;
      if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    return inside;
  }
  function contains(point,outer,holes=[]){return pointInRing(point,outer)&&!(holes||[]).some(r=>pointInRing(point,r,0));}
  function ringFromLinePaths(paths,tolerance=1e-6){
    if(!Array.isArray(paths)||!paths.length||!Number.isFinite(tolerance)||tolerance<0)throw Error('No hay líneas válidas para formar el recinto');
    let remaining=paths.map((path,index)=>{
      if(!Array.isArray(path)||path.length<2||path.some(p=>!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])))throw Error(`Línea ${index+1} no válida`);
      return path.map(p=>p.slice());
    });
    const ring=remaining.shift();
    if(Math.hypot(ring[0][0]-ring.at(-1)[0],ring[0][1]-ring.at(-1)[1])<=tolerance){
      if(remaining.length)throw Error('Selecciona un solo contorno cerrado');
    }
    while(remaining.length){
      const end=ring.at(-1);let best=null;
      for(let i=0;i<remaining.length;i++)for(const reverse of [false,true]){
        const path=remaining[i],start=reverse?path.at(-1):path[0],distance=Math.hypot(start[0]-end[0],start[1]-end[1]);
        if(!best||distance<best.distance)best={i,reverse,distance};
      }
      if(!best||best.distance>tolerance)throw Error('Las líneas seleccionadas no forman un perímetro conectado');
      const path=remaining.splice(best.i,1)[0];if(best.reverse)path.reverse();ring.push(...path.slice(1));
    }
    if(Math.hypot(ring[0][0]-ring.at(-1)[0],ring[0][1]-ring.at(-1)[1])>tolerance)throw Error('El perímetro seleccionado no está cerrado');
    ring.pop();
    if(ring.length<3)throw Error('El recinto necesita al menos tres vértices');
    return ring;
  }
  root.OcartoStampTools={pointInRing,contains,ringFromLinePaths};
  if(typeof module!=='undefined')module.exports=root.OcartoStampTools;
})(typeof window!=='undefined'?window:globalThis);

;

/* stamp-tools-ui-v225.js */
(()=>{
  const canvas=document.getElementById('mapCanvas'),bar=document.querySelector('.toolbar');
  if(!canvas||!bar||document.getElementById('stampSymbolTool'))return;
  const button=document.createElement('button');button.id='stampSymbolTool';button.type='button';button.className='action';button.textContent='Estampar símbolo';button.title='Pulsa o arrastra para colocar el símbolo puntual activo dentro de un recinto cerrado';bar.appendChild(button);
  const refs=()=>S.multiSelection?.length?S.multiSelection:(S.selection?[S.selection]:[]);
  const areaForSelection=()=>{
    const selected=refs();if(!selected.length||selected.some(r=>r.collection!=='feature'))throw Error('Selecciona un área o las líneas que forman un recinto');
    const items=selected.map(r=>({index:r.index,feature:S.features[r.index]}));if(items.some(x=>!x.feature))throw Error('La selección ya no está disponible');
    if(items.some(x=>x.feature.locked||symbolStatus(x.feature.symbol)!=='normal'||vectorLayerFor(x.feature)?.referenceOnly))throw Error('Desbloquea el recinto y sus capas');
    if(items.length===1&&items[0].feature.type==='area'){
      const f=items[0].feature;if(f.curve==='bezier'||f.points?.some(p=>p.tangent||p.inTangent||p.outTangent)||(f.holes||[]).some(r=>r.some(p=>p.tangent||p.inTangent||p.outTangent)))throw Error('El estampado requiere un área recta');
      const x=f.x||0,y=f.y||0,outer=f.points.map(p=>[p.x+x,p.y+y]),holes=(f.holes||[]).map(r=>r.map(p=>[p.x+x,p.y+y]));
      const valid=OcartoTopologyTools.validatePolygon(outer,holes);if(!valid.valid)throw Error('Área no válida: '+valid.issues[0]);return{outer,holes,ids:[f.id||items[0].index]};
    }
    if(items.some(x=>x.feature.type!=='line'))throw Error('Selecciona un área o solo líneas de perímetro');
    if(items.some(x=>x.feature.curve==='bezier'||x.feature.points?.some(p=>p.tangent||p.inTangent||p.outTangent)))throw Error('Las líneas del perímetro deben ser rectas');
    const paths=items.map(({feature:f})=>f.points.map(p=>[p.x+(f.x||0),p.y+(f.y||0)])),outer=OcartoStampTools.ringFromLinePaths(paths,8/S.zoom),valid=OcartoTopologyTools.validatePolygon(outer,[]);
    if(!valid.valid)throw Error('Perímetro no válido: '+valid.issues[0]);return{outer,holes:[],ids:items.map(x=>x.feature.id||x.index)};
  };
  const local=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left-W()/2-S.panX)/S.zoom,y:(e.clientY-r.top-H()/2-S.panY)/S.zoom}};
  const inside=(mode,p)=>OcartoStampTools.contains([p.x,p.y],mode.outer,mode.holes);
  const addStamp=(mode,p)=>{
    if(!inside(mode,p))return false;
    const point=mapPoint({x:p.x,y:p.y}),feature={...point,type:'point',symbol:mode.symbol,layerId:mode.layerId,angle:0,properties:{derivedFrom:'symbol-stamp',boundaryFeatureIds:mode.boundaryIds,review_required:false}};
    S.features.push(feature);mode.lastIndex=S.features.length-1;mode.count++;mode.gesture.count++;mode.gesture.last=p;return true;
  };
  const finishGesture=()=>{const mode=S.stampMode,g=mode?.gesture;if(!g)return;mode.gesture=null;if(g.count){recordMapEdit(g.before);S.selection={collection:'feature',index:mode.lastIndex};S.multiSelection=[];S.selectedVertices=[];renderVectorLayers();draw();toast(`${g.count} símbolo${g.count===1?'':'s'} estampado${g.count===1?'':'s'}`)}else draw()};
  button.onclick=()=>{
    if(S.stampMode){finishGesture();S.stampMode=null;button.textContent='Estampar símbolo';button.classList.remove('primary');draw();toast('Estampado terminado');return}
    try{
      const def=SYMBOL_CATALOG.find(x=>x.id===S.symbol);if(!def||def.geometry!=='point')throw Error('Elige primero un símbolo puntual');
      if(symbolStatus(S.symbol)!=='normal')throw Error('El símbolo activo está oculto o protegido');
      const region=areaForSelection(),layer=activeVectorLayer();if(!layer)throw Error('No hay una capa editable activa');
      S.stampMode={...region,symbol:S.symbol,layerId:layer.id,gesture:null,lastIndex:-1,count:0};S.selection=null;S.multiSelection=[];S.selectedVertices=[];button.textContent='Terminar estampado';button.classList.add('primary');draw();toast('Pulsa o arrastra dentro del recinto para estampar; vuelve a pulsar el botón para terminar');
    }catch(err){toast('Estampar símbolo: '+err.message)}
  };
  canvas.addEventListener('pointerdown',e=>{const mode=S.stampMode;if(!mode||e.button!==0||e.isPrimary===false)return;e.preventDefault();e.stopImmediatePropagation();mode.gesture={before:snapshotMap(),count:0,last:null,pointerId:e.pointerId};canvas.setPointerCapture?.(e.pointerId);const p=local(e);addStamp(mode,p);draw()},{capture:true});
  canvas.addEventListener('pointermove',e=>{const mode=S.stampMode,g=mode?.gesture;if(!g||g.pointerId!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const p=local(e),spacing=14/S.zoom;if(!g.last||Math.hypot(p.x-g.last.x,p.y-g.last.y)>=spacing){if(addStamp(mode,p))draw()}},{capture:true});
  canvas.addEventListener('pointerup',e=>{const mode=S.stampMode;if(!mode?.gesture||mode.gesture.pointerId!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();finishGesture()},{capture:true});
  canvas.addEventListener('pointercancel',e=>{if(S.stampMode?.gesture?.pointerId===e.pointerId)finishGesture()},{capture:true});
})();

;

/* streetview-tools.js */
'use strict';

function streetViewUrl(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('Coordenadas geográficas fuera de rango');
  }
  const lat = Number(latitude.toFixed(7)), lon = Number(longitude.toFixed(7));
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`;
}

if (typeof module === 'object' && module.exports) module.exports = { streetViewUrl };
if (typeof window !== 'undefined') window.OcartoStreetViewTools = { streetViewUrl };

;

/* streetview-ui.js */
(()=>{
  const bar=document.querySelector('.toolbar'),canvas=document.getElementById('mapCanvas');
  if(!bar||!canvas||document.getElementById('streetViewTool'))return;
  const button=document.createElement('button');button.id='streetViewTool';button.type='button';button.className='action';button.textContent='Street View';button.title='Haz clic en el mapa para abrir Google Street View en esa ubicación';bar.appendChild(button);
  const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left-W()/2-S.panX)/S.zoom,y:(e.clientY-r.top-H()/2-S.panY)/S.zoom}};
  const cancel=()=>{S.streetViewMode=null;button.classList.remove('primary');button.setAttribute('aria-pressed','false')};
  button.setAttribute('aria-pressed','false');
  button.onclick=()=>{if(S.streetViewMode){cancel();toast('Street View cancelado');return}if(!S.georef||!S.renderGeo){toast('Georreferencia el mapa para consultar Street View');return}button.classList.add('primary');button.setAttribute('aria-pressed','true');S.streetViewMode={pointerId:null};toast('Haz clic en el mapa para abrir Street View en esa zona')};
  canvas.addEventListener('pointerdown',e=>{if(!S.streetViewMode||e.button!==0||e.isPrimary===false)return;e.preventDefault();e.stopImmediatePropagation();S.streetViewMode.pointerId=e.pointerId;canvas.setPointerCapture?.(e.pointerId)},{capture:true});
  canvas.addEventListener('pointerup',e=>{const mode=S.streetViewMode;if(!mode||mode.pointerId!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();try{const p=point(e),world=localToWorld(p),crs=OcartoGeoCrs.normalizeGeoCrs(document.getElementById('mapCrs').value),gps=OcartoGeoCrs.transformCoordinate(world.x,world.y,crs,'EPSG:4326'),url=OcartoStreetViewTools.streetViewUrl(gps.y,gps.x);window.open(url,'_blank','noopener,noreferrer');toast('Street View abierto en la ubicación marcada')}catch(err){toast('No se pudo abrir Street View: '+err.message)}finally{cancel()}},{capture:true});
  canvas.addEventListener('pointercancel',e=>{if(S.streetViewMode?.pointerId===e.pointerId){cancel();toast('Street View cancelado')}},{capture:true});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&S.streetViewMode){cancel();toast('Street View cancelado')}});
})();

;

/* osm-buildings.js */
'use strict';

function osmBuildingQuery(latLonRing) {
  if (!Array.isArray(latLonRing) || latLonRing.length < 3 || latLonRing.length > 399) throw new Error('El área debe tener entre 3 y 399 vértices');
  const points=latLonRing.map(([lat,lon])=>{
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw new Error('El área contiene coordenadas geográficas no válidas');
    return `${lat.toFixed(7)} ${lon.toFixed(7)}`;
  });
  if(points[0]!==points.at(-1))points.push(points[0]);
  return `[out:json][timeout:25];way["building"](poly:"${points.join(' ')}");out geom;`;
}

function parseOsmBuildingWays(data) {
  if(!Array.isArray(data?.elements))throw new Error('Respuesta de OpenStreetMap no válida');
  const features=[];
  for(const way of data.elements){
    if(way.type!=='way'||!way.tags?.building||!Array.isArray(way.geometry)||way.geometry.length<4)continue;
    const ring=way.geometry.map(p=>[p.lon,p.lat]);
    if(ring.some(([lon,lat])=>!Number.isFinite(lon)||!Number.isFinite(lat)))continue;
    const first=ring[0],last=ring.at(-1);
    if(first[0]!==last[0]||first[1]!==last[1])ring.push([...first]);
    if(ring.length<4)continue;
    features.push({type:'Feature',id:`way/${way.id}`,geometry:{type:'Polygon',coordinates:[ring]},properties:{source:'OpenStreetMap',osm_type:'way',osm_id:way.id,building:way.tags.building,name:way.tags.name||null,levels:way.tags['building:levels']||null,height:way.tags.height||null,review_required:true}});
  }
  return {type:'FeatureCollection',features};
}

const api={osmBuildingQuery,parseOsmBuildingWays};
if(typeof module==='object'&&module.exports)module.exports=api;
if(typeof window!=='undefined')window.OcartoOsmBuildings=api;

;

/* osm-buildings-ui.js */
(()=>{
  const bar=document.querySelector('.toolbar');
  if(!bar||document.getElementById('importOsmBuildings'))return;
  const button=document.createElement('button');button.id='importOsmBuildings';button.type='button';button.className='action';button.textContent='Edificios OSM';button.title='Importa los contornos de edificios de OpenStreetMap dentro del área seleccionada';bar.appendChild(button);
  button.onclick=async()=>{
    try{
      const sel=S.selection,f=sel?.collection==='feature'?S.features[sel.index]:null;
      if(!f||f.type!=='area'||f.locked||symbolStatus(f.symbol)!=='normal'||vectorLayerFor(f)?.referenceOnly)throw Error('Selecciona un área editable que delimite la zona urbana');
      if(!S.georef||!S.renderGeo)throw Error('Georreferencia el mapa antes de importar edificios');
      if(f.curve==='bezier'||f.points?.some(p=>p.tangent||p.inTangent||p.outTangent))throw Error('El área debe tener un contorno recto');
      if(!Array.isArray(f.points)||f.points.length<3||f.points.length>399)throw Error('El área debe tener de 3 a 399 vértices');
      const crs=OcartoGeoCrs.normalizeGeoCrs(document.getElementById('mapCrs').value),fx=f.x||0,fy=f.y||0;
      const latLon=f.points.map(p=>{const w=localToWorld({x:p.x+fx,y:p.y+fy}),g=OcartoGeoCrs.transformCoordinate(w.x,w.y,crs,'EPSG:4326');return[g.y,g.x]});
      const query=OcartoOsmBuildings.osmBuildingQuery(latLon);button.disabled=true;button.textContent='Consultando OSM…';
      const response=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:`data=${encodeURIComponent(query)}`});
      if(!response.ok)throw Error(response.status===429?'OpenStreetMap está limitando las consultas; inténtalo más tarde':`OpenStreetMap respondió ${response.status}`);
      const result=OcartoOsmBuildings.parseOsmBuildingWays(await response.json());
      if(!result.features.length)throw Error('No se encontraron edificios registrados en OpenStreetMap dentro del área');
      const layerId=`osm-buildings-${Date.now()}`,layer={id:layerId,name:'Edificios OSM · revisar',color:'#252525',visible:true,source:'openstreetmap',attribution:'© OpenStreetMap contributors · ODbL',reviewRequired:true};
      const imported=result.features.map(item=>{const wgs=item.geometry.coordinates[0].slice(0,-1),points=wgs.map(([lon,lat])=>{const w=OcartoGeoCrs.transformCoordinate(lon,lat,'EPSG:4326',crs),q=worldToLocal(w.x,w.y);return{...q,rawX:w.x,rawY:w.y,vertexType:'corner'}});return{x:0,y:0,type:'area',points,symbol:'building-area',layerId,transparent:false,osmProperties:{...item.properties,attribution:'© OpenStreetMap contributors · ODbL',review_required:true}}});
      const before=snapshotMap();S.vectorLayers.push(layer);S.features.push(...imported);S.activeLayerId=layerId;S.selection=null;S.multiSelection=[];S.selectedVertices=[];recordMapEdit(before);renderVectorLayers();draw();toast(`${imported.length} edificios importados como contornos editables; revisa y corrige su encaje`);
    }catch(err){toast('Edificios OSM: '+err.message)}finally{button.disabled=false;button.textContent='Edificios OSM'}
  };
})();

;

/* urban-width-tools.js */
'use strict';

function offsetRing(ring,distance){
  if(!Array.isArray(ring)||ring.length<3||!Number.isFinite(distance))throw new Error('Contorno o distancia no válidos');
  if(distance===0)return ring.map(p=>[...p]);
  let twiceArea=0;for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];twiceArea+=a[0]*b[1]-b[0]*a[1]}
  if(Math.abs(twiceArea)<1e-12)throw new Error('El contorno tiene área nula');
  const orientation=Math.sign(twiceArea),shifted=[];
  for(let i=0;i<ring.length;i++){
    const p=ring[i],prev=ring[(i+ring.length-1)%ring.length],next=ring[(i+1)%ring.length];
    const edge=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(len<1e-12)throw new Error('El contorno contiene lados duplicados');return{dx,dy,nx:orientation*dy/len,ny:-orientation*dx/len}};
    const e1=edge(prev,p),e2=edge(p,next),a=[prev[0]+e1.nx*distance,prev[1]+e1.ny*distance],b=[p[0]+e1.nx*distance,p[1]+e1.ny*distance],c=[p[0]+e2.nx*distance,p[1]+e2.ny*distance],d=[next[0]+e2.nx*distance,next[1]+e2.ny*distance],den=e1.dx*e2.dy-e1.dy*e2.dx;
    if(Math.abs(den)<1e-10){const nx=e1.nx+e2.nx,ny=e1.ny+e2.ny,n=Math.hypot(nx,ny)||1;shifted.push([p[0]+nx/n*distance,p[1]+ny/n*distance]);continue}
    const t=((c[0]-a[0])*e2.dy-(c[1]-a[1])*e2.dx)/den,q=[a[0]+t*e1.dx,a[1]+t*e1.dy];
    if(Math.hypot(q[0]-p[0],q[1]-p[1])>Math.max(Math.abs(distance)*8,Math.abs(distance)+1e-9))throw new Error('Esquina demasiado aguda para ajustar con seguridad');
    shifted.push(q);
  }
  return shifted;
}
if(typeof module==='object'&&module.exports)module.exports={offsetRing};
if(typeof window!=='undefined')window.OcartoUrbanWidthTools={offsetRing};

;

/* urban-width-ui.js */
(()=>{
  const bar=document.querySelector('.toolbar');
  if(!bar||document.getElementById('adjustUrbanWidths'))return;
  const button=document.createElement('button');button.id='adjustUrbanWidths';button.type='button';button.className='action';button.textContent='Ajustar calles zona';button.title='Aumenta el ancho de las calles y estrecha los edificios dentro del área urbana seleccionada';bar.appendChild(button);
  const roadSymbols=new Set(['path','road-wide','road','vehicle-track','small-footpath','small-track','mtbo-track-fast','mtbo-path-fast','mtbo-track-medium','mtbo-path-medium','mtbo-track-slow','mtbo-track-very-slow']);
  const parse=(text,label,min,max)=>{const n=Number(String(text).trim().replace(',','.'));if(!Number.isFinite(n)||n<min||n>max)throw Error(`${label}: introduce un valor entre ${min} y ${max} mm`);return n};
  const editable=f=>f&&!f.locked&&symbolStatus(f.symbol)==='normal'&&!vectorLayerFor(f)?.referenceOnly;
  const contains=(xy,outer,holes)=>OcartoStampTools.contains(xy,outer,holes);
  const ringsInside=(rings,outer,holes)=>rings.every(r=>r.every((p,i)=>contains(p,outer,holes)&&contains([(p[0]+r[(i+1)%r.length][0])/2,(p[1]+r[(i+1)%r.length][1])/2],outer,holes)));
  const toPoints=ring=>ring.map(([x,y])=>mapPoint({x,y,vertexType:'corner'}));
  const partsToFeatures=(feature,parts,boost,prefix)=>parts.map((part,i)=>({...feature,id:i===0?feature.id:`${prefix}-${i}`,x:0,y:0,points:part.map(([x,y])=>mapPoint({x,y,vertexType:'normal'})),roadWidthBoostMm:boost}));
  button.onclick=()=>{
    try{
      const sel=S.selection,zone=sel?.collection==='feature'?S.features[sel.index]:null;
      if(!zone||zone.type!=='area'||!editable(zone))throw Error('Selecciona un área editable que delimite la zona urbana');
      if(!S.georef||!S.renderGeo)throw Error('Georreferencia el mapa para aplicar anchos en milímetros');
      if(zone.curve==='bezier'||zone.points?.some(p=>p.tangent||p.inTangent||p.outTangent)||(zone.holes||[]).some(r=>r.some(p=>p.tangent||p.inTangent||p.outTangent)))throw Error('El límite urbano debe tener contornos rectos');
      const outer=zone.points.map(p=>[p.x+(zone.x||0),p.y+(zone.y||0)]),holes=(zone.holes||[]).map(r=>r.map(p=>[p.x+(zone.x||0),p.y+(zone.y||0)])),zoneCheck=OcartoTopologyTools.validatePolygon(outer,holes);
      if(!zoneCheck.valid)throw Error('Área urbana no válida: '+zoneCheck.issues[0]);
      const roadText=prompt('Aumentar el ancho total de las calles (mm en el mapa)','1');if(roadText===null)return;const roadDelta=parse(roadText,'Ancho de calles',0,5);
      const buildingText=prompt('Reducir cada borde de los edificios hacia dentro (mm)','0,15');if(buildingText===null)return;const buildingInset=parse(buildingText,'Reducción de edificios',0,2);
      if(roadDelta===0&&buildingInset===0)throw Error('Indica un cambio mayor que cero');
      const unitScale=symbolUnitScale();if(!unitScale)throw Error('No se pudo calcular la escala cartográfica');
      const expansion=roadDelta*unitScale/2,inset=buildingInset*unitScale,before=snapshotMap(),next=[],counts={roads:0,paved:0,buildings:0,skipped:0},batch=`urban-adjust-${Date.now()}`;
      for(const f of S.features){
        if(f===zone||!editable(f)){next.push(f);continue}
        if(f.type==='line'&&roadDelta>0&&roadSymbols.has(f.symbol)&&f.points?.length>=2){
          if(f.curve==='bezier'||f.points.some(p=>p.tangent||p.inTangent||p.outTangent)){next.push(f);counts.skipped++;continue}
          const ox=f.x||0,oy=f.y||0,path=f.points.map(p=>[p.x+ox,p.y+oy]);
          try{const inside=OcartoTopologyTools.clipLineToPolygon(path,outer,holes),outside=OcartoTopologyTools.clipLineOutsidePolygon(path,outer,holes),prev=Number(f.roadWidthBoostMm)||0;
            if(!inside.length){next.push(f);continue}
            next.push(...partsToFeatures(f,outside,prev,`${batch}-out-${counts.roads}`),...partsToFeatures(f,inside,prev+roadDelta,`${batch}-in-${counts.roads}`));counts.roads++
          }catch(_){next.push(f);counts.skipped++}continue;
        }
        if(f.type==='area'&&f.points?.length>=3&&f.symbol==='paved-area'&&roadDelta>0){
          const ox=f.x||0,oy=f.y||0,base=f.points.map(p=>[p.x+ox,p.y+oy]),baseHoles=(f.holes||[]).map(r=>r.map(p=>[p.x+ox,p.y+oy]));
          if(!ringsInside([base,...baseHoles],outer,holes)){next.push(f);continue}
          try{const expanded=OcartoUrbanWidthTools.offsetRing(base,expansion),shrunkHoles=baseHoles.map(r=>OcartoUrbanWidthTools.offsetRing(r,-expansion));if(!ringsInside([expanded,...shrunkHoles],outer,holes))throw Error('La calle ampliada sale de la zona');const check=OcartoTopologyTools.validatePolygon(expanded,shrunkHoles);if(!check.valid)throw Error(check.issues[0]);next.push({...f,x:0,y:0,points:toPoints(expanded),holes:shrunkHoles.map(toPoints)});counts.paved++}catch(_){next.push(f);counts.skipped++}continue;
        }
        if(f.type==='area'&&f.symbol==='building-area'&&buildingInset>0){
          const ox=f.x||0,oy=f.y||0,base=f.points.map(p=>[p.x+ox,p.y+oy]),baseHoles=(f.holes||[]).map(r=>r.map(p=>[p.x+ox,p.y+oy]));
          if(!ringsInside([base,...baseHoles],outer,holes)){next.push(f);continue}
          try{const narrowed=OcartoUrbanWidthTools.offsetRing(base,-inset),expandedHoles=baseHoles.map(r=>OcartoUrbanWidthTools.offsetRing(r,inset)),check=OcartoTopologyTools.validatePolygon(narrowed,expandedHoles);if(!check.valid)throw Error(check.issues[0]);next.push({...f,x:0,y:0,points:toPoints(narrowed),holes:expandedHoles.map(toPoints)});counts.buildings++}catch(_){next.push(f);counts.skipped++}continue;
        }
        next.push(f);
      }
      if(!counts.roads&&!counts.paved&&!counts.buildings)throw Error('No hay calles ni edificios compatibles dentro de esta zona');
      S.features=next;const zoneIndex=S.features.indexOf(zone);S.selection=zoneIndex>=0?{collection:'feature',index:zoneIndex}:null;S.multiSelection=[];S.selectedVertices=[];recordMapEdit(before);renderVectorLayers();draw();toast(`${counts.roads} tramos de calle ensanchados · ${counts.paved} calles de área ampliadas · ${counts.buildings} edificios estrechados${counts.skipped?` · ${counts.skipped} omitidos por geometría compleja`:''}. Deshacer revierte el ajuste`);
    }catch(err){toast('Ajuste urbano: '+err.message)}
  };
})();

;

/* distribute-tools.js */
/* Points placed at fixed distances along an open polyline. */
(function(root){
  function cleanPath(path){
    if(!Array.isArray(path)||path.length<2||path.some(p=>!Array.isArray(p)||p.length<2||!p.slice(0,2).every(Number.isFinite)))throw Error('La línea necesita al menos dos puntos válidos');
    const out=[path[0].slice(0,2)];for(const p of path.slice(1))if(Math.hypot(p[0]-out.at(-1)[0],p[1]-out.at(-1)[1])>1e-10)out.push(p.slice(0,2));
    if(out.length<2)throw Error('La línea no tiene longitud');return out;
  }
  function distributeAlongPath(path,spacing,options={}){
    if(!Number.isFinite(spacing)||spacing<=0)throw Error('La separación debe ser mayor que cero');
    const points=cleanPath(path),segments=[];let length=0;
    for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);segments.push({a,b,len,start:length});length+=len}
    const max=options.maxCount??2000,count=Math.floor((length+spacing*1e-10)/spacing);
    if(count>max)throw Error(`La línea produciría ${count} copias; el máximo es ${max}`);
    const result=[];let segmentIndex=0;
    for(let n=1;n<=count;n++){
      const d=n*spacing;while(segmentIndex<segments.length-1&&d>segments[segmentIndex].start+segments[segmentIndex].len+1e-10)segmentIndex++;
      const s=segments[segmentIndex],t=Math.max(0,Math.min(1,(d-s.start)/s.len));result.push({x:s.a[0]+(s.b[0]-s.a[0])*t,y:s.a[1]+(s.b[1]-s.a[1])*t,distance:d});
    }
    return{length,positions:result};
  }
  root.OcartoDistributeTools={distributeAlongPath};if(typeof module!=='undefined'&&module.exports)module.exports=root.OcartoDistributeTools;
})(typeof window!=='undefined'?window:globalThis);

;

/* align-building-tools.js */
/* Rotate a selected polygon's dominant edge parallel to its nearest road segment. */
(function(root){
  function validRing(ring){return Array.isArray(ring)&&ring.length>=3&&ring.every(p=>Array.isArray(p)&&p.length>=2&&p.slice(0,2).every(Number.isFinite))}
  function centroid(ring){let twice=0,cx=0,cy=0;for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],cross=a[0]*b[1]-b[0]*a[1];twice+=cross;cx+=(a[0]+b[0])*cross;cy+=(a[1]+b[1])*cross}if(Math.abs(twice)<1e-12)return ring.reduce((c,p)=>[c[0]+p[0]/ring.length,c[1]+p[1]/ring.length],[0,0]);return[cx/(3*twice),cy/(3*twice)]}
  function dominantAngle(ring){let best=null;for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(!best||length>best.length)best={length,angle:Math.atan2(dy,dx)}}if(!best||best.length<1e-10)throw Error('El edificio no tiene lados válidos');return best.angle}
  function pointSegmentDistanceSquared(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy;if(l2<1e-20)return(p[0]-a[0])**2+(p[1]-a[1])**2;const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l2)),x=a[0]+t*dx,y=a[1]+t*dy;return(p[0]-x)**2+(p[1]-y)**2}
  function nearestRoadAngle(center,roads){let best=null;for(let r=0;r<roads.length;r++){const path=roads[r];if(!Array.isArray(path)||path.length<2)continue;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];if(![...a,...b].every(Number.isFinite))continue;const d2=pointSegmentDistanceSquared(center,a,b),dx=b[0]-a[0],dy=b[1]-a[1];if(dx*dx+dy*dy<1e-20)continue;if(!best||d2<best.distanceSquared)best={distanceSquared:d2,angle:Math.atan2(dy,dx),roadIndex:r,segmentIndex:i-1}}}if(!best)throw Error('No hay segmentos de calle válidos');return best}
  function alignBuilding(outer,holes,roads){if(!validRing(outer))throw Error('El contorno del edificio no es válido');if(!Array.isArray(holes)||holes.some(h=>!validRing(h)))throw Error('Los huecos del edificio no son válidos');const center=centroid(outer),sourceAngle=dominantAngle(outer),target=nearestRoadAngle(center,roads);let rotation=target.angle-sourceAngle;while(rotation>Math.PI/2)rotation-=Math.PI;while(rotation< -Math.PI/2)rotation+=Math.PI;const c=Math.cos(rotation),s=Math.sin(rotation),rotate=ring=>ring.map(p=>{const x=p[0]-center[0],y=p[1]-center[1];return[center[0]+x*c-y*s,center[1]+x*s+y*c]});return{outer:rotate(outer),holes:holes.map(rotate),center,rotation,roadIndex:target.roadIndex,segmentIndex:target.segmentIndex,distance:Math.sqrt(target.distanceSquared)}}
  root.OcartoAlignBuildingTools={alignBuilding,centroid,dominantAngle};if(typeof module!=='undefined'&&module.exports)module.exports=root.OcartoAlignBuildingTools;
})(typeof window!=='undefined'?window:globalThis);

;

/* distribute-along-line-ui-v230.js */
(()=>{
  const bar=document.querySelector('.toolbar');if(!bar||document.getElementById('duplicateDistributeLine'))return;
  const button=document.createElement('button');button.id='duplicateDistributeLine';button.type='button';button.className='action edit-transform';button.textContent='Duplicar y repartir';button.title='Repite los símbolos seleccionados a intervalos regulares siguiendo una línea';bar.append(button);
  const editable=f=>f&&!f.locked&&symbolStatus(f.symbol)==='normal'&&!vectorLayerFor(f)?.referenceOnly;
  const toWorld=p=>S.georef&&S.renderGeo?localToWorld(p):S.cloudTransform?.scale?{x:S.cloudTransform.centerX+p.x/S.cloudTransform.scale,y:S.cloudTransform.centerY-p.y/S.cloudTransform.scale}:p;
  const toLocal=p=>S.georef&&S.renderGeo?worldToLocal(p.x,p.y):S.cloudTransform?.scale?{x:(p.x-S.cloudTransform.centerX)*S.cloudTransform.scale,y:-(p.y-S.cloudTransform.centerY)*S.cloudTransform.scale}:p;
  button.onclick=()=>{try{
    const refs=S.multiSelection?.length?S.multiSelection:(S.selection?[S.selection]:[]),chosen=refs.filter(r=>r.collection==='feature').map(r=>S.features[r.index]).filter(editable),lines=chosen.filter(f=>f.type==='line'),templates=chosen.filter(f=>f.type==='point');
    if(lines.length!==1||!templates.length)throw Error('Selecciona una línea y uno o varios símbolos puntuales para copiar');
    if(!activeVectorLayer())throw Error('Activa primero una capa editable');
    const line=lines[0],sampled=line.curve==='bezier'||line.points.some(p=>p.tangent||p.inTangent||p.outTangent)?OcartoMeasureTools.sample(line.points,false,96,true):line.points.map(p=>({x:p.x,y:p.y}));
    const localPath=sampled.map(p=>[p.x+(line.x||0),p.y+(line.y||0)]),worldPath=localPath.map(p=>{const q=toWorld({x:p[0],y:p[1]});return[q.x,q.y]});
    const raw=prompt(`Separación entre copias en metros${S.georef?'':' (unidades locales del mapa)'}`,'5');if(raw===null)return;const spacing=Number(String(raw).trim().replace(',','.'));if(!Number.isFinite(spacing)||spacing<=0||spacing>10000)throw Error('Indica una separación mayor que 0 y hasta 10 000');
    const layout=OcartoDistributeTools.distributeAlongPath(worldPath,spacing,{maxCount:2000});if(!layout.positions.length)throw Error('La línea es más corta que la separación indicada');
    const before=snapshotMap(),layer=activeVectorLayer(),copies=[],batch=`distributed-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;layout.positions.forEach((p,i)=>{const local=toLocal(p),source=templates[i%templates.length],copy=JSON.parse(JSON.stringify(source));copy.id=`${batch}-${i}`;copy.x=local.x;copy.y=local.y;copy.layerId=layer.id;copy.locked=false;copy.properties={...(copy.properties||{}),derivedFrom:'distributed-along-line',sourceFeatureId:source.id||null,distributionLineId:line.id||null,spacing};S.features.push(copy);copies.push({collection:'feature',index:S.features.length-1})});
    recordMapEdit(before);S.selection=null;S.multiSelection=copies;S.selectedVertices=[];renderVectorLayers();draw();toast(`${copies.length} copia${copies.length===1?'':'s'} repartida${copies.length===1?'':'s'} a ${spacing} ${S.georef?'m':'unidades'}`);
  }catch(err){toast('Duplicar y repartir: '+err.message)}};
})();

;

/* align-buildings-road-ui-v230.js */
(()=>{
  const bar=document.querySelector('.toolbar');if(!bar||document.getElementById('alignBuildingsToRoad'))return;
  const button=document.createElement('button');button.id='alignBuildingsToRoad';button.type='button';button.className='action edit-transform';button.textContent='Alinear edificios a calle';button.title='Gira las áreas seleccionadas para que su lado más largo quede paralelo a la calle más cercana';bar.append(button);
  const editable=f=>f&&!f.locked&&symbolStatus(f.symbol)==='normal'&&!vectorLayerFor(f)?.referenceOnly;
  const rotateVector=(v,a)=>{if(!v)return v;const c=Math.cos(a),s=Math.sin(a);return{x:v.x*c-v.y*s,y:v.x*s+v.y*c}};
  button.onclick=()=>{try{
    const refs=S.multiSelection?.length?S.multiSelection:(S.selection?[S.selection]:[]),chosen=refs.filter(r=>r.collection==='feature').map(r=>S.features[r.index]).filter(editable),buildings=chosen.filter(f=>f.type==='area'),roads=chosen.filter(f=>f.type==='line');
    if(!buildings.length||!roads.length)throw Error('Selecciona uno o varios edificios y al menos una calle');
    const paths=roads.map(f=>{const points=f.curve==='bezier'||f.points.some(p=>p.tangent||p.inTangent||p.outTangent)?OcartoMeasureTools.sample(f.points,false,96,true):f.points.map(p=>({x:p.x,y:p.y}));return points.map(p=>[p.x+(f.x||0),p.y+(f.y||0)])});
    const prepared=[];
    for(const f of buildings){if(!Array.isArray(f.points)||f.points.length<3)continue;const ox=f.x||0,oy=f.y||0,outer=f.points.map(p=>[p.x+ox,p.y+oy]),holes=(f.holes||[]).map(r=>r.map(p=>[p.x+ox,p.y+oy])),result=OcartoAlignBuildingTools.alignBuilding(outer,holes,paths),a=result.rotation;
      const convert=(old,xy)=>{const q={...old,x:xy[0]-ox,y:xy[1]-oy};for(const key of ['tangent','inTangent','outTangent'])if(old[key])q[key]=rotateVector(old[key],a);if(Number.isFinite(old.rawX)&&Number.isFinite(old.rawY)){const world=localToWorld({x:xy[0],y:xy[1]});q.rawX=world.x;q.rawY=world.y}return q};
      prepared.push({feature:f,points:f.points.map((p,i)=>convert(p,result.outer[i])),holes:f.holes||[],alignedHoles:(f.holes||[]).map((ring,j)=>ring.map((p,i)=>convert(p,result.holes[j][i]))) });
    }
    if(!prepared.length)throw Error('No hay áreas válidas en la selección');const before=snapshotMap();for(const item of prepared){item.feature.points=item.points;item.feature.holes=item.alignedHoles}recordMapEdit(before);S.selection=null;S.multiSelection=refs.filter(r=>r.collection==='feature'&&prepared.some(x=>x.feature===S.features[r.index]));S.selectedVertices=[];renderVectorLayers();draw();toast(`${prepared.length} edificio${prepared.length===1?'':'s'} alineado${prepared.length===1?'':'s'} con la calle más cercana`);
  }catch(err){toast('Alinear edificios: '+err.message)}};
})();

;

/* interface-v229.js */
/* Reorganiza la interfaz en una barra de dibujo, el mapa y paneles con pestañas.
   Los controles originales se mueven, no se recrean, para conservar sus eventos. */
(() => {
  const start = () => {
    const left = document.querySelector('.left');
    const right = document.getElementById('rightPanel');
    const toolbar = document.querySelector('.toolbar');
    const menu = document.querySelector('.oc-menu');
    if (!left || !right || !toolbar || !menu || document.getElementById('workspaceTabs')) return;

    const makePanel = (id, title) => {
      const panel = document.createElement('section');
      panel.className = 'workspace-panel'; panel.id = id;
      const heading = document.createElement('h2'); heading.className = 'workspace-heading'; heading.textContent = title;
      panel.append(heading); return panel;
    };
    const oldRightChildren=Array.from(right.children);
    const oldLeftChildren=Array.from(left.children);
    const toolGrid=left.querySelector('.tool-grid');
    const symbolPanel = makePanel('symbolsWorkspace', 'Símbolos · paleta OCAD');
    const layersPanel = makePanel('layersWorkspace', 'Capas');
    const propsPanel = makePanel('propertiesWorkspace', 'Propiedades');
    const lidarPanel = makePanel('lidarWorkspace', 'LiDAR');
    const panels = [symbolPanel, layersPanel, propsPanel, lidarPanel];

    const tabs = document.createElement('div'); tabs.className = 'workspace-tabs'; tabs.id = 'workspaceTabs';
    [['symbolsWorkspace','Símbolos'],['layersWorkspace','Capas'],['propertiesWorkspace','Propiedades'],['lidarWorkspace','LiDAR']].forEach(([id,label],i)=>{
      const b=document.createElement('button'); b.type='button'; b.className='workspace-tab'; b.textContent=label;
      b.setAttribute('role','tab'); b.setAttribute('aria-controls',id);
      b.onclick=()=>activate(id); tabs.append(b);
    });
    function activate(id){
      panels.forEach(p=>{const active=p.id===id;p.hidden=!active;p.setAttribute('aria-hidden',String(!active))});
      tabs.querySelectorAll('.workspace-tab').forEach(b=>{const active=b.getAttribute('aria-controls')===id;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active))});
      right.dataset.workspace=id;
    }
    right.replaceChildren(document.getElementById('closeMobilePanels') || document.createElement('span'), tabs, ...panels);
    panels.forEach(p=>right.append(p));

    const move=(node,panel)=>{if(node&&panel)panel.append(node)};
    // Panel de símbolos
    ['#symbolSearch','#symbolTypeFilter','#symbolList','#symbolContextMenu','#activeSymbolLabel','#symbolStatusSelect','#symbolScaleHint'].forEach(sel=>{
      const node=document.querySelector(sel); if(node){
        let holder=node;
        if(node.id==='symbolSearch'||node.id==='symbolTypeFilter') holder=node.closest('.symbol-controls');
        if(node.id==='symbolStatusSelect') holder=node.closest('label');
        if(node.id==='symbolScaleHint') holder=node.closest('.card');
        move(holder,symbolPanel);
      }
    });
    const activeSymbol=document.getElementById('activeSymbolLabel'),symbolList=document.getElementById('symbolList');
    if(activeSymbol&&symbolList)symbolPanel.insertBefore(activeSymbol,symbolList);
    // Conserva la tarjeta de preparación y el editor de vértices en Propiedades.
    const prepCard=document.getElementById('mapPreparationCard');
    if(prepCard){const title=prepCard.querySelector('.card-title')?.textContent.trim()||'Preparar mapa';const body=document.createElement('div');body.className='disclosure-body';Array.from(prepCard.children).slice(1).forEach(node=>body.append(node));const disclosure=document.createElement('details');disclosure.className='workspace-disclosure preparation-disclosure';const summary=document.createElement('summary');summary.textContent=title;disclosure.append(summary,body);prepCard.replaceChildren(disclosure);lidarPanel.append(prepCard)}
    move(document.getElementById('vertexEditor'),propsPanel);
    oldLeftChildren.forEach(node=>{if(node!==toolGrid&&node!==prepCard&&node.parentElement===left)propsPanel.append(node)});
    if(toolGrid){left.replaceChildren(toolGrid);toolGrid.setAttribute('aria-label','Herramientas de dibujo');decorateDrawingTools(toolGrid)}

    // Agrupa las secciones que ya existían en la columna de datos.
    oldRightChildren.forEach(node=>{
      if(node===tabs||panels.includes(node)||node.id==='closeMobilePanels')return;
      if(node.id==='lidarCard'){move(node,lidarPanel);groupLidarControls(node)}
      else if(node.querySelector?.('#templateLayerList, #vectorLayerList'))move(node,layersPanel);
      else move(node,propsPanel);
    });
    const close=document.getElementById('closeMobilePanels'); if(close){close.textContent='✕ Cerrar panel';right.prepend(close)}
    activate('symbolsWorkspace');
    const statusBar=document.querySelector('.canvas-area > .coords');
    if(statusBar)document.querySelector('.app')?.append(statusBar);
    installResponsiveDock();

    // Recupera los menús de edición y vista de la interfaz de escritorio.
    const findMenu=(label)=>Array.from(menu.querySelectorAll('details')).find(d=>d.querySelector('summary')?.textContent.trim()===label);
    const ensureMenu=(label)=>{let d=findMenu(label);if(d)return d;d=document.createElement('details');const s=document.createElement('summary');s.textContent=label;const box=document.createElement('div');box.className='oc-dropdown';d.append(s,box);menu.append(d);return d};
    const menuBox=(label)=>ensureMenu(label).querySelector('.oc-dropdown');
    const editBox=menuBox('EDICIÓN'), viewBox=menuBox('VER'), toolsBox=menuBox('HERRAMIENTAS'), fileBox=menuBox('MAPA');
    const menuActionIds=new Set(['undo','redo','selectAllObjects','duplicateSelected','copySelected','cutSelected','pasteSelected','deleteSelected','clearMap','zoomIn','zoomOut','layersNav','symbolsNav','selectMode','smoothConservative','smoothGeometric','validateGeometry','measureSelection']);
    menu.querySelectorAll('[data-menu-target]').forEach(button=>{if(menuActionIds.has(button.dataset.menuTarget))button.remove()});
    ['#extendDistance','#joinSelectedLines','#createParallel'].forEach(sel=>{const node=document.querySelector(sel);if(node)editBox.append(node.parentElement)});
    ['MAPA','EDICIÓN','VER','HERRAMIENTAS','LIDAR','PLANTILLAS','GPS','CONFIGURACIÓN'].forEach(label=>{const item=findMenu(label);if(item)menu.append(item)});
    const keep=new Set(['undo','redo','finishDraft','deleteSelected','zoomIn','zoomOut','newProject','openProject','restoreLocalBackup','downloadLocalBackup','saveProject','closeProject','saveOmap','saveOcad','exportMap','clearMap']);
    const category=(el)=>{
      const id=el.id||'', text=(el.innerText||el.value||el.title||'').toLowerCase();
      if(/save|open|backup|export|import|project|ocad|geojson|kmz|clearMap/i.test(id+' '+text))return fileBox;
      if(/zoom|scale|grid|view|template|reference|streetview/i.test(id+' '+text))return viewBox;
      if(/select|copy|cut|paste|duplicate|distribut|align|measure|delete|undo|redo|vertex|line|area|curve|stamp|road|width|smooth|simplif|split|join|parallel|extend|segment|rotate|flip|fill/i.test(id+' '+text))return editBox;
      return toolsBox;
    };
    const arrange=()=>Array.from(toolbar.children).forEach(el=>{
      if(el.id==='showMobilePanels'||el.classList.contains('zoom-label')||el.tagName==='SELECT'&&el.hidden)return;
      if(keep.has(el.id)){if(!['undo','redo','finishDraft','deleteSelected','zoomIn','zoomOut'].includes(el.id))el.hidden=true;return;}if(el.classList.contains('hidden-input'))return;
      category(el).append(el);
    });
    arrange();
    new MutationObserver(arrange).observe(toolbar,{childList:true});
    const addAction=(menuName,id,label,parent=null)=>{const box=parent||menuBox(menuName);if(box.querySelector(`[data-menu-target="${id}"], #${id}`))return;const b=document.createElement('button');b.type='button';b.dataset.menuTarget=id;b.textContent=label;box.append(b);return b};
    const addGroup=(menuName,label)=>{const d=document.createElement('details');d.className='oc-submenu';const summary=document.createElement('summary');summary.textContent=label;const box=document.createElement('div');box.className='oc-dropdown';d.append(summary,box);menuBox(menuName).append(d);return box};
    [['MAPA','newProject','Nuevo proyecto'],['MAPA','openProject','Abrir proyecto'],['MAPA','restoreLocalBackup','Abrir copia local reciente'],['MAPA','saveProject','Guardar proyecto'],['MAPA','exportMap','Exportar mapa'],['EDICIÓN','undo','Deshacer'],['EDICIÓN','redo','Rehacer'],['EDICIÓN','selectAllObjects','Seleccionar todo'],['EDICIÓN','duplicateSelected','Duplicar'],['EDICIÓN','copySelected','Copiar'],['EDICIÓN','cutSelected','Cortar'],['EDICIÓN','pasteSelected','Pegar'],['EDICIÓN','deleteSelected','Eliminar selección'],['EDICIÓN','clearMap','Limpiar elementos del mapa'],['VER','zoomIn','Acercar'],['VER','zoomOut','Alejar'],['VER','layersNav','Capas'],['VER','symbolsNav','Símbolos'],['HERRAMIENTAS','selectMode','Herramienta seleccionar'],['HERRAMIENTAS','validateGeometry','Validar geometría'],['HERRAMIENTAS','measureSelection','Medir longitudes y áreas']].forEach(x=>addAction(...x));
    const smoothBox=addGroup('EDICIÓN','Suavizar');addAction('EDICIÓN','smoothConservative','Suavizar conservador',smoothBox);addAction('EDICIÓN','smoothGeometric','Suavizar geométrico',smoothBox);
    const convertBox=addGroup('EDICIÓN','Convertir');
    ['convertToBezier','convertToPolyline','linePattern'].forEach(id=>{const button=document.getElementById(id);if(button)convertBox.append(button)});
    const backup=document.getElementById('backupStatus');
    if(backup){const chip=backup.closest('.save-state');chip?.setAttribute('title',backup.title||backup.textContent);new MutationObserver(()=>chip?.setAttribute('title',backup.title||backup.textContent)).observe(backup,{attributes:true,childList:true,characterData:true});}
    menu.addEventListener('click',event=>{if(event.target.closest('button:not([data-menu-target])'))queueMicrotask(()=>menu.querySelectorAll('details[open]').forEach(item=>item.open=false))});
    toolbar.querySelectorAll('.mobile-panel-button').forEach(b=>b.textContent='☰ Paneles');
  };

  function decorateDrawingTools(grid){
    const drawings={
      select:'<path d="M5 3v18l5-5 3 5 3-1-3-5 7-2z" fill="currentColor" stroke="none"/>',
      'select-rect':'<rect x="3" y="4" width="18" height="16" rx="2" stroke-dasharray="4 3"/><path d="M14 17l4 4"/>',
      point:'<circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>',
      line:'<path d="M4 19l6-11 5 6 5-9"/><circle cx="4" cy="19" r="1.6" fill="currentColor"/><circle cx="10" cy="8" r="1.6" fill="currentColor"/><circle cx="15" cy="14" r="1.6" fill="currentColor"/><circle cx="20" cy="5" r="1.6" fill="currentColor"/>',
      'continue-line':'<path d="M3 18l7-8 5 5 6-8m-6 0h6v6"/><circle cx="3" cy="18" r="1.5" fill="currentColor"/>',
      area:'<path d="M5 6l9-3 7 6-2 10-11 2-5-8z" fill="currentColor" fill-opacity=".16"/><circle cx="5" cy="6" r="1.4" fill="currentColor"/><circle cx="19" cy="19" r="1.4" fill="currentColor"/>',
      'expand-area':'<path d="M3 9l8-6 8 5-2 10-8 3-6-6z" fill="currentColor" fill-opacity=".12"/><path d="M13 16l8 5m-1-6l1 6-6-1"/>',
      'curve-line':'<path d="M3 18C8 18 7 5 13 7s4 10 8 3"/><circle cx="3" cy="18" r="1.6" fill="currentColor"/><circle cx="21" cy="10" r="1.6" fill="currentColor"/>',
      'curve-area':'<path d="M4 13C3 5 12 2 18 6c6 5 1 14-7 14-4 0-7-2-7-7z" fill="currentColor" fill-opacity=".13"/><circle cx="4" cy="13" r="1.4" fill="currentColor"/>',
      freehand:'<path d="M3 17c3-12 4 7 7-4s4 6 6-3 2 4 5-5"/><path d="M17 19l4 2"/>'
    };
    for(const button of grid.querySelectorAll('.tool')){
      const mark=button.querySelector('b'),art=drawings[button.dataset.tool];if(!mark||!art)continue;
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
      svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
      svg.setAttribute('stroke-width','2.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
      svg.innerHTML=art;mark.replaceChildren(svg);
      button.setAttribute('aria-label',button.querySelector('span')?.textContent.trim()||button.dataset.tool);
      button.title=button.getAttribute('aria-label');
    }
  }
  function groupLidarControls(card){
    if(!card||card.querySelector('.lidar-disclosure'))return;
    const heading=card.querySelector(':scope > .card-title');
    const children=Array.from(card.children);
    const title=(text)=>children.find(n=>n.classList?.contains('card-title')&&n.textContent.includes(text));
    const node=(id)=>card.querySelector('#'+id);
    const groups=[
      {label:'1 · Cargar datos LiDAR',start:node('pointFile')?.previousElementSibling,end:node('lidarProgress'),open:true},
      {label:'2 · Ajustes de detección',start:node('lidarProgress')?.nextElementSibling,end:node('detectBtn')},
      {label:'3 · Terreno, curvas y vaguadas',start:node('terrainBtn'),end:title('Indicadores LiDAR de vegetación')?.previousElementSibling},
      {label:'4 · Vegetación por alturas',start:title('Indicadores LiDAR de vegetación'),end:title('IA por ejemplos de vegetación')?.previousElementSibling},
      {label:'5 · Aprender vegetación por ejemplos',start:title('IA por ejemplos de vegetación'),end:node('vectorizeStructures')?.previousElementSibling},
      {label:'6 · Edificios, muros y rocas',start:node('vectorizeStructures'),end:title('Claros y arbolado alto')?.previousElementSibling},
      {label:'7 · Claros, árboles e imágenes',start:title('Claros y arbolado alto'),end:node('detectAllLidarElements')?.previousElementSibling},
      {label:'8 · Revisar y exportar candidatos',start:node('detectAllLidarElements'),end:children.at(-1)}
    ].filter(g=>g.start&&g.end);
    groups.sort((a,b)=>children.indexOf(b.start)-children.indexOf(a.start)).forEach(group=>{
      const first=children.indexOf(group.start),last=children.indexOf(group.end);if(first<0||last<first)return;
      const details=document.createElement('details');details.className='workspace-disclosure lidar-disclosure';details.open=!!group.open;
      const summary=document.createElement('summary');summary.textContent=group.label;
      const body=document.createElement('div');body.className='disclosure-body';details.append(summary,body);
      card.insertBefore(details,group.start);children.slice(first,last+1).forEach(child=>body.append(child));
    });
    if(heading)heading.after(...Array.from(card.querySelectorAll(':scope > .lidar-disclosure')));
  }
  function installResponsiveDock(){
    const button=document.getElementById('showMobilePanels'),close=document.getElementById('closeMobilePanels');
    button?.addEventListener('click',()=>document.body.classList.add('show-right'));
    close?.addEventListener('click',()=>document.body.classList.remove('show-right'));
    document.addEventListener('keydown',event=>{if(event.key==='Escape')document.body.classList.remove('show-right')});
    const update=()=>document.documentElement.style.setProperty('--app-topbar-height',`${document.querySelector('.topbar')?.getBoundingClientRect().height||54}px`);
    update(); if(window.ResizeObserver){const observer=new ResizeObserver(update);const topbar=document.querySelector('.topbar');if(topbar)observer.observe(topbar)}else window.addEventListener('resize',update,{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();

;

/* v277: polygon zone selection */
(()=>{
  const bar=document.querySelector('.toolbar');
  if(!bar||document.getElementById('markZone'))return;
  const button=document.createElement('button');button.id='markZone';button.type='button';button.className='action';button.textContent='Marcar zona';button.title='Dibuja un polígono para delimitar la zona de consulta';
  button.onclick=()=>{try{if(typeof setTool!=='function')throw Error('Herramienta de área no disponible');setTool('area');button.classList.add('primary');button.setAttribute('aria-pressed','true');toast('Haz clic en los vértices y doble clic para cerrar el polígono');}catch(err){toast('No se pudo activar Marcar zona: '+err.message)}};
  bar.appendChild(button);
})();


/* v277: zone source catalogue */
(()=>{
  const providers=[
    ['IGN/CNIG','state','orthophoto, lidar, dem, topography','WMS, WMTS, LAZ, ASC, GeoTIFF'],
    ['PNOA','state','orthophoto, lidar','WMS, WMTS, LAZ, COG'],
    ['CartoCiudad','state','topography, roads, addresses','WMS, WFS'],
    ['OpenStreetMap','community','roads, buildings, landuse, water','Overpass, GeoJSON'],
    ['mapant.es','community','orienteering-map, topography, roads, landuse','web-map, vector-data'],
    ['IDE Andalucía','autonomous','orthophoto, lidar, dem, topography','WMS, WMTS, WFS']
  ];
  const key=f=>JSON.stringify((f.points||[]).map(p=>[Math.round((p.x||0)*1000),Math.round((p.y||0)*1000)]));
  let last='';
  function show(f){
    const box=document.getElementById('mapPreparationSources');if(!box||!f||f.type!=='area'||!Array.isArray(f.points)||f.points.length<3)return;
    const id=key(f);if(id===last)return;last=id;
    box.className='source-zone-results';box.replaceChildren();
    const title=document.createElement('strong');title.textContent=`Fuentes disponibles en la zona (${f.points.length} vértices)`;box.append(title);
    const list=document.createElement('div');list.className='zone-source-list';
    for(const [name,owner,data,formats] of providers){const card=document.createElement('div');card.className='zone-source-card';card.innerHTML=`<strong>${name}</strong><span>${owner} · ${data}</span><small>${formats}</small>`;list.append(card)}
    box.append(list);const status=document.getElementById('mapPreparationStatus');if(status)status.textContent='Zona marcada. Se muestran las fuentes cartográficas que pueden consultarse para esta extensión.';
  }
  setInterval(()=>{const f=window.S?.selection?.collection==='feature'?window.S.features?.[window.S.selection.index]:window.S?.features?.at(-1);show(f)},500);
})();
