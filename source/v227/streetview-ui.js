(()=>{
  const bar=document.querySelector('.toolbar'),canvas=document.getElementById('mapCanvas');
  if(!bar||!canvas||document.getElementById('streetViewTool'))return;
  const button=document.createElement('button');button.id='streetViewTool';button.type='button';button.className='action';button.textContent='Street View';button.title='Haz clic en el mapa para abrir Google Street View en esa ubicación';bar.appendChild(button);
  const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left-W()/2-S.panX)/S.zoom,y:(e.clientY-r.top-H()/2-S.panY)/S.zoom}};
  const cancel=()=>{S.streetViewMode=null;button.classList.remove('primary');button.setAttribute('aria-pressed','false')};
  button.setAttribute('aria-pressed','false');
  button.onclick=()=>{if(S.streetViewMode){cancel();toast('Street View cancelado');return}if(!S.georef||!S.renderGeo){toast('Georreferencia el mapa para consultar Street View');return}button.classList.add('primary');button.setAttribute('aria-pressed','true');S.streetViewMode={pointerId:null};toast('Haz clic en el mapa para abrir Street View en esa zona')};
  canvas.addEventListener('pointerdown',e=>{if(!S.streetViewMode||e.button!==0||e.isPrimary===false)return;e.preventDefault();e.stopImmediatePropagation();S.streetViewMode.pointerId=e.pointerId;canvas.setPointerCapture?.(e.pointerId)},{capture:true});
  canvas.addEventListener('pointerup',e=>{const mode=S.streetViewMode;if(!mode||mode.pointerId!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();try{const p=point(e),world=localToWorld(p),crs=OcartoGeoCrs.normalizeGeoCrs(document.getElementById('mapCrs').value),gps=OcartoGeoCrs.transformCoordinate(world.x,world.y,crs,'EPSG:4326'),url=OcartoStreetViewTools.streetViewUrl(gps.y,gps.x);window.open(url,'_blank','noopener,noreferrer');toast('Street View abierto en la ubicación marcada')}catch(err){toast('No se pudo abrir Street View: '+err.message)}finally{cancel()}},{capture:true});
  canvas.addEventListener('pointercancel',e=>{if(S.streetViewMode?.pointerId===e.pointerId){cancel();toast('Street View cancelado')}},{capture:true});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&S.streetViewMode){cancel();toast('Street View cancelado')}});
})();
