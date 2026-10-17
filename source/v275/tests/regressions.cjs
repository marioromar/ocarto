const fs=require('fs');
const ui=fs.readFileSync(__dirname+'/../interface-v229.js','utf8');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
if(ui.includes("['lidarWorkspace','LiDAR']")) throw new Error('LiDAR tab duplicated');
if(!ui.includes("activate('lidarWorkspace')")) throw new Error('LiDAR menu does not activate workspace');
if(!html.includes("list.querySelectorAll('.symbol-option.active')")) throw new Error('symbol selection rebuilds catalog');
if(html.includes('x.group!==last')) throw new Error('symbol groups still rendered');
console.log('✓ v275 menu LiDAR and full symbol catalog regressions');
