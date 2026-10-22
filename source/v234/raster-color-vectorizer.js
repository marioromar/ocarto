/* Ocarto v276: vectorize a classified raster by visible colour.
   The result is editable polygon boundaries, not LiDAR height inference.
   Pure JavaScript (browser + Node test), fully offline. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.OcartoRasterVector=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const QUANT=32, MAX_CLASSES=8, MAX_EDGES=450000, MAX_POLYGONS=400;
  function readable(r,g,b,a,opts){
    if(a<128)return false;
    if(opts.ignoreWhite!==false && r>=240 && g>=240 && b>=240)return false;
    return true;
  }
  const rgbKey=(r,g,b)=>(Math.floor(r/QUANT)<<6)|(Math.floor(g/QUANT)<<3)|Math.floor(b/QUANT);
  const keyColor=key=>[(Math.floor(key/64)*QUANT)+QUANT/2,
    (Math.floor(key/8)%8)*QUANT+QUANT/2,(key%8)*QUANT+QUANT/2];
  function check(data,width,height){
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
      width*height>2500000)throw Error('Imagen demasiado grande para vectorizar: reduce su tamaño a 2,5 millones de píxeles');
    if(!data||data.length!==width*height*4)throw Error('Datos RGBA de la plantilla incompletos');
  }
  function discover(data,width,height,opts={}){
    check(data,width,height);
    const counts=new Map();
    for(let i=0;i<data.length;i+=4){
      if(!readable(data[i],data[i+1],data[i+2],data[i+3],opts))continue;
      const key=rgbKey(data[i],data[i+1],data[i+2]);
      counts.set(key,(counts.get(key)||0)+1);
    }
    const sorted=[...counts].sort((a,b)=>b[1]-a[1]||a[0]-b[0]);
    const min=Math.max(8,Math.floor(width*height*.0004));
    const max=Math.max(1,Math.min(MAX_CLASSES,Math.floor(opts.maxClasses||6)));
    return sorted.filter(([,n])=>n>=min).slice(0,max).map(([key,pixels],id)=>({
      id, key,pixels,rgb:keyColor(key),
      hex:'#'+keyColor(key).map(c=>Math.round(c).toString(16).padStart(2,'0')).join('')
    }));
  }
  function shoelace(ring){
    let a=0;
    for(let i=0;i<ring.length;i++){
      const p=ring[i],q=ring[(i+1)%ring.length];
      a+=p[0]*q[1]-q[0]*p[1];
    }
    return a/2;
  }
  function pointInside(x,y,ring){
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[i],b=ring[j];
      if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])
        inside=!inside;
    }
    return inside;
  }
  function simplifyOpen(points,tol){
    if(points.length<3||tol<=0)return points;
    const keep=new Uint8Array(points.length);keep[0]=1;keep[points.length-1]=1;
    const stack=[[0,points.length-1]],t2=tol*tol;
    while(stack.length){
      const [lo,hi]=stack.pop();
      const a=points[lo],b=points[hi],dx=b[0]-a[0],dy=b[1]-a[1];
      const d2=dx*dx+dy*dy;
      let maximum=t2,farthest=-1;
      for(let i=lo+1;i<hi;i++){
        const p=points[i],t=d2?( (p[0]-a[0])*dx+(p[1]-a[1])*dy)/d2:0;
        const u=Math.max(0,Math.min(1,t));
        const ex=p[0]-a[0]-u*dx,ey=p[1]-a[1]-u*dy;
        const distance=ex*ex+ey*ey;
        if(distance>maximum){maximum=distance;farthest=i;}
      }
      if(farthest>=0){
        keep[farthest]=1;
        stack.push([lo,farthest],[farthest,hi]);
      }
    }
    return points.filter((_,i)=>keep[i]);
  }
  function cleanRing(points,tolerance){
    if(points.length<4)return points;
    const reduced=[];
    for(let i=0;i<points.length;i++){
      const a=points[(i+points.length-1)%points.length],p=points[i],
            b=points[(i+1)%points.length];
      const cross=(p[0]-a[0])*(b[1]-p[1])-(p[1]-a[1])*(b[0]-p[0]);
      if(cross!==0)reduced.push(p);
    }
    if(reduced.length<4||tolerance<=0)return reduced;
    let far=1,d=0;
    for(let i=1;i<reduced.length;i++){
      const dx=reduced[i][0]-reduced[0][0],dy=reduced[i][1]-reduced[0][1],
        length=dx*dx+dy*dy;
      if(length>d){d=length;far=i;}
    }
    const first=simplifyOpen(reduced.slice(0,far+1),tolerance);
    const second=simplifyOpen([...reduced.slice(far),reduced[0]],tolerance);
    const result=[...first,...second.slice(1,-1)];
    return result.length>=4?result:reduced;
  }
  function boundaries(mask,width,height,{limitEdges=MAX_EDGES,tolerance=.7}={}){
    const stride=width+1, edges=[],heads=new Map();
    function edge(start,end,dir){
      if(edges.length>=limitEdges)throw Error('Demasiados bordes ráster: utiliza una muestra menor o incrementa el área mínima');
      const idx=edges.length;edges.push({start,end,dir,used:false});
      if(!heads.has(start))heads.set(start,[]);
      heads.get(start).push(idx);
    }
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=y*width+x;
      if(mask[i]!==1)continue;
      const tl=y*stride+x,tr=tl+1,bl=tl+stride,br=bl+1;
      if(y===0||!mask[i-width])edge(tl,tr,0);
      if(x===width-1||!mask[i+1])edge(tr,br,1);
      if(y===height-1||!mask[i+width])edge(br,bl,2);
      if(x===0||!mask[i-1])edge(bl,tl,3);
    }
    const rings=[];
    for(let n=0;n<edges.length;n++){
      if(edges[n].used)continue;
      const root=edges[n].start;
      let id=n,steps=0;
      const ring=[];
      while(true){
        const e=edges[id];
        if(e.used)throw Error('Contorno ráster solapado: revisa la clase');
        e.used=true;
        ring.push([e.start%stride,Math.floor(e.start/stride)]);
        if(e.end===root)break;
        const next=(heads.get(e.end)||[]).filter(k=>!edges[k].used);
        if(!next.length)throw Error('Contorno ráster abierto o incompleto');
        // Right turn keeps diagonally touching regions separate.
        const order=[(e.dir+1)%4,e.dir,(e.dir+3)%4,(e.dir+2)%4];
        next.sort((a,b)=>order.indexOf(edges[a].dir)-order.indexOf(edges[b].dir));
        id=next[0];
        if(++steps>edges.length)throw Error('Contorno ráster con bucle inválido');
      }
      const clean=cleanRing(ring,tolerance);
      if(clean.length>=4&&Math.abs(shoelace(clean))>=1)rings.push(clean);
    }
    return rings;
  }
  function groupRings(rings,{minPixels=20,minHolePixels=9,maxPolygons=MAX_POLYGONS}={}){
    // Screen coordinates: clockwise exterior is positive area, holes negative.
    const outer=[],holes=[];
    for(const ring of rings){
      const a=shoelace(ring);
      if(a>0&&a>=minPixels)outer.push({ring,area:a,holes:[]});
      else if(a<0&&-a>=minHolePixels)holes.push({ring,area:-a});
    }
    outer.sort((a,b)=>b.area-a.area);
    if(outer.length>maxPolygons)throw Error('Más de '+maxPolygons+' áreas: aumenta el mínimo de píxeles');
    for(const hole of holes){
      const p=hole.ring[0],x=p[0]+.01,y=p[1]+.01;
      const container=outer.filter(o=>o.area>hole.area&&pointInside(x,y,o.ring))
        .sort((a,b)=>a.area-b.area)[0];
      if(container)container.holes.push(hole.ring);
    }
    return outer;
  }
  function vectorize(data,width,height,opts={}){
    check(data,width,height);
    const palette=discover(data,width,height,opts);
    if(!palette.length)throw Error('No se detectan clases de color. Comprueba la imagen o desactiva ignorar blanco.');
    const chosen=opts.classIds==null?palette:palette.filter(c=>opts.classIds.includes(c.id));
    if(!chosen.length)throw Error('No has seleccionado ninguna clase para vectorizar');
    const minPixels=Math.max(4,Math.floor(opts.minPixels||25));
    const tolerance=Math.max(0,Math.min(2,Number(opts.tolerance??.6)));
    const mask=new Uint8Array(width*height),features=[];
    const maxDistance=Math.max(0,Number(opts.maxDistance??65));
    for(const selected of chosen){
      let count=0;
      mask.fill(0);
      for(let i=0,j=0;i<data.length;i+=4,j++){
        const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
        if(!readable(r,g,b,a,opts))continue;
        // Assign each pixel to the nearest dominant colour rather than
        // merging semantically different neighbouring classes.
        let nearest=Infinity,best=-1;
        for(const c of palette){
          const p=c.rgb,d=(r-p[0])**2+(g-p[1])**2+(b-p[2])**2;
          if(d<nearest){nearest=d;best=c.id;}
        }
        if(best===selected.id && nearest<=maxDistance*maxDistance){
          mask[j]=1;count++;
        }
      }
      if(count<minPixels)continue;
      const rings=boundaries(mask,width,height,{tolerance});
      const polygons=groupRings(rings,{minPixels,maxPolygons:opts.maxPolygons||MAX_POLYGONS});
      for(const poly of polygons){
        features.push({classId:selected.id,color:selected.hex,pixels:Math.round(poly.area),
          outer:poly.ring,holes:poly.holes});
      }
      if(features.length>(opts.maxTotalPolygons||800))
        throw Error('Demasiadas áreas en total; selecciona menos colores o aumenta el mínimo');
    }
    if(!features.length)throw Error('No hay zonas suficientemente grandes para crear polígonos. Reduce el área mínima.');
    return {width,height,palette,features};
  }
  return Object.freeze({discover,vectorize,boundaries,groupRings,shoelace});
});
