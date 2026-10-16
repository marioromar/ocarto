/* Reorganiza la interfaz en una barra de dibujo, el mapa y paneles con pestañas.
   Los controles originales se mueven, no se recrean, para conservar sus eventos. */
(() => {
  const start = () => {
    const left = document.querySelector('.left');
    const right = document.getElementById('rightPanel');
    const toolbar = document.querySelector('.toolbar');
    const menu = document.querySelector('.oc-menu');
    if (!left || !right || !toolbar || !menu || document.getElementById('workspaceTabs')) return;

    const makePanel = (id, title) => {
      const panel = document.createElement('section');
      panel.className = 'workspace-panel'; panel.id = id;
      const heading = document.createElement('h2'); heading.className = 'workspace-heading'; heading.textContent = title;
      panel.append(heading); return panel;
    };
    const oldRightChildren=Array.from(right.children);
    const oldLeftChildren=Array.from(left.children);
    const toolGrid=left.querySelector('.tool-grid');
    const symbolPanel = makePanel('symbolsWorkspace', 'Símbolos');
    const layersPanel = makePanel('layersWorkspace', 'Capas');
    const propsPanel = makePanel('propertiesWorkspace', 'Propiedades');
    const lidarPanel = makePanel('lidarWorkspace', 'LiDAR');
    const panels = [symbolPanel, layersPanel, propsPanel, lidarPanel];

    const tabs = document.createElement('div'); tabs.className = 'workspace-tabs'; tabs.id = 'workspaceTabs';
    [['symbolsWorkspace','Símbolos'],['layersWorkspace','Capas'],['propertiesWorkspace','Propiedades'],['lidarWorkspace','LiDAR']].forEach(([id,label],i)=>{
      const b=document.createElement('button'); b.type='button'; b.className='workspace-tab'; b.textContent=label;
      b.setAttribute('role','tab'); b.setAttribute('aria-controls',id);
      b.onclick=()=>activate(id); tabs.append(b);
    });
    function activate(id){
      panels.forEach(p=>{const active=p.id===id;p.hidden=!active;p.setAttribute('aria-hidden',String(!active))});
      tabs.querySelectorAll('.workspace-tab').forEach(b=>{const active=b.getAttribute('aria-controls')===id;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active))});
      right.dataset.workspace=id;
    }
    right.replaceChildren(document.getElementById('closeMobilePanels') || document.createElement('span'), tabs, ...panels);
    panels.forEach(p=>right.append(p));

    const move=(node,panel)=>{if(node&&panel)panel.append(node)};
    // Panel de símbolos
    ['#symbolSearch','#symbolTypeFilter','#symbolList','#symbolContextMenu','#activeSymbolLabel','#symbolStatusSelect','#symbolScaleHint'].forEach(sel=>{
      const node=document.querySelector(sel); if(node){
        let holder=node;
        if(node.id==='symbolSearch'||node.id==='symbolTypeFilter') holder=node.closest('.symbol-controls');
        if(node.id==='symbolStatusSelect') holder=node.closest('label');
        if(node.id==='symbolScaleHint') holder=node.closest('.card');
        move(holder,symbolPanel);
      }
    });
    // Conserva la tarjeta de preparación y el editor de vértices en Propiedades.
    const prepCard=document.getElementById('mapPreparationCard');
    if(prepCard){const title=prepCard.querySelector('.card-title')?.textContent.trim()||'Preparar mapa';const body=document.createElement('div');body.className='disclosure-body';Array.from(prepCard.children).slice(1).forEach(node=>body.append(node));const disclosure=document.createElement('details');disclosure.className='workspace-disclosure preparation-disclosure';const summary=document.createElement('summary');summary.textContent=title;disclosure.append(summary,body);prepCard.replaceChildren(disclosure);lidarPanel.append(prepCard)}
    move(document.getElementById('vertexEditor'),propsPanel);
    oldLeftChildren.forEach(node=>{if(node!==toolGrid&&node!==prepCard&&node.parentElement===left)propsPanel.append(node)});
    if(toolGrid){left.replaceChildren(toolGrid);toolGrid.setAttribute('aria-label','Herramientas de dibujo');decorateDrawingTools(toolGrid)}

    // Agrupa las secciones que ya existían en la columna de datos.
    oldRightChildren.forEach(node=>{
      if(node===tabs||panels.includes(node)||node.id==='closeMobilePanels')return;
      if(node.id==='lidarCard'){move(node,lidarPanel);groupLidarControls(node)}
      else if(node.querySelector?.('#templateLayerList, #vectorLayerList'))move(node,layersPanel);
      else move(node,propsPanel);
    });
    const close=document.getElementById('closeMobilePanels'); if(close){close.textContent='✕ Cerrar panel';right.prepend(close)}
    activate('symbolsWorkspace');
    const statusBar=document.querySelector('.canvas-area > .coords');
    if(statusBar)document.querySelector('.app')?.append(statusBar);
    installResponsiveDock();

    // Recupera los menús de edición y vista de la interfaz de escritorio.
    const findMenu=(label)=>Array.from(menu.querySelectorAll('details')).find(d=>d.querySelector('summary')?.textContent.trim()===label);
    const ensureMenu=(label)=>{let d=findMenu(label);if(d)return d;d=document.createElement('details');const s=document.createElement('summary');s.textContent=label;const box=document.createElement('div');box.className='oc-dropdown';d.append(s,box);menu.append(d);return d};
    const menuBox=(label)=>ensureMenu(label).querySelector('.oc-dropdown');
    const editBox=menuBox('EDICIÓN'), viewBox=menuBox('VER'), toolsBox=menuBox('HERRAMIENTAS'), fileBox=menuBox('ARCHIVO');
    const menuActionIds=new Set(['newProject','openProject','restoreLocalBackup','saveProject','exportMap','undo','redo','selectAllObjects','duplicateSelected','copySelected','cutSelected','pasteSelected','deleteSelected','clearMap','zoomIn','zoomOut','layersNav','symbolsNav','selectMode','smoothConservative','smoothGeometric','validateGeometry','measureSelection','detectBtn','terrainBtn','exportContours','projectSettings','mapCrs']);
    menu.querySelectorAll('[data-menu-target]').forEach(button=>{if(menuActionIds.has(button.dataset.menuTarget))button.remove()});
    ['#extendDistance','#joinSelectedLines','#createParallel'].forEach(sel=>{const node=document.querySelector(sel);if(node)editBox.append(node.parentElement)});
    ['ARCHIVO','EDICIÓN','VER','HERRAMIENTAS','LIDAR','CONFIGURACIÓN'].forEach(label=>{const item=findMenu(label);if(item)menu.append(item)});
    const keep=new Set(['undo','redo','cutSelected','copySelected','pasteSelected','finishDraft','deleteSelected','zoomIn','zoomOut','restoreLocalBackup','openProject','saveProject']);
    const category=(el)=>{
      const id=el.id||'', text=(el.innerText||el.value||el.title||'').toLowerCase();
      if(/save|open|backup|export|import|project|ocad|geojson|kmz|clearMap/i.test(id+' '+text))return fileBox;
      if(/zoom|scale|grid|view|template|reference|streetview/i.test(id+' '+text))return viewBox;
      if(/select|copy|cut|paste|duplicate|distribut|align|measure|delete|undo|redo|vertex|line|area|curve|stamp|road|width|smooth|simplif|split|join|parallel|extend|segment|rotate|flip|fill/i.test(id+' '+text))return editBox;
      return toolsBox;
    };
    const arrange=()=>Array.from(toolbar.children).forEach(el=>{
      if(el.id==='showMobilePanels'||el.id==='newProject'||el.classList.contains('zoom-label')||el.tagName==='SELECT'&&el.hidden)return;
      if(keep.has(el.id)||el.classList.contains('hidden-input'))return;
      category(el).append(el);
    });
    const firstFileAction=document.getElementById('restoreLocalBackup');
    ['newProject','openProject','saveProject'].forEach(id=>{const action=document.getElementById(id);if(action&&firstFileAction)toolbar.insertBefore(action,firstFileAction)});
    decorateQuickFiles(toolbar);
    decorateCoreActions(toolbar);
    arrange();
    new MutationObserver(arrange).observe(toolbar,{childList:true});
    const addAction=(menuName,id,label,parent=null)=>{const box=parent||menuBox(menuName);if(box.querySelector(`[data-menu-target="${id}"]`))return;const b=document.createElement('button');b.type='button';b.dataset.menuTarget=id;b.textContent=label;box.append(b);return b};
    const addGroup=(menuName,label)=>{const d=document.createElement('details');d.className='oc-submenu';const summary=document.createElement('summary');summary.textContent=label;const box=document.createElement('div');box.className='oc-dropdown';d.append(summary,box);menuBox(menuName).append(d);return box};
    [['ARCHIVO','newProject','Nuevo proyecto'],['ARCHIVO','openProject','Abrir proyecto'],['ARCHIVO','saveProject','Guardar proyecto'],['ARCHIVO','exportMap','Exportar GeoJSON'],['EDICIÓN','undo','Deshacer'],['EDICIÓN','redo','Rehacer'],['EDICIÓN','selectAllObjects','Seleccionar todo'],['EDICIÓN','duplicateSelected','Duplicar'],['EDICIÓN','copySelected','Copiar'],['EDICIÓN','cutSelected','Cortar'],['EDICIÓN','pasteSelected','Pegar'],['EDICIÓN','deleteSelected','Eliminar selección'],['EDICIÓN','clearMap','Limpiar elementos del mapa'],['VER','zoomIn','Acercar'],['VER','zoomOut','Alejar'],['VER','layersNav','Capas'],['VER','symbolsNav','Símbolos'],['LIDAR','lidarNav','Abrir panel LiDAR'],['HERRAMIENTAS','selectMode','Herramienta seleccionar'],['HERRAMIENTAS','validateGeometry','Validar geometría'],['HERRAMIENTAS','measureSelection','Medir longitudes y áreas'],['HERRAMIENTAS','detectBtn','Detectar elementos'],['HERRAMIENTAS','terrainBtn','Preparar MDT'],['HERRAMIENTAS','exportContours','Exportar curvas'],['HERRAMIENTAS','projectSettings','Ajustes del proyecto'],['HERRAMIENTAS','mapCrs','Sistema de coordenadas']].forEach(x=>addAction(...x));
    const smoothBox=addGroup('EDICIÓN','Suavizar');addAction('EDICIÓN','smoothConservative','Suavizar conservador',smoothBox);addAction('EDICIÓN','smoothGeometric','Suavizar geométrico',smoothBox);
    toolbar.querySelectorAll('.mobile-panel-button').forEach(b=>b.textContent='☰ Paneles');
  };

  function decorateDrawingTools(grid){
    const drawings={
      select:'<path d="M5 3v18l5-5 3 5 3-1-3-5 7-2z" fill="currentColor" stroke="none"/>',
      'select-rect':'<rect x="3" y="4" width="18" height="16" rx="2" stroke-dasharray="4 3"/><path d="M14 17l4 4"/>',
      point:'<circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>',
      line:'<path d="M4 19l6-11 5 6 5-9"/><circle cx="4" cy="19" r="1.6" fill="currentColor"/><circle cx="10" cy="8" r="1.6" fill="currentColor"/><circle cx="15" cy="14" r="1.6" fill="currentColor"/><circle cx="20" cy="5" r="1.6" fill="currentColor"/>',
      'continue-line':'<path d="M3 18l7-8 5 5 6-8m-6 0h6v6"/><circle cx="3" cy="18" r="1.5" fill="currentColor"/>',
      area:'<path d="M5 6l9-3 7 6-2 10-11 2-5-8z" fill="currentColor" fill-opacity=".16"/><circle cx="5" cy="6" r="1.4" fill="currentColor"/><circle cx="19" cy="19" r="1.4" fill="currentColor"/>',
      'expand-area':'<path d="M3 9l8-6 8 5-2 10-8 3-6-6z" fill="currentColor" fill-opacity=".12"/><path d="M13 16l8 5m-1-6l1 6-6-1"/>',
      'curve-line':'<path d="M3 18C8 18 7 5 13 7s4 10 8 3"/><circle cx="3" cy="18" r="1.6" fill="currentColor"/><circle cx="21" cy="10" r="1.6" fill="currentColor"/>',
      'curve-area':'<path d="M4 13C3 5 12 2 18 6c6 5 1 14-7 14-4 0-7-2-7-7z" fill="currentColor" fill-opacity=".13"/><circle cx="4" cy="13" r="1.4" fill="currentColor"/>',
      freehand:'<path d="M3 17c3-12 4 7 7-4s4 6 6-3 2 4 5-5"/><path d="M17 19l4 2"/>'
    };
    for(const button of grid.querySelectorAll('.tool')){
      const mark=button.querySelector('b'),art=drawings[button.dataset.tool];if(!mark||!art)continue;
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
      svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
      svg.setAttribute('stroke-width','2.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
      svg.innerHTML=art;mark.replaceChildren(svg);
      button.setAttribute('aria-label',button.querySelector('span')?.textContent.trim()||button.dataset.tool);
    }
  }
  function decorateCoreActions(toolbar){
    const actions={undo:['↶','Deshacer'],redo:['↷','Rehacer'],finishDraft:['✓','Terminar trazado'],deleteSelected:['⌫','Eliminar'],zoomIn:['＋','Acercar'],zoomOut:['−','Alejar']};
    for(const [id,[icon,label]] of Object.entries(actions)){
      const button=toolbar.querySelector('#'+id); if(!button)continue;
      button.classList.add('core-tool-icon'); button.title=label; button.setAttribute('aria-label',label); button.textContent=icon;
    }
  }
  function decorateQuickFiles(toolbar){
    const shapes={
      newProject:'<path d="M5 3h10l4 4v14H5z"/><path d="M9 12h6m-3-3v6"/>',
      openProject:'<path d="M3 8V5h7l2 2h9v3"/><path d="M3 10h18l-2 11H5z"/>',
      saveProject:'<path d="M4 3h14l3 3v15H4z"/><path d="M8 3v6h9V3M8 21v-8h9v8"/>'
    };
    for(const [id,shape] of Object.entries(shapes)){
      const button=toolbar.querySelector('#'+id);if(!button)continue;
      const text=button.textContent.replace(/^[^\p{L}]+/u,'').trim();
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
      svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','2.6');
      svg.setAttribute('stroke-linejoin','round');svg.setAttribute('stroke-linecap','round');svg.innerHTML=shape;
      const label=document.createElement('span');label.textContent=text;button.replaceChildren(svg,label);
    }
  }
  function groupLidarControls(card){
    if(!card||card.querySelector('.lidar-disclosure'))return;
    const heading=card.querySelector(':scope > .card-title');
    const children=Array.from(card.children);
    const title=(text)=>children.find(n=>n.classList?.contains('card-title')&&n.textContent.includes(text));
    const node=(id)=>card.querySelector('#'+id);
    const groups=[
      {label:'1 · Cargar datos LiDAR',start:node('pointFile')?.previousElementSibling,end:node('lidarProgress'),open:true},
      {label:'2 · Ajustes de detección',start:node('lidarProgress')?.nextElementSibling,end:node('detectBtn')},
      {label:'3 · Terreno, curvas y vaguadas',start:node('terrainBtn'),end:title('Indicadores LiDAR de vegetación')?.previousElementSibling},
      {label:'4 · Vegetación por alturas',start:title('Indicadores LiDAR de vegetación'),end:title('IA por ejemplos de vegetación')?.previousElementSibling},
      {label:'5 · Aprender vegetación por ejemplos',start:title('IA por ejemplos de vegetación'),end:node('vectorizeStructures')?.previousElementSibling},
      {label:'6 · Edificios, muros y rocas',start:node('vectorizeStructures'),end:title('Claros y arbolado alto')?.previousElementSibling},
      {label:'7 · Claros, árboles e imágenes',start:title('Claros y arbolado alto'),end:node('detectAllLidarElements')?.previousElementSibling},
      {label:'8 · Revisar y exportar candidatos',start:node('detectAllLidarElements'),end:children.at(-1)}
    ].filter(g=>g.start&&g.end);
    groups.sort((a,b)=>children.indexOf(b.start)-children.indexOf(a.start)).forEach(group=>{
      const first=children.indexOf(group.start),last=children.indexOf(group.end);if(first<0||last<first)return;
      const details=document.createElement('details');details.className='workspace-disclosure lidar-disclosure';details.open=!!group.open;
      const summary=document.createElement('summary');summary.textContent=group.label;
      const body=document.createElement('div');body.className='disclosure-body';details.append(summary,body);
      card.insertBefore(details,group.start);children.slice(first,last+1).forEach(child=>body.append(child));
    });
    if(heading)heading.after(...Array.from(card.querySelectorAll(':scope > .lidar-disclosure')));
  }
  function installResponsiveDock(){
    const button=document.getElementById('showMobilePanels'),close=document.getElementById('closeMobilePanels');
    button?.addEventListener('click',()=>document.body.classList.add('show-right'));
    close?.addEventListener('click',()=>document.body.classList.remove('show-right'));
    document.addEventListener('keydown',event=>{if(event.key==='Escape')document.body.classList.remove('show-right')});
    const update=()=>document.documentElement.style.setProperty('--app-topbar-height',`${document.querySelector('.topbar')?.getBoundingClientRect().height||54}px`);
    update(); if(window.ResizeObserver){const observer=new ResizeObserver(update);const topbar=document.querySelector('.topbar');if(topbar)observer.observe(topbar)}else window.addEventListener('resize',update,{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();


/* v235: paleta compacta, favoritos arriba y pulsación larga. */
(() => {
  const boot=()=>{
    const list=document.getElementById('symbolList'),panel=document.getElementById('symbolsWorkspace');
    if(!list||!panel)return;
    const key='ocarto.symbolFavorites.v1';
    let favorites=[];
    try{favorites=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(favorites))favorites=[]}catch{}
    const box=document.createElement('section');box.className='oc-favorites';box.setAttribute('aria-label','Símbolos favoritos');
    const heading=document.createElement('div');heading.className='oc-favorites-title';heading.textContent='★ Favoritos';
    const grid=document.createElement('div');grid.className='oc-favorites-grid';box.append(heading,grid);
    list.before(box);
    const save=()=>{try{localStorage.setItem(key,JSON.stringify(favorites))}catch{}};
    let updating=false;
    function refresh(){
      if(updating)return;updating=true;
      const buttons=[...list.querySelectorAll('.symbol-option[data-symbol-id]')];
      grid.replaceChildren();
      for(const id of favorites){
        const original=buttons.find(b=>b.dataset.symbolId===id);
        if(!original)continue;
        const clone=original.cloneNode(true);clone.classList.add('oc-favorite-symbol');
        clone.onclick=()=>original.click();
        clone.addEventListener('contextmenu',e=>{e.preventDefault();original.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:e.clientX,clientY:e.clientY}))});
        grid.append(clone);
      }
      box.hidden=!grid.children.length;
      buttons.forEach(b=>{b.classList.toggle('is-favorite',favorites.includes(b.dataset.symbolId));b.title+=(favorites.includes(b.dataset.symbolId)?' ★':'')});
      updating=false;
    }
    new MutationObserver(()=>queueMicrotask(refresh)).observe(list,{childList:true});
    refresh();
    const context=document.getElementById('symbolContextMenu');
    if(context){
      const star=document.createElement('button');star.type='button';star.className='oc-favorite-action';star.textContent='★ Añadir a favoritos';star.setAttribute('role','menuitem');context.append(star);
      let target=null;
      document.addEventListener('contextmenu',e=>{const b=e.target.closest?.('[data-symbol-id]');if(b){target=b.dataset.symbolId;star.textContent=favorites.includes(target)?'★ Quitar de favoritos':'★ Añadir a favoritos'}},true);
      star.addEventListener('click',()=>{if(!target)return;favorites=favorites.includes(target)?favorites.filter(x=>x!==target):[...favorites,target];save();context.hidden=true;refresh()});
      let timer=null,startX=0,startY=0;
      const clear=()=>{if(timer){clearTimeout(timer);timer=null}};
      panel.addEventListener('pointerdown',e=>{
        const b=e.target.closest?.('[data-symbol-id]');if(!b||e.button!==0)return;
        clear();startX=e.clientX;startY=e.clientY;
        timer=setTimeout(()=>{
          timer=null;target=b.dataset.symbolId;
          star.textContent=favorites.includes(target)?'★ Quitar de favoritos':'★ Añadir a favoritos';
          b.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:startX,clientY:startY}));
        },650);
      });
      panel.addEventListener('pointerup',clear);panel.addEventListener('pointercancel',clear);
      panel.addEventListener('pointermove',e=>{if(Math.hypot(e.clientX-startX,e.clientY-startY)>12)clear()});
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
