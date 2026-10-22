/* Ocarto v279: color-ramp LiDAR vegetation height PNG => georeferenced
   editable GeoJSON polygons. Vectorizes image pixels, NOT the original LAZ.
   Four height bands are provisional; no assumptions about runnability.
   PGW corner offset and interior holes are retained. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.OcartoVegetationHeightRaster=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const defaults=[
   {height:0,color:'#f2dc72'},
   {height:.3,color:'#e53935'},
   {height:2,color:'#48a868'},
   {height:5,color:'#ffffff'},
 ];
 const classes=[
   {key:'height_0_03',label:'0–0,30 m · cobertura baja',min:0,max:.3},
   {key:'height_03_2',label:'0,30–2 m · vegetación baja',min:.3,max:2},
   {key:'height_2_5',label:'2–5 m · vegetación media',min:2,max:5},
   {key:'height_above_5',label:'≥5 m · copa alta',min:5,max:null},
 ];
 const parseHex=s=>{
   if(typeof s!=='string'||!/^#[0-9a-f]{6}$/i.test(s))throw Error('Color de altura inválido: '+s);
   return [1,3,5].map(i=>parseInt(s.slice(i,i+2),16));
 };
 function parseWorldFile(text){
   const v=String(text||'').trim().split(/[\s,]+/).map(Number);
   if(v.length!==6||!v.every(Number.isFinite))throw Error('PGW inválido: se necesitan seis números A,D,B,E,C,F');
   const [A,D,B,E,C,F]=v,det=A*E-B*D;
   if(Math.abs(det)<1e-15 || Math.max(Math.abs(A),Math.abs(D),Math.abs(B),Math.abs(E))>500)
     throw Error('PGW sin escala válida, singular o desproporcionado');
   return Object.freeze({A,D,B,E,C,F,cellAreaM2:Math.abs(det)});
 }
 function point(w,x,y){
   // PGW specifies center of the first (0,0) pixel.
   const px=x-.5,py=y-.5;
   return [+(w.A*px+w.B*py+w.C).toFixed(5),
     +(w.D*px+w.E*py+w.F).toFixed(5)];
 }
 function rgbStopList(value){
   if(!Array.isArray(value)||value.length!==4)throw Error('Indica cuatro colores de altura');
   const stops=value.map(s=>({height:Number(s.height),rgb:parseHex(s.color)}));
   if(stops.some((s,i)=>!Number.isFinite(s.height)||s.height<0||
       (i&&s.height<=stops[i-1].height)))throw Error('Alturas de la paleta fuera de orden');
   return stops;
 }
 function matchHeight(r,g,b,stops){
   let best=Infinity,estimate=null;
   for(let i=0;i<stops.length-1;i++){
     const a=stops[i],z=stops[i+1];
     const d=z.rgb.map((v,k)=>v-a.rgb[k]);
     const den=d.reduce((s,v)=>s+v*v,0);
     const t=den>0?Math.max(0,Math.min(1,
       ((r-a.rgb[0])*d[0]+(g-a.rgb[1])*d[1]+(b-a.rgb[2])*d[2])/den)):0;
     const err=Math.hypot(...[r,g,b].map((v,k)=>v-a.rgb[k]-t*d[k]));
     if(err<best){best=err;estimate=a.height+t*(z.height-a.height);}
   }
   return {height:estimate,error:best};
 }
 function signedArea(r){let a=0;for(let i=0;i<r.length-1;i++)
   a+=r[i][0]*r[i+1][1]-r[i+1][0]*r[i][1];return a/2;}
 function simplify(r){
   if(r.length<5)return r;
   const p=r.slice(0,-1),result=[];
   for(let i=0;i<p.length;i++){
     const a=p[(i+p.length-1)%p.length],b=p[i],c=p[(i+1)%p.length];
     if((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])===0)continue;
     result.push(b);
   }
   if(result.length<3)return r;
   return [...result,result[0]];
 }
 function inside(pt,ring){
   let hit=false;
   for(let i=0,j=ring.length-1;i<ring.length;j=i++){
     const a=ring[i],b=ring[j];
     if((a[1]>pt[1])!==(b[1]>pt[1]) &&
       pt[0]<(b[0]-a[0])*(pt[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;
   }return hit;
 }
 function polygons(region,mask,width,height,w){
   const bits=new Set(region),edges=new Map(),key=(x,y)=>x+','+y;
   function add(a,b){const k=key(...a);if(!edges.has(k))edges.set(k,[]);edges.get(k).push({a,b});}
   for(const idx of region){
     const x=idx%width,y=Math.floor(idx/width);
     if(y===0||!bits.has(idx-width))add([x,y],[x+1,y]);
     if(x===width-1||!bits.has(idx+1))add([x+1,y],[x+1,y+1]);
     if(y===height-1||!bits.has(idx+width))add([x+1,y+1],[x,y+1]);
     if(x===0||!bits.has(idx-1))add([x,y+1],[x,y]);
   }
   const rings=[];
   while(edges.size){
     const first=edges.values().next().value[0],r=[first.a];
     let edge=first,guard=0;
     while(true){
       const k=key(...edge.a),list=edges.get(k);
       if(!list)throw Error('Borde de máscara incoherente');
       list.splice(list.indexOf(edge),1);if(!list.length)edges.delete(k);
       r.push(edge.b);
       if(edge.b[0]===first.a[0]&&edge.b[1]===first.a[1])break;
       const choices=edges.get(key(...edge.b));
       if(!choices?.length)throw Error('Borde vectorial abierto');
       if(choices.length===1)edge=choices[0];
       else {
         const dx=edge.b[0]-edge.a[0],dy=edge.b[1]-edge.a[1];
         // Prefer most clockwise continuation when masks touch diagonally.
         edge=choices.slice().sort((a,b)=>{
           const ar=[a.b[0]-a.a[0],a.b[1]-a.a[1]];
           const br=[b.b[0]-b.a[0],b.b[1]-b.a[1]];
           const ax=dx*ar[1]-dy*ar[0],bx=dx*br[1]-dy*br[0];
           return bx-ax;
         })[0];
       }
       if(++guard>Math.min(region.length*4+100,1000000))
         throw Error('Polígono demasiado complejo para vectorizar');
     }
     const simple=simplify(r),a=signedArea(simple);
     if(simple.length>=4&&Math.abs(a)>=.5)rings.push({points:simple,area:a});
   }
   // In screen coordinates y grows down; positive signed rings are exteriors.
   const outer=rings.filter(r=>r.area>0).map(r=>({ring:r.points,holes:[],area:r.area}));
   for(const hole of rings.filter(r=>r.area<0)){
     const sample=hole.points[0];
     let parent=null;
     for(const candidate of outer){
       if(inside(sample,candidate.ring)&&(!parent||candidate.area<parent.area))
         parent=candidate;
     }
     if(parent)parent.holes.push(hole.points);
   }
   const toWorld=(ring,exterior)=>{
     const transformed=ring.map(p=>point(w,p[0],p[1]));
     const sign=signedArea(transformed);
     if((exterior&&sign<0)||(!exterior&&sign>0))transformed.reverse();
     return transformed;
   };
   return outer.map(o=>[toWorld(o.ring,true),...o.holes.map(h=>toWorld(h,false))]);
 }
 function vectorize({
   pixels,width,height,worldFile,stops=defaults,
   minAreaM2=25,maxColorError=45,whiteAsNoData=false,
   maxFeatures=5000,maxPixels=2500000,crs='',
 }={}){
   if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
      width*height>maxPixels)throw Error('Imagen demasiado grande: vectoriza por teselas de hasta 2,5 millones de píxeles');
   if(!(pixels instanceof Uint8ClampedArray||pixels instanceof Uint8Array)||
      pixels.length!==width*height*4)throw Error('Píxeles RGBA de imagen incorrectos');
   const world=typeof worldFile==='string'?parseWorldFile(worldFile):worldFile;
   if(!world||!Number.isFinite(world.cellAreaM2)||world.cellAreaM2<=0)
     throw Error('Falta el PGW georreferenciado de la imagen de vegetación');
   if(!Number.isFinite(minAreaM2)||minAreaM2<0||
      !Number.isFinite(maxColorError)||maxColorError<0||maxColorError>255||
      !Number.isInteger(maxFeatures)||maxFeatures<1||maxFeatures>10000)
     throw Error('Parámetros de vectorización inválidos');
   const ramps=rgbStopList(stops),n=width*height,label=new Uint8Array(n);
   const summary={pixels:n,transparent:0,unclassified:0,classified:[0,0,0,0],
     discardedSmall:0,features:0,cellAreaM2:world.cellAreaM2};
   for(let i=0;i<n;i++){
     const k=4*i,r=pixels[k],g=pixels[k+1],b=pixels[k+2],alpha=pixels[k+3];
     if(alpha<128||(whiteAsNoData&&r>250&&g>250&&b>250)){summary.transparent++;continue;}
     const matched=matchHeight(r,g,b,ramps);
     if(matched.error>maxColorError){summary.unclassified++;continue;}
     const h=matched.height;
     const cls=h<ramps[1].height?1:h<ramps[2].height?2:
       h<ramps[3].height?3:4;
     label[i]=cls;summary.classified[cls-1]++;
   }
   const visited=new Uint8Array(n),features=[];
   for(let i=0;i<n;i++){
     const cls=label[i];
     if(!cls||visited[i])continue;
     const pending=[i],region=[];
     visited[i]=1;
     while(pending.length){
       const idx=pending.pop();region.push(idx);
       const x=idx%width,y=Math.floor(idx/width);
       const neighbors=[
         x>0?idx-1:-1,x+1<width?idx+1:-1,
         y>0?idx-width:-1,y+1<height?idx+width:-1
       ];
       for(const j of neighbors)if(j>=0&&!visited[j]&&label[j]===cls){
         visited[j]=1;pending.push(j);
       }
     }
     const area=region.length*world.cellAreaM2;
     if(area<minAreaM2){summary.discardedSmall++;continue;}
     const multi=polygons(region,label,width,height,world);
     for(const rings of multi){
       if(features.length>=maxFeatures)
         throw Error('Demasiadas áreas vectoriales; aumenta el área mínima o limita la imagen');
       const k=classes[cls-1];
       features.push({
         type:'Feature',
         properties:{
           category:k.key,label:k.label,
           height_min_m:ramps[cls-1].height,
           height_max_m:cls===4?null:ramps[cls].height,
           raster_area_m2:+area.toFixed(3),
           source:'imagen de altura de vegetación LiDAR',
           classification:'color-ramp-approximation',
           review_required:true,iof_symbol:null,
           cell_count:region.length,
         },
         geometry:{type:'Polygon',coordinates:rings},
       });
     }
   }
   summary.features=features.length;
   return {
     type:'FeatureCollection',
     metadata:{crs,source:'image_height_ramp',precision:'color-derived height classes, not original LAS',
       width,height,worldFile:{A:world.A,B:world.B,C:world.C,D:world.D,E:world.E,F:world.F},
       summary},
     features,
   };
 }
 return Object.freeze({parseWorldFile,vectorize,classes,defaults});
});
