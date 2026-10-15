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
