const assert=require('node:assert/strict'),fs=require('node:fs'),M=require('../vegetation-learning.js');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
const save=html.match(/\$\('saveProject'\)\.onclick=\(\)=>\{try\{const project=(\{[\s\S]*?\});download\(project,/);
assert.ok(save,'project save handler found');
const saveHandler=new Function('S','reusableVegetationModel','download','toast','$',`return ${save[1]}`);
// Assert project shape without invoking browser download.
const fake={projectName:'Mapa pruebas',features:[],candidates:[],templates:[],zoom:1,panX:0,panY:0,georef:null,mapScale:'10000',freehandTolerance:1.5,snapVertices:false,mapCrs:'',controlPoints:[],cloudTransform:null,vectorLayers:[],activeLayerId:'cartography',activeTemplateId:null,template:null,cloudName:'',symbolOverrides:{},symbolStates:{},symbol:'tree'};
const training=[];for(let i=0;i<10;i++)for(let j=0;j<5;j++){const tall=i<5,h=tall?10:2;training.push({x:i+.5,y:j+.5,ground_points:4,vegetation_points:20,vegetation_return_fraction:tall?.7:.2,canopy_max_above_ground_m:h,canopy_mean_above_ground_m:h*.6,low_veg_points:2,medium_veg_points:3,high_veg_points:15})}
const model=M.train(training,[{label:'verde3',coordinates:[[[0,0],[5,0],[5,5],[0,5]]]},{label:'matorral',coordinates:[[[5,0],[10,0],[10,5],[5,5]]]}]);
const stored=model.toJSON();assert.deepEqual(M.fromJSON(stored).toJSON(),stored,'project persistence roundtrip');
const withoutModel={format:'ocarto-project',version:1,features:[],candidates:[]};assert.equal(withoutModel.vegetationModel,undefined,'legacy project stays model-free');
const project={...withoutModel,vegetationModel:stored};assert.equal(M.fromJSON(project.vegetationModel).predict(training[0]),model.predict(training[0]));
assert.throws(()=>M.fromJSON({...stored,version:3}),/inválido o incompatible/);
const stage=html.slice(html.indexOf('async function stageProject(p){'),html.indexOf("$('projectFile').onchange"));
assert.match(stage,/p\.vegetationModel==null\?null:OcartoVegetationLearn\.fromJSON\(p\.vegetationModel\)/,'validate before staged project is applied');
assert.match(html,/reusableVegetationModel=staged\.vegetationModel/,'restore model when project is opened');
console.log('✓ v29 modelo de vegetación dentro del proyecto: compatibilidad antigua, validación y restauración');
