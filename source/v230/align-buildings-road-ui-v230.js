(()=>{
  const bar=document.querySelector('.toolbar');if(!bar||document.getElementById('alignBuildingsToRoad'))return;
  const button=document.createElement('button');button.id='alignBuildingsToRoad';button.type='button';button.className='action edit-transform';button.textContent='Alinear edificios a calle';button.title='Gira las áreas seleccionadas para que su lado más largo quede paralelo a la calle más cercana';bar.append(button);
  const editable=f=>f&&!f.locked&&symbolStatus(f.symbol)==='normal'&&!vectorLayerFor(f)?.referenceOnly;
  const rotateVector=(v,a)=>{if(!v)return v;const c=Math.cos(a),s=Math.sin(a);return{x:v.x*c-v.y*s,y:v.x*s+v.y*c}};
  button.onclick=()=>{try{
    const refs=S.multiSelection?.length?S.multiSelection:(S.selection?[S.selection]:[]),chosen=refs.filter(r=>r.collection==='feature').map(r=>S.features[r.index]).filter(editable),buildings=chosen.filter(f=>f.type==='area'),roads=chosen.filter(f=>f.type==='line');
    if(!buildings.length||!roads.length)throw Error('Selecciona uno o varios edificios y al menos una calle');
    const paths=roads.map(f=>{const points=f.curve==='bezier'||f.points.some(p=>p.tangent||p.inTangent||p.outTangent)?OcartoMeasureTools.sample(f.points,false,96,true):f.points.map(p=>({x:p.x,y:p.y}));return points.map(p=>[p.x+(f.x||0),p.y+(f.y||0)])});
    const prepared=[];
    for(const f of buildings){if(!Array.isArray(f.points)||f.points.length<3)continue;const ox=f.x||0,oy=f.y||0,outer=f.points.map(p=>[p.x+ox,p.y+oy]),holes=(f.holes||[]).map(r=>r.map(p=>[p.x+ox,p.y+oy])),result=OcartoAlignBuildingTools.alignBuilding(outer,holes,paths),a=result.rotation;
      const convert=(old,xy)=>{const q={...old,x:xy[0]-ox,y:xy[1]-oy};for(const key of ['tangent','inTangent','outTangent'])if(old[key])q[key]=rotateVector(old[key],a);if(Number.isFinite(old.rawX)&&Number.isFinite(old.rawY)){const world=localToWorld({x:xy[0],y:xy[1]});q.rawX=world.x;q.rawY=world.y}return q};
      prepared.push({feature:f,points:f.points.map((p,i)=>convert(p,result.outer[i])),holes:f.holes||[],alignedHoles:(f.holes||[]).map((ring,j)=>ring.map((p,i)=>convert(p,result.holes[j][i]))) });
    }
    if(!prepared.length)throw Error('No hay áreas válidas en la selección');const before=snapshotMap();for(const item of prepared){item.feature.points=item.points;item.feature.holes=item.alignedHoles}recordMapEdit(before);S.selection=null;S.multiSelection=refs.filter(r=>r.collection==='feature'&&prepared.some(x=>x.feature===S.features[r.index]));S.selectedVertices=[];renderVectorLayers();draw();toast(`${prepared.length} edificio${prepared.length===1?'':'s'} alineado${prepared.length===1?'':'s'} con la calle más cercana`);
  }catch(err){toast('Alinear edificios: '+err.message)}};
})();
