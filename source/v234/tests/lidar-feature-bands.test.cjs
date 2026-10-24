'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const api=require('../lidar-feature-bands.js');
test('reconoce franjas independientes, 0–5 cm y el combinado sin confundirlas',()=>{
 for(const b of api.bands){
  assert.equal(api.detect('/Bobadilla_Feature_Map/'+b.stem+'.png')?.id,b.id);
  assert.equal(api.detect(b.stem+'.pgw')?.id,b.id);
 }
 assert.equal(api.detect('feature_00_05_02_00m_05m.png')?.id,'combined');
 assert.equal(api.detect('feature_map_banda_0_sin_sombreado.png')?.id,'banda_0');
 assert.equal(api.detect('feature_map_banda_2_sin_sombreado.png')?.id,'banda_2');
 assert.equal(api.detect('alturas_vegetacion_referencia_05m.png'),null);
 assert.equal(api.detect('feature_sin_clasificar_00_05_02_00m_05m.png'),null);
});
test('las capas Feature Map quedan encima del relieve pero bajo alturas de vegetación',()=>{
 const old=[{name:'alturas_vegetacion_referencia_05m.png'}, {name:'relieve.png'},
 {name:'feature_00_05_00_30m_05m.png',featureMapBand:'05_30'},
 {name:'feature_01_00_02_00m_05m.png',featureMapBand:'100_200'}];
 assert.deepEqual(api.displayOrder(old).map(x=>x.name),
 ['relieve.png','feature_00_05_00_30m_05m.png','feature_01_00_02_00m_05m.png','alturas_vegetacion_referencia_05m.png']);
 const legacy=[{name:'A'},{name:'B'}];
 assert.equal(api.displayOrder(legacy),legacy);
});
test('el negro se aplica sin alterar la imagen original y respeta el canal alfa',()=>{
 const ops=[],ctx={drawImage:(...v)=>ops.push(['image',...v]),
 fillRect:(...v)=>ops.push(['fill',...v]),set globalCompositeOperation(v){ops.push(['blend',v])},
 set fillStyle(v){ops.push(['color',v])}};
 const canvas={getContext:()=>ctx};
 const input={width:8,height:5};
 const result=api.blackTint(input,()=>canvas);
 assert.equal(result,canvas);assert.equal(canvas.width,8);assert.equal(canvas.height,5);
 assert.deepEqual(ops.map(x=>x[0]),['image','blend','color','fill','blend']);
 assert(ops.some(x=>x[0]==='blend'&&x[1]==='source-in'));
 assert(ops.some(x=>x[0]==='color'&&x[1]==='#000000'));
 assert.equal(input.width,8);assert.equal(input.height,5);
});

test('Feature Map v287: reconoce nombres reales de teselas y color por altura',()=>{
 assert.equal(api.detect('tesela_001_001_feature_map_banda_2_sin_sombreado.png')?.id,'banda_2');
 assert.equal(api.detect('feature_map_banda_0_sin_sombreado.png')?.title,'0–5 cm · diagnóstico de suelo');
 assert.equal(api.detectVegetation('tesela_002_003_altura_vegetacion_banda_4.png'),4);
 assert.equal(api.isReliefTemplate({name:'sombreado_relieve_NW.png'}),true);
 assert.equal(api.isReliefTemplate({name:'alturas_de_vegetación.png'}),false);
 assert.equal(api.colorForBand('banda_2'),'#ec8c43');
 assert.equal(api.colorForBand('combined'),null);
 const ctxLog=[];
 const ctx={
  drawImage:(...args)=>ctxLog.push(['drawImage',...args]),
  fillRect:(...args)=>ctxLog.push(['fillRect',...args]),
  set globalCompositeOperation(x){ctxLog.push(['mode',x])},
  set fillStyle(x){ctxLog.push(['color',x])}
 };
 const target={getContext:()=>ctx},img={width:4,height:3};
 assert.equal(api.tint(img,api.colorForBand('banda_2'),()=>target),target);
 assert.deepEqual(ctxLog.map(x=>x[0]),['drawImage','mode','color','fillRect','mode']);
 assert.equal(ctxLog.find(x=>x[0]==='color')[1],'#ec8c43');
 assert.equal(ctxLog.find(x=>x[0]==='mode')[1],'source-in');
 assert.equal(img.width,4);assert.equal(img.height,3);
});
