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
    move(document.getElementById('mapPreparationCard'),propsPanel);
    move(document.getElementById('vertexEditor'),propsPanel);
    oldLeftChildren.forEach(node=>{if(node!==toolGrid&&node.parentElement===left)propsPanel.append(node)});
    if(toolGrid){left.replaceChildren(toolGrid);toolGrid.setAttribute('aria-label','Herramientas de dibujo')}

    // Agrupa las secciones que ya existían en la columna de datos.
    oldRightChildren.forEach(node=>{
      if(node===tabs||panels.includes(node)||node.id==='closeMobilePanels')return;
      if(node.id==='lidarCard')move(node,lidarPanel);
      else if(node.querySelector?.('#templateLayerList, #vectorLayerList'))move(node,layersPanel);
      else move(node,propsPanel);
    });
    const close=document.getElementById('closeMobilePanels'); if(close){close.textContent='✕ Cerrar panel';right.prepend(close)}
    activate('symbolsWorkspace');

    // Recupera los menús de edición y vista de la interfaz de escritorio.
    const findMenu=(label)=>Array.from(menu.querySelectorAll('details')).find(d=>d.querySelector('summary')?.textContent.trim()===label);
    const ensureMenu=(label)=>{let d=findMenu(label);if(d)return d;d=document.createElement('details');const s=document.createElement('summary');s.textContent=label;const box=document.createElement('div');box.className='oc-dropdown';d.append(s,box);menu.append(d);return d};
    const menuBox=(label)=>ensureMenu(label).querySelector('.oc-dropdown');
    const editBox=menuBox('EDICIÓN'), viewBox=menuBox('VER'), toolsBox=menuBox('HERRAMIENTAS'), fileBox=menuBox('ARCHIVO');
    ['#extendDistance','#joinSelectedLines','#createParallel'].forEach(sel=>{const node=document.querySelector(sel);if(node)editBox.append(node.parentElement)});
    ['ARCHIVO','EDICIÓN','VER','HERRAMIENTAS','LIDAR','CONFIGURACIÓN'].forEach(label=>{const item=findMenu(label);if(item)menu.append(item)});
    const keep=new Set(['undo','redo','cutSelected','copySelected','pasteSelected','finishDraft','deleteSelected','zoomIn','zoomOut']);
    const category=(el)=>{
      const id=el.id||'', text=(el.innerText||el.value||el.title||'').toLowerCase();
      if(/save|open|backup|export|import|project|ocad|geojson|kmz|clearMap/i.test(id+' '+text))return fileBox;
      if(/zoom|scale|grid|view|template|reference|streetview/i.test(id+' '+text))return viewBox;
      if(/select|copy|cut|paste|duplicate|delete|undo|redo|vertex|line|area|curve|stamp|road|width|smooth|simplif|split|join|parallel|extend|segment|rotate|flip|fill/i.test(id+' '+text))return editBox;
      return toolsBox;
    };
    const arrange=()=>Array.from(toolbar.children).forEach(el=>{
      if(el.id==='showMobilePanels'||el.classList.contains('zoom-label')||el.tagName==='SELECT'&&el.hidden)return;
      if(keep.has(el.id)||el.classList.contains('hidden-input'))return;
      category(el).append(el);
    });
    arrange();
    new MutationObserver(arrange).observe(toolbar,{childList:true});
    toolbar.querySelectorAll('.mobile-panel-button').forEach(b=>b.textContent='☰ Paneles');
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
