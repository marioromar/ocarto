/* Minimal KML vector importer. Converts Placemark geometries into GeoJSON WGS84. */
(function(root){
  'use strict';
  const geometryNames=new Set(['Point','LineString','Polygon','MultiGeometry']);
  const children=node=>Array.from(node?.children||[]);
  const named=(node,name)=>children(node).filter(child=>child.localName===name);
  const descendants=(node,name,out=[])=>{for(const child of children(node)){if(child.localName===name)out.push(child);descendants(child,name,out)}return out};
  function coordinates(node){
    const raw=(node?.textContent||'').trim();if(!raw)return null;
    const tuples=raw.split(/\s+/).map(tuple=>tuple.split(',').map(Number));
    if(!tuples.length||tuples.some(c=>c.length<2||!Number.isFinite(c[0])||!Number.isFinite(c[1])||c[0]<-180||c[0]>180||c[1]<-90||c[1]>90||c.slice(2).some(v=>!Number.isFinite(v))))return null;
    return tuples;
  }
  function parseGeometry(node){
    if(node.localName==='Point'){const c=coordinates(named(node,'coordinates')[0]);return c?.length===1?{type:'Point',coordinates:c[0]}:null}
    if(node.localName==='LineString'){const c=coordinates(named(node,'coordinates')[0]);return c?.length>=2?{type:'LineString',coordinates:c}:null}
    if(node.localName==='Polygon'){
      const outer=named(node,'outerBoundaryIs').map(n=>descendants(n,'coordinates')[0]).map(coordinates)[0];
      if(!outer||outer.length<4||outer[0][0]!==outer.at(-1)[0]||outer[0][1]!==outer.at(-1)[1])return null;
      const holes=named(node,'innerBoundaryIs').map(n=>coordinates(descendants(n,'coordinates')[0])).filter(r=>r&&r.length>=4&&r[0][0]===r.at(-1)[0]&&r[0][1]===r.at(-1)[1]);
      return{type:'Polygon',coordinates:[outer,...holes]};
    }
    return null;
  }
  function parseKmlDocument(doc){
    const rootNode=doc?.documentElement;if(!rootNode||rootNode.localName!=='kml')throw Error('El archivo no contiene un documento KML válido');
    const features=[];
    for(const placemark of descendants(rootNode,'Placemark')){
      const name=named(placemark,'name')[0]?.textContent?.trim()||'';
      const geometries=children(placemark).filter(n=>geometryNames.has(n.localName));
      const flatten=node=>node.localName==='MultiGeometry'?children(node).filter(n=>geometryNames.has(n.localName)).flatMap(flatten):[node];
      for(const node of geometries.flatMap(flatten)){const geometry=parseGeometry(node);if(geometry)features.push({type:'Feature',properties:{name},geometry})}
    }
    if(!features.length)throw Error('El KML no contiene puntos, líneas o polígonos válidos');
    return{type:'FeatureCollection',metadata:{crs:'EPSG:4326'},features};
  }
  async function extractKmzKml(file,zipApi){
    const maxArchiveBytes=100*1024*1024,maxKmlBytes=25*1024*1024;
    if(!file||!Number.isFinite(file.size)||file.size<1||file.size>maxArchiveBytes)throw Error('El KMZ debe ocupar menos de 100 MB');
    if(!zipApi||typeof zipApi.loadAsync!=='function')throw Error('No está disponible el lector de archivos KMZ');
    const zip=await zipApi.loadAsync(await file.arrayBuffer());
    const entries=Object.values(zip.files||{}).filter(entry=>!entry.dir&&/\.kml$/i.test(entry.name));
    if(!entries.length)throw Error('El KMZ no contiene ningún archivo KML');
    const preferred=entries.find(entry=>entry.name.toLowerCase()==='doc.kml')||entries.find(entry=>/(^|\/)doc\.kml$/i.test(entry.name));
    const entry=preferred|| (entries.length===1?entries[0]:null);
    if(!entry)throw Error('El KMZ contiene varios KML y no incluye un doc.kml identificable');
    const expandedSize=entry._data?.uncompressedSize;
    if(Number.isFinite(expandedSize)&&expandedSize>maxKmlBytes)throw Error('El KML del KMZ supera el límite de 25 MB');
    const text=await entry.async('string');
    if(new TextEncoder().encode(text).byteLength>maxKmlBytes)throw Error('El KML del KMZ supera el límite de 25 MB');
    return text;
  }
  root.OcartoKml={parseKmlDocument,extractKmzKml};
})(typeof globalThis!=='undefined'?globalThis:this);
