const fs=require('fs');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
if(!html.includes('list.querySelectorAll(\'.symbol-option.active\')')) throw new Error('selection still rebuilds the catalog');
if(html.includes("x.group!==last")) throw new Error('symbol groups still rendered');
console.log('✓ seleccionar un símbolo conserva toda la lista y no muestra grupos');
