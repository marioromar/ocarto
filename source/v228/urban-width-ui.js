(()=>{
  const bar=document.querySelector('.toolbar');
  if(!bar||document.getElementById('adjustUrbanWidths'))return;
  const button=document.createElement('button');button.id='adjustUrbanWidths';button.type='button';button.className='action';button.textContent='Ajustar calles zona';button.title='Aumenta el ancho de las calles y estrecha los edificios dentro del área urbana seleccionada';bar.appendChild(button);
  const roadSymbols=new Set(['path','road-wide','road','vehicle-track','small-footpath','small-track','mtbo-track-fast','mtbo-path-fast','mtbo-track-medium','mtbo-path-medium','mtbo-track-slow','mtbo-track-very-slow']);
  const parse=(text,label,min,max)=>{const n=Number(String(text).trim().replace(',','.'));if(!Number.isFinite(n)||n<min||n>max)throw Error(`${label}: introduce un valor entre ${min} y ${max} mm`);return n};
  const editable=f=>f&&!f.locked&&symbolStatus(f.symbol)==='normal'&&!vectorLayerFor(f)?.referenceOnly;
  const contains=(xy,outer,holes)=>OcartoStampTools.contains(xy,outer,holes);
  const ringsInside=(rings,outer,holes)=>rings.every(r=>r.every((p,i)=>contains(p,outer,holes)&&contains([(p[0]+r[(i+1)%r.length][0])/2,(p[1]+r[(i+1)%r.length][1])/2],outer,holes)));
  const toPoints=ring=>ring.map(([x,y])=>mapPoint({x,y,vertexType:'corner'}));
  const partsToFeatures=(feature,parts,boost,prefix)=>parts.map((part,i)=>({...feature,id:i===0?feature.id:`${prefix}-${i}`,x:0,y:0,points:part.map(([x,y])=>mapPoint({x,y,vertexType:'normal'})),roadWidthBoostMm:boost}));
  button.onclick=()=>{
    try{
      const sel=S.selection,zone=sel?.collection==='feature'?S.features[sel.index]:null;
      if(!zone||zone.type!=='area'||!editable(zone))throw Error('Selecciona un área editable que delimite la zona urbana');
      if(!S.georef||!S.renderGeo)throw Error('Georreferencia el mapa para aplicar anchos en milímetros');
      if(zone.curve==='bezier'||zone.points?.some(p=>p.tangent||p.inTangent||p.outTangent)||(zone.holes||[]).some(r=>r.some(p=>p.tangent||p.inTangent||p.outTangent)))throw Error('El límite urbano debe tener contornos rectos');
      const outer=zone.points.map(p=>[p.x+(zone.x||0),p.y+(zone.y||0)]),holes=(zone.holes||[]).map(r=>r.map(p=>[p.x+(zone.x||0),p.y+(zone.y||0)])),zoneCheck=OcartoTopologyTools.validatePolygon(outer,holes);
      if(!zoneCheck.valid)throw Error('Área urbana no válida: '+zoneCheck.issues[0]);
      const roadText=prompt('Aumentar el ancho total de las calles (mm en el mapa)','1');if(roadText===null)return;const roadDelta=parse(roadText,'Ancho de calles',0,5);
      const buildingText=prompt('Reducir cada borde de los edificios hacia dentro (mm)','0,15');if(buildingText===null)return;const buildingInset=parse(buildingText,'Reducción de edificios',0,2);
      if(roadDelta===0&&buildingInset===0)throw Error('Indica un cambio mayor que cero');
      const unitScale=symbolUnitScale();if(!unitScale)throw Error('No se pudo calcular la escala cartográfica');
      const expansion=roadDelta*unitScale/2,inset=buildingInset*unitScale,before=snapshotMap(),next=[],counts={roads:0,paved:0,buildings:0,skipped:0},batch=`urban-adjust-${Date.now()}`;
      for(const f of S.features){
        if(f===zone||!editable(f)){next.push(f);continue}
        if(f.type==='line'&&roadDelta>0&&roadSymbols.has(f.symbol)&&f.points?.length>=2){
          if(f.curve==='bezier'||f.points.some(p=>p.tangent||p.inTangent||p.outTangent)){next.push(f);counts.skipped++;continue}
          const ox=f.x||0,oy=f.y||0,path=f.points.map(p=>[p.x+ox,p.y+oy]);
          try{const inside=OcartoTopologyTools.clipLineToPolygon(path,outer,holes),outside=OcartoTopologyTools.clipLineOutsidePolygon(path,outer,holes),prev=Number(f.roadWidthBoostMm)||0;
            if(!inside.length){next.push(f);continue}
            next.push(...partsToFeatures(f,outside,prev,`${batch}-out-${counts.roads}`),...partsToFeatures(f,inside,prev+roadDelta,`${batch}-in-${counts.roads}`));counts.roads++
          }catch(_){next.push(f);counts.skipped++}continue;
        }
        if(f.type==='area'&&f.points?.length>=3&&f.symbol==='paved-area'&&roadDelta>0){
          const ox=f.x||0,oy=f.y||0,base=f.points.map(p=>[p.x+ox,p.y+oy]),baseHoles=(f.holes||[]).map(r=>r.map(p=>[p.x+ox,p.y+oy]));
          if(!ringsInside([base,...baseHoles],outer,holes)){next.push(f);continue}
          try{const expanded=OcartoUrbanWidthTools.offsetRing(base,expansion),shrunkHoles=baseHoles.map(r=>OcartoUrbanWidthTools.offsetRing(r,-expansion));if(!ringsInside([expanded,...shrunkHoles],outer,holes))throw Error('La calle ampliada sale de la zona');const check=OcartoTopologyTools.validatePolygon(expanded,shrunkHoles);if(!check.valid)throw Error(check.issues[0]);next.push({...f,x:0,y:0,points:toPoints(expanded),holes:shrunkHoles.map(toPoints)});counts.paved++}catch(_){next.push(f);counts.skipped++}continue;
        }
        if(f.type==='area'&&f.symbol==='building-area'&&buildingInset>0){
          const ox=f.x||0,oy=f.y||0,base=f.points.map(p=>[p.x+ox,p.y+oy]),baseHoles=(f.holes||[]).map(r=>r.map(p=>[p.x+ox,p.y+oy]));
          if(!ringsInside([base,...baseHoles],outer,holes)){next.push(f);continue}
          try{const narrowed=OcartoUrbanWidthTools.offsetRing(base,-inset),expandedHoles=baseHoles.map(r=>OcartoUrbanWidthTools.offsetRing(r,inset)),check=OcartoTopologyTools.validatePolygon(narrowed,expandedHoles);if(!check.valid)throw Error(check.issues[0]);next.push({...f,x:0,y:0,points:toPoints(narrowed),holes:expandedHoles.map(toPoints)});counts.buildings++}catch(_){next.push(f);counts.skipped++}continue;
        }
        next.push(f);
      }
      if(!counts.roads&&!counts.paved&&!counts.buildings)throw Error('No hay calles ni edificios compatibles dentro de esta zona');
      S.features=next;const zoneIndex=S.features.indexOf(zone);S.selection=zoneIndex>=0?{collection:'feature',index:zoneIndex}:null;S.multiSelection=[];S.selectedVertices=[];recordMapEdit(before);renderVectorLayers();draw();toast(`${counts.roads} tramos de calle ensanchados · ${counts.paved} calles de área ampliadas · ${counts.buildings} edificios estrechados${counts.skipped?` · ${counts.skipped} omitidos por geometría compleja`:''}. Deshacer revierte el ajuste`);
    }catch(err){toast('Ajuste urbano: '+err.message)}
  };
})();
