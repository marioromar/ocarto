(()=>{
  const bar=document.querySelector('.toolbar');if(!bar||document.getElementById('duplicateDistributeLine'))return;
  const button=document.createElement('button');button.id='duplicateDistributeLine';button.type='button';button.className='action edit-transform';button.textContent='Duplicar y repartir';button.title='Repite los símbolos seleccionados a intervalos regulares siguiendo una línea';bar.append(button);
  const editable=f=>f&&!f.locked&&symbolStatus(f.symbol)==='normal'&&!vectorLayerFor(f)?.referenceOnly;
  const toWorld=p=>S.georef&&S.renderGeo?localToWorld(p):S.cloudTransform?.scale?{x:S.cloudTransform.centerX+p.x/S.cloudTransform.scale,y:S.cloudTransform.centerY-p.y/S.cloudTransform.scale}:p;
  const toLocal=p=>S.georef&&S.renderGeo?worldToLocal(p.x,p.y):S.cloudTransform?.scale?{x:(p.x-S.cloudTransform.centerX)*S.cloudTransform.scale,y:-(p.y-S.cloudTransform.centerY)*S.cloudTransform.scale}:p;
  button.onclick=()=>{try{
    const refs=S.multiSelection?.length?S.multiSelection:(S.selection?[S.selection]:[]),chosen=refs.filter(r=>r.collection==='feature').map(r=>S.features[r.index]).filter(editable),lines=chosen.filter(f=>f.type==='line'),templates=chosen.filter(f=>f.type==='point');
    if(lines.length!==1||!templates.length)throw Error('Selecciona una línea y uno o varios símbolos puntuales para copiar');
    if(!activeVectorLayer())throw Error('Activa primero una capa editable');
    const line=lines[0],sampled=line.curve==='bezier'||line.points.some(p=>p.tangent||p.inTangent||p.outTangent)?OcartoMeasureTools.sample(line.points,false,96,true):line.points.map(p=>({x:p.x,y:p.y}));
    const localPath=sampled.map(p=>[p.x+(line.x||0),p.y+(line.y||0)]),worldPath=localPath.map(p=>{const q=toWorld({x:p[0],y:p[1]});return[q.x,q.y]});
    const raw=prompt(`Separación entre copias en metros${S.georef?'':' (unidades locales del mapa)'}`,'5');if(raw===null)return;const spacing=Number(String(raw).trim().replace(',','.'));if(!Number.isFinite(spacing)||spacing<=0||spacing>10000)throw Error('Indica una separación mayor que 0 y hasta 10 000');
    const layout=OcartoDistributeTools.distributeAlongPath(worldPath,spacing,{maxCount:2000});if(!layout.positions.length)throw Error('La línea es más corta que la separación indicada');
    const before=snapshotMap(),layer=activeVectorLayer(),copies=[],batch=`distributed-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;layout.positions.forEach((p,i)=>{const local=toLocal(p),source=templates[i%templates.length],copy=JSON.parse(JSON.stringify(source));copy.id=`${batch}-${i}`;copy.x=local.x;copy.y=local.y;copy.layerId=layer.id;copy.locked=false;copy.properties={...(copy.properties||{}),derivedFrom:'distributed-along-line',sourceFeatureId:source.id||null,distributionLineId:line.id||null,spacing};S.features.push(copy);copies.push({collection:'feature',index:S.features.length-1})});
    recordMapEdit(before);S.selection=null;S.multiSelection=copies;S.selectedVertices=[];renderVectorLayers();draw();toast(`${copies.length} copia${copies.length===1?'':'s'} repartida${copies.length===1?'':'s'} a ${spacing} ${S.georef?'m':'unidades'}`);
  }catch(err){toast('Duplicar y repartir: '+err.message)}};
})();
