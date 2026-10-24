'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const context={console,Map,Set,Math,Number,Array,Float64Array,Int32Array,Infinity};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../ocarto-runtime-v248-3.js'),'utf8'),context);
const api=context.OcartoValleyExtend;

test('acentuación: solo acepta ejes LiDAR revisables con longitud y encajamiento mínimos',()=>{
 const candidate={kind:'arroyo-canal-surco-candidato',review_required:true,length_m:24.5,incision_median_m:.75};
 assert.deepEqual(JSON.parse(JSON.stringify(api.validateCandidate(candidate))),{length_m:24.5,incision_median_m:.75});
 assert.throws(()=>api.validateCandidate({...candidate,length_m:19.9}),/mínimo configurado/);
 assert.throws(()=>api.validateCandidate({...candidate,incision_median_m:.59}),/poco pronunciada/);
 assert.throws(()=>api.validateCandidate({length_m:40,incision_median_m:1}),/detectada por LiDAR/);
});

test('acentuación: permite ajustar longitud e incidencia desde los controles',()=>{
 const candidate={kind:'arroyo-canal-surco-candidato',review_required:true,length_m:25,incision_median_m:.65};
 assert.throws(()=>api.validateCandidate(candidate,{minLength:30,minIncision:.7}),/mínimo configurado/);
 assert.deepEqual(JSON.parse(JSON.stringify(api.validateCandidate(candidate,{minLength:20,minIncision:.6}))),{length_m:25,incision_median_m:.65});
});

test('la interfaz conecta el botón a la validación y muestra el flujo de acentuación',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(html,/id="extendValleyToContour"[^>]*>Acentuar vaguada detectada hasta curva de 1 m/);
 assert.match(html,/OcartoValleyExtend\.validateCandidate\(f\.lidarProperties,\{minLength,minIncision\}\)/);
 assert.match(html,/Math\.floor\(nearest\.z\/1\)\+1/);
});
