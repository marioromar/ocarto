/* Ocarto: symbol codes, preview, and rendering helpers.
 * ISOM 2017-2 revision 6 identifiers. Custom features are labelled as such;
 * appearance is an editor approximation, not an OCAD/IOF-certified symbol library.
 */
(function(root){
'use strict';
const COLORS={
  // Approximate on-screen RGB equivalents of the IOF CMYK definitions;
  // final printed colours still require printer/profile calibration.
  black:'#000000',brown:'#d15c00',blue:'#00a8e8',green:'#3dff17',darkGreen:'#006633',yellow:'#ffba36',white:'#ffffff',grey:'#999999',purple:'#ae259b'
};
const meta={
  'contour-normal':{code:'101',color:COLORS.brown,lineWidthMm:.14},
  'contour-index':{code:'102',color:COLORS.brown,lineWidthMm:.25},
  'contour-form':{code:'103',color:COLORS.brown,lineWidthMm:.10,pattern:'dashed'},
  'contour-supplementary':{code:'103',color:COLORS.brown,lineWidthMm:.10,pattern:'dashed'},
  'knoll':{code:'109',color:COLORS.brown,sizeMm:.6},
  'elongated-knoll':{code:'110',color:COLORS.brown,sizeMm:.8},
  'rocky-pit':{code:'203.1',color:COLORS.black,sizeMm:.8},
  'dangerous-pit':{code:'203.2',color:COLORS.black,sizeMm:.8},
  'boulder-cluster':{code:'207',color:COLORS.black,sizeMm:.8},
  'stony-ground':{code:'210',fill:COLORS.white,pattern:'dots',patternColor:COLORS.black},
  'trench':{code:'215',color:COLORS.black,lineWidthMm:.25,decoration:'cliff'},
  'uncrossable-marsh':{code:'307',fill:COLORS.blue,pattern:'rows',patternColor:COLORS.black},
  'marsh':{code:'308',fill:COLORS.white,pattern:'rows',patternColor:COLORS.blue},
  'indistinct-marsh':{code:'310',fill:COLORS.white,pattern:'rows',patternColor:COLORS.blue},
  'bridge-entrance':{code:'512.1',color:COLORS.black,lineWidthMm:.2,decoration:'cliff'},
  'underpass':{code:'512.2',color:COLORS.black,lineWidthMm:.2,pattern:'dashed'},
  'passable-retaining-wall':{code:'513.2',color:COLORS.black,lineWidthMm:.2,pattern:'dashed'},
  'small-tower':{code:'525',color:COLORS.black,sizeMm:1,lineWidthMm:.22},
  'fodder-rack':{code:'527',color:COLORS.black,sizeMm:1,lineWidthMm:.22},
  'uncrossable-line-feature':{code:'529',color:COLORS.black,lineWidthMm:.25,pattern:'double-black'},
  'manmade-x':{code:'531',color:COLORS.black,sizeMm:1,lineWidthMm:.22},
  'stairway':{code:'532',color:COLORS.black,lineWidthMm:.1,pattern:'ticked'},
  'obstacles-area':{code:'533',fill:COLORS.black,fillOpacity:.5,pattern:'dots',patternColor:COLORS.black},
  'magnetic-north-line':{code:'601',color:COLORS.black,lineWidthMm:.14},
  'course-start':{code:'701',color:COLORS.purple,sizeMm:1,lineWidthMm:.35},
  'course-control':{code:'703',color:COLORS.purple,lineWidthMm:.35},
  'course-line':{code:'705',color:COLORS.purple,lineWidthMm:.35},
  'course-finish':{code:'706',color:COLORS.purple,lineWidthMm:.35},
  'out-of-bounds-boundary':{code:'708',color:COLORS.purple,lineWidthMm:.4},
  'out-of-bounds-area':{code:'709',fill:COLORS.purple,fillOpacity:.5,pattern:'rows',patternColor:COLORS.white},
  'crossing-point':{code:'710.1',color:COLORS.purple,lineWidthMm:.5},
  'temporary-closed-area':{code:'714',fill:COLORS.purple,fillOpacity:.5,pattern:'rows',patternColor:COLORS.white},
  'continuing-point':{code:'715',color:COLORS.purple,sizeMm:1,lineWidthMm:.35},
  'forbidden-route-course':{code:'716',color:COLORS.purple,lineWidthMm:.4,pattern:'dashed'},
  'open-land-ride':{code:'824',fill:COLORS.yellow,fillOpacity:1},
  'forested-land-ride':{code:'825',fill:COLORS.green,fillOpacity:.3},
  'rough-open-land-ride':{code:'826',fill:COLORS.yellow,fillOpacity:.5,pattern:'dots',patternColor:COLORS.green},
  'bare-rock':{code:'214',fill:COLORS.black,fillOpacity:.35},
  'depression':{code:'111',color:COLORS.brown,sizeMm:.8},
  'pit':{code:'112',color:COLORS.brown,sizeMm:.7},
  'cairn':{code:'526',color:COLORS.black,sizeMm:.8},
  'well':{code:'311',color:COLORS.blue,sizeMm:.8},
  'tower':{code:'524',color:COLORS.black,sizeMm:.9},
  'mast':{code:'524',color:COLORS.black,sizeMm:.9},
  'crossing':{code:'519',color:COLORS.black,sizeMm:.8},
  'boulder-small':{code:'204',color:COLORS.black,sizeMm:.4},
  'building-point':{code:'530',color:COLORS.black,sizeMm:.8},
  'ditch':{code:'107',color:COLORS.brown,lineWidthMm:.18},
  'dry-ditch':{code:'108',color:COLORS.brown,lineWidthMm:.18,pattern:'dotted'},
  'vegetation-boundary':{code:'416',color:COLORS.black,lineWidthMm:.12,pattern:'dotted'},
  'fence-wire':{code:'516',color:COLORS.black,lineWidthMm:.17,decoration:'fence'},
  'fence':{code:'516',color:COLORS.black,lineWidthMm:.17,decoration:'fence'},
  'impassable-fence':{code:'518',color:COLORS.black,lineWidthMm:.25,decoration:'fence'},
  'pipeline':{code:'528',color:COLORS.black,lineWidthMm:.18},
  'earth-bank':{code:'104',color:COLORS.brown,lineWidthMm:.25,decoration:'bank'},
  'earth-wall':{code:'105.1',color:COLORS.brown,lineWidthMm:.27,decoration:'bank'},
  'retaining-earth-wall':{code:'105.2',color:COLORS.brown,lineWidthMm:.18,decoration:'bank'},
  'ruined-earth-wall':{code:'106',color:COLORS.brown,lineWidthMm:.18,pattern:'dashed'},
  'erosion-gully':{code:'107',color:COLORS.brown,lineWidthMm:.25,decoration:'bank'},
  'small-erosion-gully':{code:'108',color:COLORS.brown,lineWidthMm:.25,pattern:'dotted'},
  'quarry-edge':{code:'202',color:COLORS.black,lineWidthMm:.25,decoration:'cliff'},
  'footpath':{code:'505',color:COLORS.black,lineWidthMm:.25,pattern:'dashed'},
  'narrow-ride':{code:'508',color:COLORS.yellow,lineWidthMm:.2,pattern:'solid'},
  'cultivation-boundary':{code:'415',color:COLORS.black,lineWidthMm:.10,pattern:'dotted'},
  'ruined-wall':{code:'514',color:COLORS.black,lineWidthMm:.18,pattern:'dashed'},
  'forbidden-route':{code:'711',color:COLORS.purple,lineWidthMm:.5,pattern:'solid'},
  'broken-ground':{code:'113',fill:COLORS.brown,pattern:'dots',patternColor:COLORS.brown},
  'very-broken-ground':{code:'114',fill:COLORS.brown,pattern:'dots',patternColor:COLORS.brown},
  'sand':{code:'213',fill:COLORS.white,pattern:'dots',patternColor:COLORS.black},
  'rocky-ground':{code:'210',fill:COLORS.white,pattern:'dots',patternColor:COLORS.black},
  'forest-runnable':{code:'405',fill:COLORS.white,fillOpacity:1},
  'impassable-vegetation':{code:'410',fill:COLORS.green,fillOpacity:1},
  'heath':{code:'403',fill:COLORS.yellow,fillOpacity:.5},
  'swamp-area':{code:'308',fill:COLORS.white,pattern:'rows',patternColor:COLORS.blue},
  'parking-area':{code:'501',fill:COLORS.brown,fillOpacity:.5,outline:COLORS.black},
  'private-area':{code:'520',fill:COLORS.green,fillOpacity:.65,outline:COLORS.black},
  'forbidden-area':{code:'520',fill:COLORS.green,fillOpacity:.65,outline:COLORS.black},
  'out-of-bounds-area':{code:'520',fill:COLORS.green,fillOpacity:.65,outline:COLORS.black},
  'olive-grove':{code:'413',fill:COLORS.yellow,fillOpacity:.7,pattern:'orchard',patternColor:COLORS.green},
  'water-area':{code:'301',fill:COLORS.blue,fillOpacity:1,outline:COLORS.black},
  'open-scattered':{code:'402',fill:COLORS.yellow,fillOpacity:.75,pattern:'dots',patternColor:COLORS.green},
  'rough-scattered':{code:'404',fill:COLORS.yellow,fillOpacity:.5,pattern:'dots',patternColor:COLORS.green},
  'boulder-field':{code:'209',fill:COLORS.white,pattern:'dots',patternColor:COLORS.black},
  'boulder-field-open':{code:'208',fill:COLORS.white,pattern:'dots',patternColor:COLORS.black},
  'passable-cliff':{code:'202',color:COLORS.black,lineWidthMm:.25,decoration:'cliff'},
  'ruin-outline':{code:'523',color:COLORS.black,lineWidthMm:.17,pattern:'dashed'},
  'cliff':{code:'201',color:COLORS.black,lineWidthMm:.35,decoration:'cliff'},
  'earth-bank':{code:'104',color:COLORS.brown,lineWidthMm:.25,decoration:'bank'},
  'marsh-line':{code:'309',color:COLORS.blue,lineWidthMm:.18,pattern:'dashed'},
  'railway':{code:'509',color:COLORS.black,lineWidthMm:.22,decoration:'railway'},
  'power-support':{code:'Personalizado',color:COLORS.black},
  'anthill':{code:'Personalizado',color:COLORS.brown},
  'bench':{code:'Personalizado',color:COLORS.black},
  'ruin-point':{code:'Personalizado',color:COLORS.black},
  'hedge':{code:'Personalizado',color:COLORS.green,lineWidthMm:.2},
  'impassable-vegetation-boundary':{code:'Personalizado',color:COLORS.darkGreen,lineWidthMm:.2},
  'rock-boundary':{code:'Personalizado',color:COLORS.black,lineWidthMm:.18},
  'quarry-area':{code:'Personalizado',fill:COLORS.grey,fillOpacity:.5,outline:COLORS.black},
  'construction-area':{code:'Personalizado',fill:COLORS.grey,fillOpacity:.45,pattern:'rows',patternColor:COLORS.black},
  'vegetation':{code:'Personalizado',fill:COLORS.green,fillOpacity:.45},
  'ruin-area':{code:'Personalizado',fill:COLORS.white,outline:COLORS.black},
  'stream':{code:'304',color:COLORS.blue,lineWidthMm:.30},
  'marsh':{code:'308',fill:COLORS.white,pattern:'rows',patternColor:COLORS.blue},
  'special-vegetation':{code:'419',color:COLORS.green}
};
const extra=[
 {id:'open-scattered',geometry:'area',group:'Áreas · vegetación IOF',name:'Terreno abierto con árboles dispersos',glyph:'∴',sizeMm:0,lineMm:.1},
 {id:'rough-scattered',geometry:'area',group:'Áreas · vegetación IOF',name:'Abierto áspero con árboles dispersos',glyph:'∴',sizeMm:0,lineMm:.1},
 {id:'narrow-ride',geometry:'line',group:'Líneas · caminos',name:'Cortafuegos o franja estrecha',glyph:'┄',sizeMm:0,lineMm:.2},
 {id:'cultivation-boundary',geometry:'line',group:'Líneas · vegetación',name:'Límite de cultivo',glyph:'┄',sizeMm:0,lineMm:.12},
 {id:'impassable-fence',geometry:'line',group:'Líneas · construcciones',name:'Valla infranqueable',glyph:'╫',sizeMm:0,lineMm:.25},
 {id:'ruined-wall',geometry:'line',group:'Líneas · construcciones',name:'Muro en ruinas',glyph:'┄',sizeMm:0,lineMm:.18},
 {id:'ruin-outline',geometry:'line',group:'Líneas · construcciones',name:'Contorno de ruina (523)',glyph:'▤',sizeMm:0,lineMm:.17},
 {id:'earth-bank',geometry:'line',group:'Líneas · relieve',name:'Talud de tierra (104)',glyph:'╱',sizeMm:0,lineMm:.25},
 {id:'earth-wall',geometry:'line',group:'Líneas · relieve',name:'Muro de tierra (105.1)',glyph:'┄',sizeMm:0,lineMm:.27},
 {id:'retaining-earth-wall',geometry:'line',group:'Líneas · relieve',name:'Muro de contención de tierra (105.2)',glyph:'┄',sizeMm:0,lineMm:.18},
 {id:'ruined-earth-wall',geometry:'line',group:'Líneas · relieve',name:'Muro de tierra en ruinas (106)',glyph:'┄',sizeMm:0,lineMm:.18},
 {id:'erosion-gully',geometry:'line',group:'Líneas · relieve',name:'Cárcava (107)',glyph:'╱',sizeMm:0,lineMm:.25},
 {id:'small-erosion-gully',geometry:'line',group:'Líneas · relieve',name:'Cárcava pequeña (108)',glyph:'···',sizeMm:0,lineMm:.25},
 {id:'broken-ground',geometry:'area',group:'Áreas · relieve',name:'Terreno accidentado (113)',glyph:'···',sizeMm:0,lineMm:.1},
 {id:'very-broken-ground',geometry:'area',group:'Áreas · relieve',name:'Terreno muy accidentado (114)',glyph:'⁙',sizeMm:0,lineMm:.1},
 {id:'elongated-knoll',geometry:'point',group:'Puntos · relieve',name:'Montículo alargado (110)',code:'110',glyph:'•••',sizeMm:.8,lineMm:.15},
 {id:'rocky-pit',geometry:'point',group:'Puntos · rocas',name:'Hoyo rocoso o cueva (203.1)',glyph:'⌒',sizeMm:.8,lineMm:.18},
 {id:'dangerous-pit',geometry:'point',group:'Puntos · rocas',name:'Hoyo peligroso (203.2)',glyph:'●',sizeMm:.8,lineMm:.18},
 {id:'boulder-cluster',geometry:'point',group:'Puntos · rocas',name:'Grupo de piedras (207)',glyph:'▲',sizeMm:.8,lineMm:.18},
 {id:'stony-ground',geometry:'area',group:'Áreas · rocas',name:'Terreno pedregoso (210)',glyph:'···',sizeMm:0,lineMm:.1},
 {id:'trench',geometry:'line',group:'Líneas · rocas',name:'Trinchera (215)',glyph:'╱',sizeMm:0,lineMm:.25},
 {id:'uncrossable-marsh',geometry:'area',group:'Áreas · agua',name:'Pantano infranqueable (307)',glyph:'≋',sizeMm:0,lineMm:.12},
 {id:'indistinct-marsh',geometry:'area',group:'Áreas · agua',name:'Pantano indistinto (310)',glyph:'≋',sizeMm:0,lineMm:.12},
 {id:'bridge-entrance',geometry:'line',group:'Líneas · construcciones',name:'Entrada de puente o túnel (512.1)',glyph:'┬',sizeMm:0,lineMm:.2},
 {id:'underpass',geometry:'line',group:'Líneas · construcciones',name:'Paso inferior o túnel (512.2)',glyph:'┄',sizeMm:0,lineMm:.2},
 {id:'passable-retaining-wall',geometry:'line',group:'Líneas · construcciones',name:'Muro de contención franqueable (513.2)',glyph:'┄',sizeMm:0,lineMm:.2},
 {id:'small-tower',geometry:'point',group:'Puntos · construcciones',name:'Torre pequeña (525)',glyph:'⌂',sizeMm:1,lineMm:.22},
 {id:'fodder-rack',geometry:'point',group:'Puntos · construcciones',name:'Comedero (527)',glyph:'╫',sizeMm:1,lineMm:.22},
 {id:'uncrossable-line-feature',geometry:'line',group:'Líneas · construcciones',name:'Elemento lineal infranqueable (529)',glyph:'═',sizeMm:0,lineMm:.25},
 {id:'manmade-x',geometry:'point',group:'Puntos · construcciones',name:'Elemento construido en X (531)',glyph:'×',sizeMm:1,lineMm:.22},
 {id:'stairway',geometry:'line',group:'Líneas · construcciones',name:'Escalera (532)',glyph:'≡',sizeMm:0,lineMm:.1},
 {id:'obstacles-area',geometry:'area',group:'Áreas · construcciones',name:'Área con obstáculos (533)',glyph:'···',sizeMm:0,lineMm:.1},
 {id:'magnetic-north-line',geometry:'line',group:'Líneas · técnicos',name:'Línea de norte magnético (601)',glyph:'│',sizeMm:0,lineMm:.14},
 {id:'course-start',geometry:'point',group:'Símbolos de recorrido',name:'Salida (701)',glyph:'△',sizeMm:1,lineMm:.35},
 {id:'course-control',geometry:'point',group:'Símbolos de recorrido',name:'Control (703)',glyph:'○',sizeMm:1,lineMm:.35},
 {id:'course-line',geometry:'line',group:'Símbolos de recorrido',name:'Línea de recorrido (705)',glyph:'━',sizeMm:0,lineMm:.35},
 {id:'course-finish',geometry:'point',group:'Símbolos de recorrido',name:'Meta (706)',glyph:'◎',sizeMm:1,lineMm:.35},
 {id:'out-of-bounds-boundary',geometry:'line',group:'Símbolos de recorrido',name:'Límite fuera de límites (708)',glyph:'┄',sizeMm:0,lineMm:.4},
 {id:'out-of-bounds-area',geometry:'area',group:'Símbolos de recorrido',name:'Área fuera de límites (709)',glyph:'▧',sizeMm:0,lineMm:.2},
 {id:'crossing-point',geometry:'point',group:'Símbolos de recorrido',name:'Punto de cruce (710.1)',glyph:'⌒',sizeMm:1,lineMm:.5},
 {id:'temporary-closed-area',geometry:'area',group:'Símbolos de recorrido',name:'Área temporal cerrada (714)',glyph:'▧',sizeMm:0,lineMm:.1},
 {id:'continuing-point',geometry:'point',group:'Símbolos de recorrido',name:'Punto de continuación (715)',glyph:'●',sizeMm:1,lineMm:.35},
 {id:'forbidden-route-course',geometry:'line',group:'Símbolos de recorrido',name:'Ruta prohibida (716)',glyph:'╳',sizeMm:0,lineMm:.4},
 {id:'open-land-ride',geometry:'area',group:'Áreas · MTBO',name:'Terreno abierto ciclable (824)',glyph:'▨',sizeMm:0,lineMm:.1},
 {id:'forested-land-ride',geometry:'area',group:'Áreas · MTBO',name:'Bosque ciclable (825)',glyph:'▧',sizeMm:0,lineMm:.1},
 {id:'rough-open-land-ride',geometry:'area',group:'Áreas · MTBO',name:'Terreno abierto áspero ciclable (826)',glyph:'▨',sizeMm:0,lineMm:.1},
 {id:'passable-cliff',geometry:'line',group:'Líneas · relieve y rocas',name:'Cortado franqueable (202)',glyph:'╱',sizeMm:0,lineMm:.25},
 {id:'boulder-field-open',geometry:'area',group:'Áreas · rocas',name:'Campo de bloques (208)',glyph:'▲',sizeMm:0,lineMm:.1}
];
function enrichCatalog(catalog){
 const ids=new Set(catalog.map(s=>s.id));
 for(const item of extra)if(!ids.has(item.id)){catalog.push({...item});ids.add(item.id)}
 for(const item of catalog){
   const fix=meta[item.id];
   if(fix&&fix.code){item.code=fix.code}
   if(item.id==='boulder-field')item.name='Campo de bloques denso';
   if(item.id==='ruin-area')item.name='Ruina como polígono (personalizado)';
   if(item.id==='contour-index')item.name='Curva de nivel maestra (índice)';
   if(item.id==='contour-normal')item.name='Curva de nivel normal';
   if((!fix || !fix.code)&&!/^\d+(?:\.\d+)?$/.test(String(item.code)))item.code='Personalizado';
 }
 return catalog;
}
function specFor(id){return meta[id]||null}
function colorFor(id,style){return style?.color||style?.fill||meta[id]?.color||meta[id]?.fill||COLORS.black}
function symbolCode(item,style){return style?.code===null?null:(style?.code||meta[item.id]?.code||item.code)}
function drawPoint(ctx,id,r,style,candidate){
 const c=candidate?'#c3653b':colorFor(id,style);const stroke=(width=1.5)=>{ctx.strokeStyle=c;ctx.lineWidth=width;ctx.stroke()};const fill=()=>{ctx.fillStyle=c;ctx.fill()};
 const ring=(radius)=>{ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.stroke()};
 const polygon=(pts,filled)=>{ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x*r,y*r):ctx.moveTo(x*r,y*r));ctx.closePath();filled?fill():stroke(Math.max(.14*r,1))};
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 switch(id){
 case 'tree':case 'bush':{
  ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fillStyle=style?.mask||COLORS.white;ctx.fill();
  ctx.beginPath();ctx.arc(0,0,r*(id==='tree'?.81:.7),0,Math.PI*2);fill();
  if(id==='bush'){ctx.beginPath();ctx.arc(0,0,r*.19,0,Math.PI*2);ctx.fillStyle=COLORS.white;ctx.fill()}break;
 }
 case 'knoll':
  for(const [x,y] of [[-.42,.2],[.42,.2],[0,-.42]]){ctx.beginPath();ctx.arc(x*r,y*r,Math.max(1,r*.12),0,Math.PI*2);fill()}break;
 case 'elongated-knoll':
  for(const [x,y] of [[-.62,.12],[0,-.18],[.62,.12]]){ctx.beginPath();ctx.ellipse(x*r,y*r,Math.max(1,r*.18),Math.max(.7,r*.1),0,0,Math.PI*2);fill()}break;
 case 'rock':case 'large-rock':case 'boulder-small':case 'anthill':
  if(id==='rock'||id==='large-rock'||id==='boulder-small')polygon([[0,-1],[.87,.58],[-.87,.58]],true);
  else{ctx.beginPath();ctx.arc(0,0,r*.63,0,Math.PI*2);fill()}break;
 case 'pit':case 'depression':
  ctx.strokeStyle=c;ctx.lineWidth=Math.max(1,.18*r);ctx.beginPath();ctx.arc(0,0,r*.7,Math.PI*.1,Math.PI*1.9);ctx.stroke();if(id==='pit'){ctx.beginPath();ctx.arc(0,0,r*.3,0,Math.PI*2);fill()}break;
 case 'cairn':polygon([[0,-.94],[.9,.65],[-.9,.65]],true);break;
 case 'well':case 'waterhole':case 'building-point':ring(r*.7);if(id==='well'||id==='waterhole'){ctx.beginPath();ctx.arc(0,0,r*.19,0,Math.PI*2);fill()}break;
 case 'spring':
  ctx.strokeStyle=c;ctx.lineWidth=Math.max(1,r*.18);ctx.beginPath();ctx.arc(0,0,r*.72,Math.PI*.22,Math.PI*1.78);ctx.stroke();ctx.beginPath();ctx.moveTo(0,r*.38);ctx.lineTo(0,r*.9);ctx.stroke();break;
 case 'tower':case 'mast':case 'power-support':
  ctx.strokeStyle=c;ctx.lineWidth=Math.max(1,r*.15);ctx.beginPath();ctx.moveTo(-r*.8,0);ctx.lineTo(r*.8,0);ctx.moveTo(0,-r*.8);ctx.lineTo(0,r*.8);ctx.stroke();if(id==='power-support')ring(r*.65);break;
 case 'crossing':case 'special-vegetation':
  ctx.strokeStyle=c;ctx.lineWidth=Math.max(1,r*.2);ctx.beginPath();ctx.moveTo(-r*.82,0);ctx.lineTo(r*.82,0);ctx.moveTo(0,-r*.82);ctx.lineTo(0,r*.82);ctx.stroke();break;
 case 'ruin-point':case 'bench':
  polygon([[-.8,-.6],[.8,-.6],[.8,.6],[-.8,.6]],false);break;
 case 'rocky-pit':
  ctx.beginPath();ctx.ellipse(0,0,r*.72,r*.46,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-r*.45,r*.18);ctx.quadraticCurveTo(0,r*.58,r*.45,r*.18);ctx.stroke();break;
 case 'dangerous-pit':
  ctx.beginPath();ctx.arc(0,0,r*.62,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-r*.48,-r*.48);ctx.lineTo(r*.48,r*.48);ctx.moveTo(r*.48,-r*.48);ctx.lineTo(-r*.48,r*.48);ctx.stroke();break;
 case 'boulder-cluster':
  for(const [x,y,rr] of [[-.45,.25,.32],[.08,.1,.42],[.48,.3,.26],[0,-.42,.24]]){ctx.beginPath();ctx.arc(x*r,y*r,rr*r,0,Math.PI*2);fill()}break;
 case 'small-tower':
  polygon([[-.62,-.6],[.62,-.6],[.62,.58],[-.62,.58]],false);ctx.beginPath();ctx.moveTo(-r*.8,0);ctx.lineTo(r*.8,0);ctx.stroke();break;
 case 'fodder-rack':
  ctx.beginPath();ctx.moveTo(-r*.7,-r*.55);ctx.lineTo(r*.7,-r*.55);ctx.moveTo(-r*.7,r*.55);ctx.lineTo(r*.7,r*.55);ctx.stroke();
  for(const x of [-.5,-.17,.17,.5]){ctx.beginPath();ctx.moveTo(x*r,-r*.55);ctx.lineTo(x*r,r*.55);ctx.stroke()}break;
 case 'manmade-x':
  ctx.beginPath();ctx.moveTo(-r*.7,-r*.7);ctx.lineTo(r*.7,r*.7);ctx.moveTo(r*.7,-r*.7);ctx.lineTo(-r*.7,r*.7);ctx.stroke();break;
 case 'course-start':
  polygon([[0,-.85],[.78,.65],[-.78,.65]],false);break;
 case 'course-control':ring(r*.72);break;
 case 'course-finish':ring(r*.72);ring(r*.42);break;
 case 'continuing-point':
  ctx.beginPath();ctx.arc(0,0,r*.28,0,Math.PI*2);fill();ring(r*.72);break;
 case 'crossing-point':
  ctx.beginPath();ctx.moveTo(-r*.75,0);ctx.lineTo(r*.75,0);ctx.stroke();ctx.beginPath();ctx.arc(0,0,r*.45,Math.PI,Math.PI*2);ctx.stroke();break;
 default:ctx.restore();return false;
 }
 ctx.restore();return true;
}
function decorateLine(ctx,id,pts,unitScale,zoom,style){
 if(!Array.isArray(pts)||pts.length<2)return false;
 const mark=meta[id]?.decoration;if(!mark)return false;
 const gap=unitScale?Math.max(3.2,2.1*unitScale):Math.max(9,18/zoom),height=unitScale?Math.max(.55,.24*unitScale):Math.max(1.25,2.4/zoom);
 ctx.save();ctx.strokeStyle=colorFor(id,style);ctx.lineWidth=unitScale?Math.max(.2,(style?.lineWidthMm||.15)*unitScale):Math.max(.8,1.15/zoom);
 for(let i=1;i<pts.length;i++){
  const a=pts[i-1],b=pts[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(len<.01)continue;
  const nx=-dy/len,ny=dx/len,ux=dx/len,uy=dy/len;
  const n=Math.floor(len/gap);
  for(let j=1;j<=n;j++){
    const t=j/(n+1),x=a.x+dx*t,y=a.y+dy*t;
    ctx.beginPath();
    if(mark==='fence'){
     ctx.moveTo(x-nx*height,y-ny*height);ctx.lineTo(x+nx*height,y+ny*height);
     if(id==='impassable-fence'){ctx.moveTo(x-ux*height*.55,y-uy*height*.55);ctx.lineTo(x+ux*height*.55,y+uy*height*.55)}
    }else if(mark==='cliff'||mark==='bank'){
     const cliffScale=id==='cliff'?1.75:id==='passable-cliff'?0.95:id==='quarry-edge'?1.25:1;ctx.moveTo(x,y);ctx.lineTo(x+nx*height*cliffScale,y+ny*height*cliffScale);
    }else if(mark==='railway'){
     ctx.moveTo(x-nx*height,y-ny*height);ctx.lineTo(x+nx*height,y+ny*height)
    }
    ctx.stroke();
  }
 }
 ctx.restore();return true;
}
function renderPreview(canvas,id,geometry,style){
 if(!canvas?.getContext)return false;const ctx=canvas.getContext('2d');if(!ctx)return false;
 const w=canvas.width||40,h=canvas.height||32,c=colorFor(id,style),metaStyle=meta[id]||{};
 ctx.clearRect(0,0,w,h);ctx.save();
 if(geometry==='point'){ctx.translate(w/2,h/2);drawPoint(ctx,id,Math.min(w,h)*.32,style,false)}
 else if(geometry==='line'){
  ctx.strokeStyle=c;ctx.lineWidth=Math.max(1.4,(style?.lineWidthMm||metaStyle.lineWidthMm||.2)*9);ctx.lineCap='round';
  ctx.setLineDash(style?.pattern==='dashed'?[7,4]:style?.pattern==='dotted'?[1,4]:[]);
  ctx.beginPath();ctx.moveTo(3,h*.66);ctx.lineTo(w-3,h*.35);ctx.stroke();ctx.setLineDash([]);
  decorateLine(ctx,id,[{x:3,y:h*.66},{x:w-3,y:h*.35}],null,1,style)
 }
 else {
  ctx.beginPath();ctx.rect(4,3,w-8,h-6);
  ctx.fillStyle=style?.fill||metaStyle.fill||COLORS.grey;
  ctx.globalAlpha=style?.fillOpacity??metaStyle.fillOpacity??1;ctx.fill();ctx.globalAlpha=1;
  if(style?.outline||metaStyle.outline){ctx.strokeStyle=style?.outline||metaStyle.outline;ctx.lineWidth=1.3;ctx.stroke()}
  if((style?.pattern||metaStyle.pattern)==='dots'){ctx.fillStyle=style?.patternColor||metaStyle.patternColor||COLORS.white;for(let x=9;x<w-5;x+=9)for(let y=9;y<h-5;y+=9){ctx.beginPath();ctx.arc(x,y,1.5,0,7);ctx.fill()}}
  if(['rows','orchard','two-lines'].includes(style?.pattern||metaStyle.pattern)){
   ctx.strokeStyle=style?.patternColor||metaStyle.patternColor||COLORS.white;ctx.lineWidth=1.4;
   for(let y=9;y<h-4;y+=7){ctx.beginPath();ctx.moveTo(5,y);ctx.lineTo(w-5,y);ctx.stroke()}
  }
 }
 ctx.restore();return true;
}
const api={COLORS,meta,extra,enrichCatalog,specFor,symbolCode,colorFor,drawPoint,decorateLine,renderPreview};
root.OcartoSymbolRenderer=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
