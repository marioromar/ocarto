/* Rotate selected cartographic objects around their combined bounds center. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else {
  root.OcartoSelectionTransform=api;
  if(root.document?.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>api.install(root),{once:true});
  else api.install(root);
 }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const finite=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y);
 function rotate180(items,{toWorld}={}){
  if(!Array.isArray(items)||!items.length)throw Error('Selecciona objetos editables para girar');
  const positions=[];
  for(const item of items){
   if(Array.isArray(item?.points)){
    for(const p of item.points)if(finite(p))positions.push({x:p.x+(item.x||0),y:p.y+(item.y||0)});
    for(const ring of item.holes||[])for(const p of ring)if(finite(p))positions.push({x:p.x+(item.x||0),y:p.y+(item.y||0)});
   }else if(finite(item))positions.push({x:item.x,y:item.y});
  }
  if(!positions.length)throw Error('La selección no contiene geometría girable');
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const p of positions){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y)}
  const center={x:(minX+maxX)/2,y:(minY+maxY)/2};
  const rotatePoint=(p,item)=>{
   const x=p.x+(item.x||0),y=p.y+(item.y||0),next={...p,x:2*center.x-x-(item.x||0),y:2*center.y-y-(item.y||0)};
   for(const key of ['tangent','inTangent','outTangent'])if(finite(p[key]))next[key]={...p[key],x:-p[key].x,y:-p[key].y};
   const moved=next.x!==p.x||next.y!==p.y;
   if(typeof toWorld==='function'){
    const world=toWorld({x:next.x+(item.x||0),y:next.y+(item.y||0)});
    if(finite(world)){next.rawX=world.x;next.rawY=world.y}else{delete next.rawX;delete next.rawY}
   }else if(moved){delete next.rawX;delete next.rawY}
   return next;
  };
  for(const item of items){
   if(Array.isArray(item?.points)){
    item.points=item.points.map(p=>rotatePoint(p,item));
    if(Array.isArray(item.holes))item.holes=item.holes.map(ring=>ring.map(p=>rotatePoint(p,item)));
   }else if(finite(item)){
    const p=rotatePoint(item,{x:0,y:0}),moved=p.x!==item.x||p.y!==item.y;item.x=p.x;item.y=p.y;
    if(Number.isFinite(p.rawX)&&Number.isFinite(p.rawY)){item.rawX=p.rawX;item.rawY=p.rawY}
    else if(moved){delete item.rawX;delete item.rawY}
   }
  }
  return {center,count:items.length};
 }
 function install(root){
  const doc=root.document,menu=[...doc.querySelectorAll('.oc-menu>details')].find(d=>['DIBUJO','HERRAMIENTAS'].includes(d.querySelector('summary')?.textContent.trim())),container=menu?.querySelector('.oc-dropdown');
  if(!container||doc.getElementById('rotateSelection180'))return;
  const button=doc.createElement('button');button.id='rotateSelection180';button.type='button';button.className='action edit-transform';
  button.title='Gira la selección 180° alrededor del centro de su extensión';
  button.innerHTML='<span class="tool-icon" aria-hidden="true">↻</span><span>Girar 180°</span>';
  const heading=doc.createElement('div');heading.className='menu-note';heading.textContent='Transformar selección';
  container.append(doc.createElement('hr'),heading,button);
  button.addEventListener('click',()=>{
   const S=root.S,refs=S?.multiSelection?.length?S.multiSelection:(S?.selection?[S.selection]:[]);
   const items=refs.map(ref=>({ref,item:ref.collection==='candidate'?S.candidates[ref.index]:S.features[ref.index]}))
    .filter(x=>x.item&&(x.ref.collection==='candidate'||(root.symbolStatus?.(x.item.symbol)==='normal'&&!x.item.locked&&!root.vectorLayerFor?.(x.item)?.referenceOnly)));
   if(!items.length){root.toast?.('Selecciona objetos editables para girar');return}
   const before=root.snapshotMap(),world=S.georef&&S.renderGeo?root.localToWorld:
    S.cloudTransform?.scale?p=>({x:S.cloudTransform.centerX+p.x/S.cloudTransform.scale,y:S.cloudTransform.centerY-p.y/S.cloudTransform.scale}):null;
   try{
    rotate180(items.map(x=>x.item),{toWorld:world});root.recordMapEdit(before);
    S.multiSelection=items.map(x=>x.ref);S.selection=items.length===1?items[0].ref:null;S.selectedVertices=[];
    root.draw();root.toast(`${items.length} objeto${items.length===1?'':'s'} girado${items.length===1?'':'s'} 180°`)
   }catch(err){root.toast?.('Girar selección: '+err.message)}
  });
 }
 return Object.freeze({rotate180,install});
});
