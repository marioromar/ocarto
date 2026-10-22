'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const auto=require('../lidar-auto-natural-bezier.js');
const transport=require('../lidar-transport-water.js');

const rectangle=(x,y,w,h)=>[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
const area=(points,extras={})=>({type:'area',symbol:'vegetation',points,...extras});
const hasHandles=f=>f.points?.some(p=>p.tangent||p.inTangent||p.outTangent);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

test('vegetación: crea Bézier nativo editable, sin mover los vértices originales',()=>{
 const feature=area(rectangle(10,20,12,7)),before=JSON.stringify(feature);
 const result=auto.apply(feature,{level:'medium',gridSizeLocal:1});
 assert.equal(result.curve,'bezier');
 assert.equal(result.naturalCurve,'cubic-bezier');
 assert.equal(result.autoCurveValidated,true);
 assert(hasHandles(result));
 assert.equal(JSON.stringify(feature),before,'La geometría original no debe cambiar');
 assert.deepEqual(result.points.map(p=>[p.x,p.y]),feature.points.map(p=>[p.x,p.y]));
 const sampled=auto.flatten(result.points,true).sample;
 assert(sampled.some(q=>!feature.points.some(p=>distance(p,q)<1e-5)),
  'Debe haber puntos curvos intermedios, no solo segmentos originales');
});

test('agua: conserva un agujero interior y verifica la topología',()=>{
 const feature=area(rectangle(0,0,40,35),{
  candidateKind:'agua-superficie-candidata-clase9-lidar',
  holes:[rectangle(10,10,5,5)]});
 const result=auto.apply(feature,{level:'high',gridSizeLocal:1});
 assert.equal(result.curve,'bezier');
 assert.equal(result.holes.length,1);
 assert(result.holes[0].some(p=>p.tangent));
 assert.equal(auto.validShape(result,true,1.5),true);
});

test('los edificios, las ruinas, muros y elementos artificiales siguen rectos',()=>{
 for(const kind of ['edificio-candidato','ruina','muro-o-escarpe-candidato','tendido-electrico-candidato']){
  const f={type:'area',symbol:'vegetation',candidateKind:kind,points:rectangle(0,0,8,6)};
  assert.equal(auto.apply(f,{level:'high'}),f,kind);
 }
});

test('el camino natural pasa a curva editable; los extremos siguen en su lugar',()=>{
 const f={type:'line',symbol:'path',candidateKind:'posible-camino-por-ortofoto',
  points:[{x:0,y:0},{x:8,y:0},{x:13,y:5},{x:21,y:9}]};
 const r=auto.apply(f,{level:'medium',gridSizeLocal:2});
 assert.equal(r.curve,'bezier');
 assert(hasHandles(r));
 assert.deepEqual(r.points[0].x,f.points[0].x);
 assert.deepEqual(r.points.at(-1).y,f.points.at(-1).y);
});

test('el nivel de suavizado modifica manejadores sin tocar la forma base',()=>{
 const f=area(rectangle(0,0,15,12));
 const low=auto.apply(f,{level:'low',gridSizeLocal:2});
 const high=auto.apply(f,{level:'high',gridSizeLocal:2});
 assert.equal(low.curve,'bezier');assert.equal(high.curve,'bezier');
 const magnitude=p=>Math.hypot(p.tangent?.x||0,p.tangent?.y||0);
 assert(magnitude(low.points[0])<magnitude(high.points[0]));
 assert.deepEqual(low.points.map(p=>[p.x,p.y]),high.points.map(p=>[p.x,p.y]));
});

test('mantiene vértices marcados como esquina y curvas preexistentes',()=>{
 const f=area(rectangle(0,0,10,8));
 f.points[0].vertexType='corner';
 const out=auto.apply(f,{level:'high',gridSizeLocal:1});
 assert.equal(out.points[0].vertexType,'corner');
 assert.equal(out.points[0].tangent,undefined);
 const existing={...f,curve:'bezier'};
 assert.equal(auto.apply(existing),existing);
});

test('regresión v283: un contorno de 3.000 vértices conserva huecos y se curva',()=>{
 const circle=(n,r,x=0,y=0)=>Array.from({length:n},(_,i)=>{
  const a=2*Math.PI*i/n;return{x:x+r*Math.cos(a),y:y+r*Math.sin(a)};
 });
 const outline=circle(3000,150);
 const f=area(outline,{holes:[circle(96,12)],candidateKind:'agua-superficie-candidata-clase9-lidar'});
 const before=JSON.stringify(f);
 const out=auto.apply(f,{level:'medium',gridSizeLocal:1});
 assert.equal(out.curve,'bezier','Los polígonos grandes ya no deben rechazarse por el límite antiguo de 2300 puntos muestreados');
 assert.equal(out.holes.length,1);
 assert.equal(out.points.length,3000);
 assert(out.autoCurveValidated);
 assert.equal(JSON.stringify(f),before,'El original no puede sufrir mutaciones');
});

test('un polígono natural muy extenso se puede curvar sin comprobación cuadrática',()=>{
 const n=8000,r=200,points=Array.from({length:n},(_,i)=>({
  x:r*Math.cos(2*Math.PI*i/n),y:r*Math.sin(2*Math.PI*i/n)
 }));
 const f=area(points);
 const out=auto.apply(f,{level:'low',gridSizeLocal:1});
 assert.equal(out.curve,'bezier','Los contornos extensos necesitan validación espacial');
 assert.equal(out.points.length,n);
 assert(out.points.some(p=>p.tangent));
});

test('geometría excesivamente grande mantiene el trazado original y sus huecos',()=>{
 const n=18000,r=200,points=Array.from({length:n},(_,i)=>({
  x:r*Math.cos(2*Math.PI*i/n),y:r*Math.sin(2*Math.PI*i/n)
 }));
 const f=area(points,{holes:[rectangle(45,45,6,6)]});
 const out=auto.apply(f,{level:'high',gridSizeLocal:1});
 assert(!out.curve,'Si rebasa el presupuesto seguro se deja la forma original');
 assert(out.autoCurveWarning);
 assert.equal(out.points.length,f.points.length);
 assert.equal(out.holes.length,1);
});

test('polígono autointersecado y hueco fuera del contorno no se aprueban',()=>{
 const crossing=area([{x:0,y:0},{x:10,y:10},{x:0,y:10},{x:10,y:0}]);
 const out=auto.apply(crossing,{level:'medium',gridSizeLocal:1});
 assert(!out.curve);
 assert(out.autoCurveWarning);
 const badHole=area(rectangle(0,0,12,12),{holes:[rectangle(20,20,4,4)]});
 const outHole=auto.apply(badHole,{level:'medium',gridSizeLocal:1});
 assert(!outHole.curve);
 assert.equal(outHole.holes.length,1);
});

test('integración: importaciones y candidatos usan el motor, conservando el original',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert(html.includes('<script src="lidar-auto-natural-bezier.js"></script>'));
 assert(html.includes('id="autoVectorCurveLevel"'));
 assert(html.includes('function autoCurveForDetected('));
 assert(html.includes("prepared.features=prepared.features.map(f=>autoCurveForDetected(f,cell))"));
 assert(html.includes('objects.push({...autoCurveForDetected(obj,'));
 assert(html.includes('converted.objects=converted.objects.map(f=>autoCurveForDetected(f,cell))'));
 assert(html.includes('S.candidates=[...S.candidates,...staged]'));
 assert(html.includes("if(!S.candidates.length)return;"));
 assert(html.includes('id="acceptDetections"'));
 assert(html.includes('id="acceptDetectionsEditable"'));
 assert(html.includes('curveCount=fresh.filter(f=>f.curve'));
 assert(html.includes('contornos originales conservados por seguridad'));
});

test('salida de agua clase 9 del detector anterior puede suavizarse sin perder el hueco',()=>{
 const rows=[];for(let y=0;y<10;y++)for(let x=0;x<10;x++)if(x<3||x>5||y<3||y>5)rows.push({
  x:x+.5,y:y+.5,water_points:1,road_points:0});
 const fc=transport.detect(rows,1,{minWaterArea:2});
 assert.equal(fc.features.length,1);
 const coords=fc.features[0].geometry.coordinates.map(r=>r.slice(0,-1).map(([x,y])=>({x,y})));
 const feature=area(coords[0],{holes:coords.slice(1),candidateKind:'agua-superficie-candidata-clase9-lidar'});
 const out=auto.apply(feature,{level:'medium',gridSizeLocal:1});
 assert.equal(out.curve,'bezier');
 assert.equal(out.holes.length,1);
 assert(out.autoCurveValidated);
});
