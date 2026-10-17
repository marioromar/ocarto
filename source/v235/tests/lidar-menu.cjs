const fs=require('fs');
const html=fs.readFileSync(__dirname+'/../interface-v229.js','utf8');
if(html.includes("['lidarWorkspace','LiDAR']")) throw new Error('LiDAR tab still duplicated');
if(!html.includes("data-menu-target=\"lidarNav\"")) throw new Error('LiDAR menu action missing');
if(!html.includes("activate('lidarWorkspace')")) throw new Error('LiDAR menu does not activate workspace');
console.log('✓ LiDAR queda accesible desde el menú superior y no aparece como pestaña duplicada');
