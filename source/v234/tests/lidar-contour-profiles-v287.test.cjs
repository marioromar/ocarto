'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const model=require('../lidar-contour-profiles-v287.js');
test('seis perfiles cartográficos independientes 5, 3, 1 y 0,5 metros',()=>{
 assert.deepEqual(model.profiles.map(p=>p.interval),[5,3,1,1,.5,.5]);
 assert.deepEqual(model.profiles.map(p=>p.smoothed),[true,true,false,true,false,true]);
 assert.equal(model.options(model.profiles[2],.5),null);
 assert.equal(model.options(model.profiles[4],.5),null);
 assert.deepEqual(model.options(model.profiles[1],.5),{
  intensity:12,protectedAngle:55,maxShift:.1
 });
});
test('exporta perfiles separados sin modificar MDT ni archivo de curvas previo',async()=>{
 const calls=[],original={state:'complete',cellTerrain:.5},manifest={...original};
 const folder={},api={exportGeojson:async(_folder,_manifest,name,interval,opts)=>{
  calls.push({name,interval,opts});opts.onProgress?.({completed:1,total:1,lines:2});
  return {name,features:2,interval_m:interval};
 }};
 const connect=()=>{},smooth=()=>{},states=[];
 const outputs=await model.exportSet(folder,manifest,api,{connect,smooth,onProgress:p=>states.push(p.stage)});
 assert.equal(outputs.length,6);
 assert.equal(new Set(calls.map(c=>c.name)).size,6);
 assert.equal(calls[2].opts.smooth,null);
 assert.equal(calls[4].opts.smooth,null);
 assert(calls[0].opts.smooth.intensity>0);
 assert.equal(calls[0].opts.smoothFn,smooth);
 assert.deepEqual(original,{state:'complete',cellTerrain:.5});
 assert.equal(states.filter(s=>s==='done').length,6);
});
