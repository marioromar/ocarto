(()=>{
  const bar=document.querySelector('.toolbar');
  if(!bar||document.getElementById('importOsmBuildings'))return;
  const button=document.createElement('button');button.id='importOsmBuildings';button.type='button';button.className='action';button.textContent='Edificios OSM';button.title='Importa los contornos de edificios de OpenStreetMap dentro del área seleccionada';bar.appendChild(button);
  button.onclick=async()=>{
    try{
      const sel=S.selection,f=sel?.collection==='feature'?S.features[sel.index]:null;
      if(!f||f.type!=='area'||f.locked||symbolStatus(f.symbol)!=='normal'||vectorLayerFor(f)?.referenceOnly)throw Error('Selecciona un área editable que delimite la zona urbana');
      if(!S.georef||!S.renderGeo)throw Error('Georreferencia el mapa antes de importar edificios');
      if(f.curve==='bezier'||f.points?.some(p=>p.tangent||p.inTangent||p.outTangent))throw Error('El área debe tener un contorno recto');
      if(!Array.isArray(f.points)||f.points.length<3||f.points.length>399)throw Error('El área debe tener de 3 a 399 vértices');
      const crs=OcartoGeoCrs.normalizeGeoCrs(document.getElementById('mapCrs').value),fx=f.x||0,fy=f.y||0;
      const latLon=f.points.map(p=>{const w=localToWorld({x:p.x+fx,y:p.y+fy}),g=OcartoGeoCrs.transformCoordinate(w.x,w.y,crs,'EPSG:4326');return[g.y,g.x]});
      const query=OcartoOsmBuildings.osmBuildingQuery(latLon);button.disabled=true;button.textContent='Consultando OSM…';
      const response=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:`data=${encodeURIComponent(query)}`});
      if(!response.ok)throw Error(response.status===429?'OpenStreetMap está limitando las consultas; inténtalo más tarde':`OpenStreetMap respondió ${response.status}`);
      const result=OcartoOsmBuildings.parseOsmBuildingWays(await response.json());
      if(!result.features.length)throw Error('No se encontraron edificios registrados en OpenStreetMap dentro del área');
      const layerId=`osm-buildings-${Date.now()}`,layer={id:layerId,name:'Edificios OSM · revisar',color:'#252525',visible:true,source:'openstreetmap',attribution:'© OpenStreetMap contributors · ODbL',reviewRequired:true};
      const imported=result.features.map(item=>{const wgs=item.geometry.coordinates[0].slice(0,-1),points=wgs.map(([lon,lat])=>{const w=OcartoGeoCrs.transformCoordinate(lon,lat,'EPSG:4326',crs),q=worldToLocal(w.x,w.y);return{...q,rawX:w.x,rawY:w.y,vertexType:'corner'}});return{x:0,y:0,type:'area',points,symbol:'building-area',layerId,transparent:false,osmProperties:{...item.properties,attribution:'© OpenStreetMap contributors · ODbL',review_required:true}}});
      const before=snapshotMap();S.vectorLayers.push(layer);S.features.push(...imported);S.activeLayerId=layerId;S.selection=null;S.multiSelection=[];S.selectedVertices=[];recordMapEdit(before);renderVectorLayers();draw();toast(`${imported.length} edificios importados como contornos editables; revisa y corrige su encaje`);
    }catch(err){toast('Edificios OSM: '+err.message)}finally{button.disabled=false;button.textContent='Edificios OSM'}
  };
})();
