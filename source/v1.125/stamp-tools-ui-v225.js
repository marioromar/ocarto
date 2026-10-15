(()=>{
  const canvas=document.getElementById('mapCanvas'),bar=document.querySelector('.toolbar');
  if(!canvas||!bar||document.getElementById('stampSymbolTool'))return;
  const button=document.createElement('button');button.id='stampSymbolTool';button.type='button';button.className='action';button.textContent='Estampar símbolo';button.title='Pulsa o arrastra para colocar el símbolo puntual activo dentro de un recinto cerrado';bar.appendChild(button);
  const refs=()=>S.multiSelection?.length?S.multiSelection:(S.selection?[S.selection]:[]);
  const areaForSelection=()=>{
    const selected=refs();if(!selected.length||selected.some(r=>r.collection!=='feature'))throw Error('Selecciona un área o las líneas que forman un recinto');
    const items=selected.map(r=>({index:r.index,feature:S.features[r.index]}));if(items.some(x=>!x.feature))throw Error('La selección ya no está disponible');
    if(items.some(x=>x.feature.locked||symbolStatus(x.feature.symbol)!=='normal'||vectorLayerFor(x.feature)?.referenceOnly))throw Error('Desbloquea el recinto y sus capas');
    if(items.length===1&&items[0].feature.type==='area'){
      const f=items[0].feature;if(f.curve==='bezier'||f.points?.some(p=>p.tangent||p.inTangent||p.outTangent)||(f.holes||[]).some(r=>r.some(p=>p.tangent||p.inTangent||p.outTangent)))throw Error('El estampado requiere un área recta');
      const x=f.x||0,y=f.y||0,outer=f.points.map(p=>[p.x+x,p.y+y]),holes=(f.holes||[]).map(r=>r.map(p=>[p.x+x,p.y+y]));
      const valid=OcartoTopologyTools.validatePolygon(outer,holes);if(!valid.valid)throw Error('Área no válida: '+valid.issues[0]);return{outer,holes,ids:[f.id||items[0].index]};
    }
    if(items.some(x=>x.feature.type!=='line'))throw Error('Selecciona un área o solo líneas de perímetro');
    if(items.some(x=>x.feature.curve==='bezier'||x.feature.points?.some(p=>p.tangent||p.inTangent||p.outTangent)))throw Error('Las líneas del perímetro deben ser rectas');
    const paths=items.map(({feature:f})=>f.points.map(p=>[p.x+(f.x||0),p.y+(f.y||0)])),outer=OcartoStampTools.ringFromLinePaths(paths,8/S.zoom),valid=OcartoTopologyTools.validatePolygon(outer,[]);
    if(!valid.valid)throw Error('Perímetro no válido: '+valid.issues[0]);return{outer,holes:[],ids:items.map(x=>x.feature.id||x.index)};
  };
  const local=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left-W()/2-S.panX)/S.zoom,y:(e.clientY-r.top-H()/2-S.panY)/S.zoom}};
  const inside=(mode,p)=>OcartoStampTools.contains([p.x,p.y],mode.outer,mode.holes);
  const addStamp=(mode,p)=>{
    if(!inside(mode,p))return false;
    const point=mapPoint({x:p.x,y:p.y}),feature={...point,type:'point',symbol:mode.symbol,layerId:mode.layerId,angle:0,properties:{derivedFrom:'symbol-stamp',boundaryFeatureIds:mode.boundaryIds,review_required:false}};
    S.features.push(feature);mode.lastIndex=S.features.length-1;mode.count++;mode.gesture.count++;mode.gesture.last=p;return true;
  };
  const finishGesture=()=>{const mode=S.stampMode,g=mode?.gesture;if(!g)return;mode.gesture=null;if(g.count){recordMapEdit(g.before);S.selection={collection:'feature',index:mode.lastIndex};S.multiSelection=[];S.selectedVertices=[];renderVectorLayers();draw();toast(`${g.count} símbolo${g.count===1?'':'s'} estampado${g.count===1?'':'s'}`)}else draw()};
  button.onclick=()=>{
    if(S.stampMode){finishGesture();S.stampMode=null;button.textContent='Estampar símbolo';button.classList.remove('primary');draw();toast('Estampado terminado');return}
    try{
      const def=SYMBOL_CATALOG.find(x=>x.id===S.symbol);if(!def||def.geometry!=='point')throw Error('Elige primero un símbolo puntual');
      if(symbolStatus(S.symbol)!=='normal')throw Error('El símbolo activo está oculto o protegido');
      const region=areaForSelection(),layer=activeVectorLayer();if(!layer)throw Error('No hay una capa editable activa');
      S.stampMode={...region,symbol:S.symbol,layerId:layer.id,gesture:null,lastIndex:-1,count:0};S.selection=null;S.multiSelection=[];S.selectedVertices=[];button.textContent='Terminar estampado';button.classList.add('primary');draw();toast('Pulsa o arrastra dentro del recinto para estampar; vuelve a pulsar el botón para terminar');
    }catch(err){toast('Estampar símbolo: '+err.message)}
  };
  canvas.addEventListener('pointerdown',e=>{const mode=S.stampMode;if(!mode||e.button!==0||e.isPrimary===false)return;e.preventDefault();e.stopImmediatePropagation();mode.gesture={before:snapshotMap(),count:0,last:null,pointerId:e.pointerId};canvas.setPointerCapture?.(e.pointerId);const p=local(e);addStamp(mode,p);draw()},{capture:true});
  canvas.addEventListener('pointermove',e=>{const mode=S.stampMode,g=mode?.gesture;if(!g||g.pointerId!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const p=local(e),spacing=14/S.zoom;if(!g.last||Math.hypot(p.x-g.last.x,p.y-g.last.y)>=spacing){if(addStamp(mode,p))draw()}},{capture:true});
  canvas.addEventListener('pointerup',e=>{const mode=S.stampMode;if(!mode?.gesture||mode.gesture.pointerId!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();finishGesture()},{capture:true});
  canvas.addEventListener('pointercancel',e=>{if(S.stampMode?.gesture?.pointerId===e.pointerId)finishGesture()},{capture:true});
})();
