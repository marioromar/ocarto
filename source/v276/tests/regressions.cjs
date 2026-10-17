const fs=require('fs');
const ui=fs.readFileSync(__dirname+'/../interface-v229.js','utf8');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
if(ui.includes("['lidarWorkspace','LiDAR']")) throw new Error('LiDAR tab duplicated');
if(!ui.includes("activate('lidarWorkspace')")) throw new Error('LiDAR menu missing');
if(!html.includes("list.querySelectorAll('.symbol-option.active')")) throw new Error('selection rebuilds catalog');
if(html.includes('x.group!==last')) throw new Error('symbol groups still rendered');
console.log('✓ v276 regressions');
