/* Ocarto v26. LAS/LAZ-class-driven artificial feature proposals.
 * Buildings class 6, wire conductors class 14, transmission towers class 15.
 * No unsupported semantic inference from unclassified points.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoStructures=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function extract(rows,cell,opts={}){
 const v=typeof require==='function'?require('./vectorize-vegetation.js'):globalThis.OcartoVegetationVector;
 if(!v||typeof v.vectorize!=='function')throw Error('Falta motor de vectorización de polígonos');
 const minRoof=Number(opts.minRoofPoints??2),minRoofArea=Number(opts.minRoofArea??35),minWire=Number(opts.minWirePoints??1),minWireLength=Number(opts.minWireLength??20);
 if(!Number.isInteger(minRoof)||minRoof<1||minRoof>100||!Number.isFinite(minRoofArea)||minRoofArea<0||!Number.isInteger(minWire)||minWire<1||minWire>100||!Number.isFinite(minWireLength)||minWireLength<0)throw Error('Parámetros de estructuras inválidos');
 const structures=v.vectorize(rows,cell,{minArea:minRoofArea,labeler:r=>Number(r.building_points||0)>=minRoof?'edificio-candidato':null});
 const buildings=structures.features.map(f=>({...f,properties:{...f.properties,kind:'edificio-candidato-por-clase-lidar',building_class:6,source:'LAS clase 6',confidence:'clasificacion-lidar-sin-verificar',required_confirmation:'Ortofoto, planta real, cerramientos, fecha del vuelo',map_symbol:null,review_required:true,apply_automatically:false}}));
 const candidates=new Map();for(const r of rows){if(Number(r.wire_points||0)>=minWire){const i=Math.round(r.x/cell-.5),j=Math.round(r.y/cell-.5);candidates.set(i+','+j,{i,j,x:r.x,y:r.y,n:r.wire_points})}}
 const dirs=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]],adj=new Map();for(const [k,p] of candidates){const ns=[];for(const [dx,dy] of dirs){const id=(p.i+dx)+','+(p.j+dy);if(candidates.has(id))ns.push(id)}adj.set(k,ns)}
 const seen=new Set(),wires=[];
 function farthest(start,set){const distance=new Map([[start,0]]),predecessor=new Map(),todo=[start];let far=start;while(todo.length){const k=todo.shift(),p=candidates.get(k);if(distance.get(k)>distance.get(far))far=k;for(const next of adj.get(k)){if(!set.has(next)||distance.has(next))continue;const q=candidates.get(next);distance.set(next,distance.get(k)+Math.hypot(p.x-q.x,p.y-q.y));predecessor.set(next,k);todo.push(next)}}return{far,distance,predecessor}}
 for(const k of candidates.keys())if(!seen.has(k)){const connected=new Set(),todo=[k];seen.add(k);while(todo.length){const q=todo.pop();connected.add(q);for(const n of adj.get(q))if(!seen.has(n)){seen.add(n);todo.push(n)}}if(connected.size<2)continue;const p=farthest(k,connected),q=farthest(p.far,connected);if((q.distance.get(q.far)||0)<minWireLength)continue;const coords=[],walk=new Set();let cur=q.far;while(cur&&!walk.has(cur)){walk.add(cur);const c=candidates.get(cur);coords.push([c.x,c.y]);cur=q.predecessor.get(cur)}coords.reverse();wires.push({type:'Feature',properties:{kind:'tendido-electrico-candidato-por-clase-lidar',source:'LAS clase 14',approx_length_m:+(q.distance.get(q.far)||0).toFixed(1),confidence:'clasificacion-lidar-sin-verificar',review_required:true,apply_automatically:false,warning:'Eje aproximado por centroides de celdas: revisar cableado, apoyos y trazado real.'},geometry:{type:'LineString',coordinates:coords}})}
 const towers=rows.filter(r=>Number(r.tower_points||0)>=1).map(r=>({type:'Feature',properties:{kind:'apoyo-electrico-candidato-por-clase-lidar',source:'LAS clase 15',points:r.tower_points,review_required:true,apply_automatically:false,warning:'Centro de celda, no posición topográfica del poste medida.'},geometry:{type:'Point',coordinates:[r.x,r.y]}}));
 return{type:'FeatureCollection',name:'Ocarto v26 - elementos artificiales LiDAR para revisión',properties:{cellSize:cell,buildings:buildings.length,power_lines:wires.length,power_tower_cells:towers.length,methods:'Clases LAS 6,14,15; no infiere objetos ausentes de las clases',needsOrthophotoReview:true},features:[...buildings,...wires,...towers]};
}
return{extract};
});
