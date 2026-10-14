/* Ocarto v54: georeferenced PNG grids and contour DXF exports. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoLidarExports=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const MAX_PIXELS=12000000;
function rasterGrid(rows,cell,field='elevation',opts={}){
 if(!Array.isArray(rows)||!rows.length||!Number.isFinite(cell)||cell<=0)throw Error('MDT o tamaño de celda inválido');
 if(!['elevation','canopy'].includes(field))throw Error('Variable de imagen inválida');
 let minI=Infinity,maxI=-Infinity,minJ=Infinity,maxJ=-Infinity;const cells=new Map();
 for(const row of rows){const x=field==='elevation'?row[0]:row.x,y=field==='elevation'?row[1]:row.y,v=field==='elevation'?row[2]:row.canopy_max_above_ground_m;
  if(![x,y].every(Number.isFinite))throw Error('Coordenadas de celda inválidas');const i=Math.round(x/cell-.5),j=Math.round(y/cell-.5);
  if(Math.abs((i+.5)*cell-x)>cell*1e-5||Math.abs((j+.5)*cell-y)>cell*1e-5)throw Error('Coordenadas no alineadas a la rejilla');if(cells.has(i+','+j))throw Error('Celda duplicada en rejilla');
  cells.set(i+','+j,Number.isFinite(v)?v:null);minI=Math.min(i,minI);maxI=Math.max(i,maxI);minJ=Math.min(j,minJ);maxJ=Math.max(j,maxJ);
 }
 const width=maxI-minI+1,height=maxJ-minJ+1;if(width*height>(opts.maxPixels||MAX_PIXELS))throw Error('Imagen demasiado grande; aumenta el tamaño de celda');
 const valid=[...cells.values()].filter(Number.isFinite);if(!valid.length)throw Error('No hay valores válidos para pintar');
 const min=Number.isFinite(opts.min)?opts.min:Math.min(...valid),max=Number.isFinite(opts.max)?opts.max:Math.max(...valid),rgba=new Uint8ClampedArray(width*height*4);
 for(const [key,v] of cells){if(!Number.isFinite(v))continue;const [i,j]=key.split(',').map(Number),col=i-minI,row=maxJ-j,index=(row*width+col)*4,t=max===min?.5:Math.max(0,Math.min(1,(v-min)/(max-min)));
  // Colour ramps are intended for visual interpretation, not official map symbols.
  if(field==='elevation'){rgba[index]=Math.round(35+220*t);rgba[index+1]=Math.round(85+105*(1-Math.abs(t-.5)*2));rgba[index+2]=Math.round(190-155*t)}else{rgba[index]=Math.round(30+190*t);rgba[index+1]=Math.round(155-95*t);rgba[index+2]=Math.round(75-35*t)}rgba[index+3]=255;
 }
 const left=minI*cell,top=(maxJ+1)*cell;
 return{width,height,rgba,cell,min,max,field,bounds:{left,bottom:minJ*cell,right:(maxI+1)*cell,top},worldFile:[cell,0,0,-cell,left+cell/2,top-cell/2].join('\n')+'\n'};
}
function prjWkt(crs){
 const value=String(crs||'').trim().toUpperCase().replace(/^URN:OGC:DEF:CRS:EPSG::/, 'EPSG:').replace(/^EPSG\s*:/,'EPSG:');
 const match=value.match(/^EPSG:(\d+)$/);if(!match)throw Error('Para crear un PRJ válido indica un código EPSG, por ejemplo EPSG:25830');
 const code=Number(match[1]);
 if(code===4326)return 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433],AUTHORITY["EPSG","4326"]]';
 if(code===4258)return 'GEOGCS["ETRS89",DATUM["European_Terrestrial_Reference_System_1989",SPHEROID["GRS 1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433],AUTHORITY["EPSG","4258"]]';
 const isEtrs=code>=25828&&code<=25838,isWgsNorth=code>=32601&&code<=32660,isWgsSouth=code>=32701&&code<=32760;
 if(!isEtrs&&!isWgsNorth&&!isWgsSouth)throw Error(`El CRS ${value} no está incluido en el generador PRJ. Usa EPSG:25828–25838, EPSG:32601–32660, EPSG:32701–32760, EPSG:4258 o EPSG:4326.`);
 const zone=isEtrs?code-25800:isWgsNorth?code-32600:code-32700,centralMeridian=zone*6-183,south=isWgsSouth;
 const datum=isEtrs?'European_Terrestrial_Reference_System_1989':'WGS_1984',spheroid=isEtrs?'GRS 1980':'WGS 84',inverseFlattening=isEtrs?'298.257222101':'298.257223563',name=isEtrs?'ETRS89':'WGS 84',auth=String(code);
 return `PROJCS["${name} / UTM zone ${zone}${south?'S':'N'}",GEOGCS["${name}",DATUM["${datum}",SPHEROID["${spheroid}",6378137,${inverseFlattening}]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",${centralMeridian}],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",${south?10000000:0}],UNIT["metre",1],AUTHORITY["EPSG","${auth}"]]`;
}
function contoursToDxf(features,crs=''){
 if(!Array.isArray(features)||!features.length)throw Error('No hay curvas para exportar');let out=['0','SECTION','2','HEADER','9','$INSUNITS','70','6','0','ENDSEC','0','SECTION','2','ENTITIES'];let count=0;
 for(const f of features){const pts=f?.geometry?.coordinates,z=Number(f?.properties?.elevation);if(f?.geometry?.type!=='LineString'||!Array.isArray(pts)||pts.length<2||!Number.isFinite(z)||!pts.every(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])))continue;
  const layer=('CURVA_'+z.toFixed(3)).replace(/[^A-Za-z0-9_.-]/g,'_').slice(0,31);out.push('0','LWPOLYLINE','8',layer,'90',String(pts.length),'70',pts.length>2&&Math.hypot(pts[0][0]-pts.at(-1)[0],pts[0][1]-pts.at(-1)[1])<1e-8?'1':'0','38',String(z));for(const p of pts)out.push('10',String(p[0]),'20',String(p[1]),'30','0');count++;
 }
 if(!count)throw Error('No hay líneas de curva válidas');out.push('0','ENDSEC','0','EOF');return{content:out.join('\r\n')+'\r\n',count,crs:String(crs||'')};
}
return{rasterGrid,prjWkt,contoursToDxf};
});
