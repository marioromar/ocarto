/* Ocarto v249 — panel de auditoría OCAD. Solo lectura, sin aplicar símbolos. */
(function () {
  'use strict';
  function make(tag, value, style) {
    const el=document.createElement(tag);
    if (value!==undefined && value!==null) el.textContent=String(value);
    if (style) el.style.cssText=style;
    return el;
  }
  function render(report) {
    const dialog=make('dialog',null,
      'box-sizing:border-box;width:min(940px,96vw);max-width:96vw;max-height:90vh;'+
      'overflow:auto;border:1px solid #536779;border-radius:15px;background:#17232f;'+
      'color:#eff5f7;box-shadow:0 20px 65px #0009;padding:22px;font:13px/1.45 system-ui,sans-serif');
    const heading=make('h2','Revisión del catálogo OCAD', 'font-size:21px;margin:0 0 8px');
    const info=make('p',report.fileName+' · OCAD '+report.ocadVersion+' · '+report.totals.symbols+
      ' símbolos · '+report.totals.colors+' tintas · '+report.totals.objects+
      ' objetos', 'color:#c6d6dc;margin:0 0 8px');
    const safety=make('p','SOLO LECTURA · Los símbolos, colores y prioridades de Ocarto no se han modificado.',
      'background:#27453a;color:#d0f1df;border:1px solid #477763;padding:10px;border-radius:8px');
    const state=make('p',report.valid?'Estructura leída sin errores de consistencia detectados. Pendiente de contraste visual con OCAD.':
      'Se han detectado inconsistencias: los datos no son aptos para valores predeterminados.',
      'font-weight:650;margin:10px 0');
    dialog.append(heading,info,safety,state);
    const alerts=make('div',null,'margin:8px 0 15px');
    for(const item of report.errors){
      alerts.append(make('p','ERROR · '+item,'color:#ffb6b6;margin:4px 0'));
    }
    for(const item of report.warnings){
      alerts.append(make('p','REVISAR · '+item,'color:#f8d99e;margin:4px 0'));
    }
    dialog.append(alerts);
    const controls=make('div',null,'display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:13px 0');
    const symbolTab=make('button','Símbolos ('+report.totals.symbols+')');
    const colorTab=make('button','Tintas y orden ('+report.totals.colors+')');
    const search=make('input');search.type='search';search.placeholder='Buscar nombre o código';
    search.setAttribute('aria-label','Filtrar símbolos o colores');
    search.style.cssText='min-width:160px;flex:1;max-width:330px;border:1px solid #7b8d99;'+
      'background:#edf4f7;border-radius:8px;padding:10px;color:#10202b';
    for(const b of [symbolTab,colorTab]){
      b.type='button';b.style.cssText='padding:10px;border:1px solid #6a8292;background:#273846;'+
        'color:#e4eef1;border-radius:8px;cursor:pointer';
    }
    controls.append(symbolTab,colorTab,search);dialog.append(controls);
    const scroller=make('div',null,'max-height:42vh;overflow:auto;border:1px solid #516677;border-radius:9px');
    dialog.append(scroller);
    let tab='symbols';
    function show() {
      symbolTab.style.background=tab==='symbols'?'#176b58':'#273846';
      colorTab.style.background=tab==='colors'?'#176b58':'#273846';
      scroller.replaceChildren();
      const table=make('table',null,'border-collapse:collapse;width:100%;font-size:12px');
      const thead=make('thead'),tr=make('tr');
      const headings=tab==='symbols'
        ? ['Código OCAD','Descripción','Tipo','Tintas','Usos en mapa','Comprobación']
        : ['Posición OCAD','Núm. tinta','Descripción','Color','CMYK','Opacidad','Sobreimpresión'];
      for(const name of headings)tr.append(make('th',name,
        'position:sticky;top:0;background:#2a3b49;border-bottom:1px solid #6b8291;'+
        'text-align:left;padding:9px;white-space:nowrap'));
      thead.append(tr);table.append(thead);
      const body=make('tbody'),query=search.value.trim().toLowerCase();
      const entries=(tab==='symbols'?report.symbols:report.colors).filter(item =>
        !query || [item.number,item.name,item.kind, ...(item.inks||[])].join(' ').toLowerCase().includes(query));
      for (const item of entries) {
        const row=make('tr');
        const cells=tab==='symbols'
          ? [item.number,item.name,item.kind,item.inks.join(', ')||'—',item.usedObjects,
              item.missingInks.length?'Faltan tintas: '+item.missingInks.join(', '):'Por validar']
          : [item.printIndex,item.number,item.name,item.rgb+' ',item.cmyk.join(' / '),item.opacity+' %',
              item.overprint?'Sí':'No'];
        for(let i=0;i<cells.length;i++){
          const td=make('td',cells[i],'padding:8px;border-bottom:1px solid #3b4d5d;vertical-align:middle');
          if (tab==='colors'&&i===3) {
            const sample=make('span',null,'display:inline-block;width:21px;height:21px;margin-right:8px;'+
              'border:1px solid #ddd;vertical-align:middle;border-radius:3px;background:'+item.rgb);
            td.prepend(sample);
          }
          row.append(td);
        }
        body.append(row);
      }
      table.append(body);scroller.append(table);
      if(!entries.length)scroller.append(make('p','No hay coincidencias','padding:12px'));
    }
    symbolTab.onclick=()=>{tab='symbols';show()};
    colorTab.onclick=()=>{tab='colors';show()};
    search.oninput=show;
    show();
    dialog.append(make('p','La posición de impresión se muestra en el orden leído del archivo. '+
      'No se convertirá en prioridad predeterminada hasta contrastarla en OCAD 2018.',
      'color:#d7b67c;font-size:12px'));
    const actions=make('div',null,'display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:15px');
    const download=make('button','Descargar informe JSON');
    const close=make('button','Cerrar sin cambios');
    for(const b of [download,close]){
      b.type='button';b.style.cssText='padding:10px 13px;background:#e9f2f5;color:#17232f;'+
        'border:0;border-radius:8px;font-weight:700;cursor:pointer';
    }
    download.onclick=()=>{
      const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=(report.fileName.replace(/\.ocd$/i,'').replace(/[^\w.-]+/g,'_')||'ocad')+
        '-revision-simbolos.json';
      document.body.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
    };
    close.onclick=()=>dialog.close();
    actions.append(download,close);dialog.append(actions);
    document.body.append(dialog);
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});
    if(typeof dialog.showModal==='function')dialog.showModal();
    else dialog.setAttribute('open','');
  }
  function setup() {
    const archive=[...document.querySelectorAll('.oc-menu details')].find(node=>
      node.querySelector('summary')?.textContent.trim().toUpperCase()==='ARCHIVO');
    const menu=archive?.querySelector('.oc-dropdown');
    if(!menu || document.getElementById('ocartoReviewOcadCatalog'))return;
    const button=make('button','Revisar símbolos y tintas OCAD…');
    button.id='ocartoReviewOcadCatalog';button.type='button';
    button.title='Leer catálogo OCAD 2018 sin aplicarlo a los símbolos de Ocarto';
    const input=make('input');input.type='file';input.accept='.ocd';input.hidden=true;
    input.id='ocartoReviewOcadFile';
    menu.append(make('hr'),button);document.body.append(input);
    button.onclick=()=>input.click();
    input.onchange=async()=>{
      const file=input.files?.[0];input.value='';
      if(!file)return;
      try {
        if(!/\.ocd$/i.test(file.name))throw Error('Selecciona un archivo .ocd');
        if(file.size>250*1024*1024)throw Error('Máximo 250 MB por archivo OCAD');
        if(!window.OcartoEditableOcad?.parse||!window.OcartoOcadCatalogReview?.inspect)
          throw Error('Los módulos de lectura OCAD no están cargados');
        button.disabled=true;button.textContent='Revisando OCAD…';
        const parsed=window.OcartoEditableOcad.parse(await file.arrayBuffer());
        const report=window.OcartoOcadCatalogReview.inspect(parsed,file.name);
        render(report);
      } catch(error) {
        const failure=make('dialog',null,
          'border:1px solid #af7474;border-radius:12px;background:#17232f;color:#fff;'+
          'padding:22px;max-width:90vw');
        failure.append(make('h3','No se pudo revisar el OCAD'),make('p',error.message||String(error)));
        const close=make('button','Cerrar');close.onclick=()=>failure.close();
        failure.append(close);document.body.append(failure);
        failure.addEventListener('close',()=>failure.remove(),{once:true});
        if(typeof failure.showModal==='function')failure.showModal();else failure.setAttribute('open','');
      } finally {
        button.disabled=false;button.textContent='Revisar símbolos y tintas OCAD…';
      }
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
