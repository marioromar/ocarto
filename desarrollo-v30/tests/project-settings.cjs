const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
const ids=['heightThreshold','heightMaximum','lidarClassFilter','cellSize','minCellPoints','localMax3x3','contourInterval','contourSmoothing','contourProtectAngle','contourDetailInterval','valleyThreshold','valleyMinLength','valleyRadius','vegetationCell'];
const save=html.match(/lidarSettings:\{([^}]+)\}/);assert.ok(save,'LiDAR settings are included in project save');for(const id of ids)assert.match(save[1],new RegExp(`${id}:`),`${id} saved`);
const stage=html.slice(html.indexOf('async function stageProject(p){'),html.indexOf("$('projectFile').onchange"));assert.match(stage,/p\.lidarSettings\)\?p\.lidarSettings:\{\}/,'older project uses safe defaults');assert.match(stage,/\['all','ground','vegetation','unclassified'\]/,'classification values are allow-listed');assert.match(stage,/numSetting=/,'numeric ranges are normalized');
assert.match(html,/for\(const \[id,value\] of Object\.entries\(staged\.lidarSettings\)\)/,'settings are restored when project opens');
const defaults={heightThreshold:'4',heightMaximum:'',lidarClassFilter:'all',cellSize:'5',minCellPoints:'1',localMax3x3:false,contourInterval:'5',contourSmoothing:'25',contourProtectAngle:'55',contourDetailInterval:'1',valleyThreshold:'0.6',valleyMinLength:'20',valleyRadius:'2',vegetationCell:'5'};assert.equal(Object.keys(defaults).length,ids.length);
console.log('✓ v30 parámetros LiDAR: guardado, restauración, defaults antiguos y rangos seguros');
