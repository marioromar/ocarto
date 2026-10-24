/* Ocarto v288: visual-only layout migration.
   Reparents the ACTUAL controls; no cloning, renaming IDs or replacing handlers.
   Older editing, LiDAR and export capabilities remain wired to their original nodes. */
(function(){
 'use strict';
 function install(){
  if(document.body.classList.contains('ocarto-v288'))return;
  const left=document.querySelector('.layout>.left');
  const right=document.querySelector('.layout>.right');
  const toolbar=document.querySelector('.canvas-area>.toolbar');
  const menu=document.querySelector('nav.oc-menu');
  const toolGrid=left?.querySelector('.tool-grid');
  const list=document.getElementById('symbolList');
  const search=document.getElementById('symbolSearch');
  const typeFilter=document.getElementById('symbolTypeFilter');
  if(!left||!right||!toolGrid||!list||!search||!typeFilter||!menu)return;
  toolGrid.querySelectorAll('.tool').forEach(button=>{
   const label=button.querySelector('span')?.textContent.trim();
   if(label){button.title=label;button.setAttribute('aria-label',label)}
  });
  // Keep every existing DOM node and its event listeners. This drawer
  // contains the former large side panels, accessible from top menus.
  const drawer=document.createElement('section');
  drawer.id='ocartoV288Drawer';drawer.className='ocarto-v288-drawer';
  drawer.hidden=true;drawer.setAttribute('aria-label','Panel de herramientas y plantillas');
  const head=document.createElement('div');head.className='v288-drawer-head';
  const heading=document.createElement('span');heading.textContent='Opciones de Ocarto';
  heading.id='ocartoV288DrawerHeading';
  const close=document.createElement('button');close.type='button';
  close.className='v288-drawer-close';close.textContent='×';
  close.setAttribute('aria-label','Cerrar panel');close.title='Cerrar panel';
  head.append(heading,close);
  const inner=document.createElement('div');inner.className='v288-drawer-inner';
  drawer.append(head,inner);document.body.append(drawer);
  const symbolBar=document.createElement('section');
  symbolBar.className='v288-symbols';symbolBar.id='ocartoV288Symbols';
  const title=document.createElement('h2');title.textContent='Símbolos';
  const controls=search.parentElement;
  const active=document.getElementById('activeSymbolLabel');
  symbolBar.append(title,controls,list);
  if(active){active.classList.add('v288-active-symbol');symbolBar.append(active)}
  right.append(symbolBar);
  const context=document.getElementById('symbolContextMenu');
  if(context)document.body.append(context);
  // Source panels retain their markup and original JS event handlers.
  const drawingSection=document.createElement('section');
  drawingSection.id='ocartoV288DrawingOptions';
  drawingSection.className='card';
  const label=document.createElement('h3');label.textContent='Dibujo y herramientas avanzadas';
  label.style.margin='0 0 8px';drawingSection.append(label);
  const advanced=[...document.querySelectorAll('.canvas-area>.advanced-join-tools,.canvas-area>.advanced-line-tools')];
  const extend=document.getElementById('extendDistance')?.parentElement;
  if(extend&&extend.parentElement?.classList.contains('canvas-area'))advanced.unshift(extend);
  for(const node of advanced)drawingSection.append(node);
  const actions=document.createElement('div');actions.id='ocartoV288AdvancedActions';
  drawingSection.append(actions);inner.append(drawingSection);
  if(toolbar){
   const persistent=new Set(['undo','redo','finishDraft','deleteSelected','newProject',
     'openProject','saveProject','zoomOut','zoomIn','zoomLabel']);
   const children=[...toolbar.children];
   for(const node of children){
    if(persistent.has(node.id))continue;
    if(node.classList?.contains('quick-file'))continue;
    // Accessible from the original menus / the tools drawer.
    actions.append(node);
   }
  }
  // Left sidebar: only seven original drawing-tool buttons.
  // Right sidebar: only all symbol tiles.
  for(const node of [...left.children])if(node!==toolGrid)inner.append(node);
  for(const node of [...right.children])if(node!==symbolBar)inner.append(node);
  left.replaceChildren(toolGrid);
  right.replaceChildren(symbolBar);
  // Remove visual mode/category restrictions. All symbols remain selectable.
  typeFilter.value='all';typeFilter.hidden=true;
  document.body.classList.add('ocarto-v288');
  window.renderSymbols?.();
  // Mark same menu buttons, only rename labels and expose the original panels.
  const first=menu.querySelector(':scope>details:nth-child(1)>summary');
  const second=menu.querySelector(':scope>details:nth-child(2)>summary');
  const drawMenu=[...menu.querySelectorAll(':scope>details')]
    .find(d=>d.querySelector(':scope>summary')?.textContent.trim()==='HERRAMIENTAS');
  if(first)first.textContent='ARCHIVO';
  if(second)second.textContent='EDITAR';
  if(drawMenu)drawMenu.querySelector(':scope>summary').textContent='DIBUJO';
  function option(container,title,key){
    if(!container||container.querySelector('[data-v288-open="'+key+'"]'))return;
    const button=document.createElement('button');button.type='button';
    button.textContent=title;button.dataset.v288Open=key;
    container.append(button);
  }
  const dropdown=name=>[...menu.querySelectorAll(':scope>details')].find(d=>
    d.querySelector(':scope>summary')?.textContent.trim()===name)?.querySelector('.oc-dropdown');
  option(dropdown('PLANTILLAS'),'Ver y organizar plantillas','templates');
  option(dropdown('PLANTILLAS'),'Feature Map y alturas por capas','heightFeature');
  option(dropdown('PLANTILLAS'),'Opacidad y georreferenciación','georef');
  option(dropdown('LIDAR'),'Opciones LiDAR completas','lidar');
  option(dropdown('DIBUJO'),'Edición avanzada y Bézier','drawing');
  option(dropdown('VER'),'Mostrar capas y plantillas','templates');
  const targets={
   templates:document.getElementById('templateLayerList')||document.getElementById('templateFile'),
   georef:document.getElementById('templateControls')||document.getElementById('worldFile'),
   heightFeature:document.getElementById('heightFeatureLayerControls'),
   lidar:document.getElementById('lidarCard')||document.getElementById('tiledAreaBtn'),
   drawing:drawingSection
  };
  const openPanel=(kind)=>{
   heading.textContent=kind==='lidar'?'LiDAR e IA':kind==='heightFeature'?
     'Feature Map y alturas':kind==='georef'?'Georreferenciar plantillas':
     kind==='drawing'?'Herramientas de dibujo':'Plantillas y capas';
   drawer.hidden=false;
   const element=targets[kind];
   if(element){element.scrollIntoView({block:'start',behavior:'instant'});}
   if(kind==='heightFeature'&&element?.hidden)
    document.getElementById('heightFeatureStatus')?.scrollIntoView({block:'start'});
  };
  const hide=()=>{drawer.hidden=true};
  close.addEventListener('click',hide);
  document.addEventListener('click',event=>{
   const button=event.target.closest('[data-v288-open]');
   if(!button)return;
   const type=button.dataset.v288Open;
   menu.querySelectorAll(':scope>details').forEach(d=>d.open=false);
   openPanel(type);
  });
  // Legacy menu routing now opens a drawer; the real controls are unchanged.
  menu.addEventListener('click',event=>{
   const btn=event.target.closest('[data-menu-target]');
   if(!btn)return;
   const redirects={layersNav:'templates',lidarNav:'lidar',symbolsNav:'symbols'};
   if(!redirects[btn.dataset.menuTarget])return;
   event.stopPropagation();event.preventDefault();
   menu.querySelectorAll(':scope>details').forEach(d=>d.open=false);
   if(btn.dataset.menuTarget==='symbolsNav'){
    hide();search.focus();return;
   }
   openPanel(redirects[btn.dataset.menuTarget]);
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!drawer.hidden)hide()});
  // Clicking the old side-navigation buttons also opens the matching drawer.
  for(const [id,key] of [['layersNav','templates'],['lidarNav','lidar'],['symbolsNav','symbols']]){
   const target=document.getElementById(id);
   target?.addEventListener('click',()=>{
    if(key==='symbols'){hide();search.focus();}else openPanel(key);
   },true);
  }
  // Menu is the primary navigation; the fixed map area stays unobstructed.
  window.dispatchEvent(new Event('resize'));
  const previous=document.querySelector('.top-status');
  if(previous)previous.textContent='Ocarto · v288 desarrollo';
 }
 if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(install),{once:true});
 }else requestAnimationFrame(install);
})();
