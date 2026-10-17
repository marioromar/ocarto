'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const line = start => {
  const found = source.split('\n').find(text => text.trim().startsWith(start));
  assert.ok(found, 'Missing function: ' + start);
  return found;
};

// Interactive Bézier drag uses pointer displacement instead of ignoring the drag.
{
  const S = {
    zoom: 2,
    draft: {drawingMode:'bezier',points:[{x:0,y:0},{x:10,y:15,vertexType:'corner'}]},
    drag: {mode:'bezier-draw',pointerType:'mouse',vertexIndex:1,startClientX:100,startClientY:200,moved:false}
  };
  const fn = vm.runInNewContext(line('function updateBezierDraftHandle(e)') + '\nupdateBezierDraftHandle', {S});
  assert.equal(fn({clientX:103,clientY:201}), false, 'A small click must remain a corner');
  assert.equal(S.draft.points[1].outTangent, undefined);
  assert.equal(fn({clientX:140,clientY:220}), true);
  assert.equal(JSON.stringify(S.draft.points[1].outTangent), JSON.stringify({x:20,y:10}));
  assert.equal(JSON.stringify(S.draft.points[1].inTangent), JSON.stringify({x:-20,y:-10}));
  assert.equal(S.draft.points[1].vertexType,'normal');
}

// Offset features still allow direct handle selection.
{
  const S={
    zoom:1,sendToMapMode:false,lastPointerType:'mouse',
    selection:{collection:'feature',index:0},
    features:[{type:'line',symbol:'line',x:100,y:50,points:[
      {x:0,y:0,outTangent:{x:25,y:0}}, {x:60,y:0}
    ]}],candidates:[]
  };
  const context={
    S,
    vectorLayerFor:()=>({visible:true,referenceOnly:false}),
    symbolStatus:()=> 'normal',
    vertexHitRadius:()=>9,
    featureHitRadius:()=>8,
    sampledPoints:()=>[],
  };
  vm.runInNewContext(line('function tangentHandles(q)'),context);
  const hit = vm.runInNewContext(line('function hitTest(p,allowVertex=true)')+'\nhitTest({x:125,y:50})',context);
  assert.equal(hit.collection,'feature');
  assert.equal(hit.tangentIndex,0);
  assert.equal(hit.tangentSide,'out');
}
assert.match(source, /mode:'bezier-draw',vertexIndex:S\.draft\.points\.length-1/, 'Pointer down must start handle drag');
assert.match(source, /newFeature\.points=d\.points\.map\(q=>\(\{\.\.\.q,vertexType:/, 'Finishing must keep tangents');
assert.doesNotMatch(source, /for\(let i=0;i<n;i\+\+\)\{const q=pts\[i\],prev=pts/, 'Finishing must not overwrite hand-drawn tangents');
assert.match(source, /canvas\.dispatchEvent\(new MouseEvent\('dblclick'.*?\)\);return\}const now=performance\.now\(\)/, 'Clicking first point must close area');
console.log('Bézier drawing and editing regression checks: OK');
