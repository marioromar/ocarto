/* Ocarto: WMS reference imagery. Requests only one deliberate GetMap per click.
   WMS is a background, never interpreted as vector geometry or training labels. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OcartoWMS=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const PRESETS=Object.freeze({
 pnoa:Object.freeze({title:'Ortofoto PNOA (IGN)',url:'https://www.ign.es/wms-inspire/pnoa-ma',layers:'OI.OrthoimageCoverage',version:'1.3.0'}),
 catastro:Object.freeze({title:'Catastro INSPIRE',url:'https://ovc.catastro.meh.es/cartografia/INSPIRE/spadgcwms.aspx',layers:'CP.CadastralParcel',version:'1.3.0'})
});
const SAFE_ID=/^[A-Za-z0-9_.:,\-]+$/;
function bounds(b){const a=Array.isArray(b)?b:[b?.minX,b?.minY,b?.maxX,b?.maxY];if(!a||a.length!==4||a.some(v=>typeof v!=='number'||!Number.isFinite(v))||a[0]>=a[2]||a[1]>=a[3])throw Error('Extensión geográfica BBOX inválida');return a.slice()}
function valid(input){
 if(!input||typeof input!=='object')throw Error('WMS sin configuración');
 let u;try{u=new URL(input.url)}catch(_){throw Error('URL WMS inválida')}
 if(u.protocol!=='https:'||u.username||u.password)throw Error('El servicio WMS debe utilizar HTTPS sin credenciales en la URL');
 const layer=String(input.layers||'').trim(),crs=String(input.crs||'').trim().toUpperCase(),version=String(input.version||'1.3.0');
 if(!layer||!SAFE_ID.test(layer))throw Error('Nombre de capa WMS inválido');
 if(!/^EPSG:\d{4,6}$/.test(crs))throw Error('Selecciona un CRS EPSG válido para WMS');
 if(version!=='1.3.0'&&version!=='1.1.1')throw Error('Versión WMS no admitida');
 const bbox=bounds(input.bbox),width=Number(input.width||1024),height=Number(input.height||1024);
 if(!Number.isInteger(width)||width<64||width>2048||!Number.isInteger(height)||height<64||height>2048)throw Error('Resolución WMS fuera del límite (64–2048 px)');
 return {url:u.toString(),layers:layer,crs,version,bbox,width,height};
}
function getMapUrl(input){const p=valid(input),u=new URL(p.url);for(const k of [...u.searchParams.keys()])if(/^(service|request|version|layers|styles|format|transparent|width|height|bbox|crs|srs)$/i.test(k))u.searchParams.delete(k);
 u.searchParams.set('SERVICE','WMS');u.searchParams.set('REQUEST','GetMap');u.searchParams.set('VERSION',p.version);u.searchParams.set('LAYERS',p.layers);u.searchParams.set('STYLES','');u.searchParams.set('FORMAT','image/png');u.searchParams.set('TRANSPARENT','TRUE');u.searchParams.set(p.version==='1.3.0'?'CRS':'SRS',p.crs);u.searchParams.set('WIDTH',String(p.width));u.searchParams.set('HEIGHT',String(p.height));
 // OGC WMS 1.3 EPSG:4326 axis order: latitude, longitude. WMS 1.1 uses x/y.
 const [x0,y0,x1,y1]=p.bbox,bb=(p.version==='1.3.0'&&p.crs==='EPSG:4326')?[y0,x0,y1,x1]:[x0,y0,x1,y1];u.searchParams.set('BBOX',bb.join(','));return u.toString();
}
function georef(input){const p=valid(input),[x0,y0,x1,y1]=p.bbox;return {a:(x1-x0)/p.width,b:0,c:x0,d:0,e:-(y1-y0)/p.height,f:y1,source:'WMS '+p.layers};}
function parseManualBBox(text){const parts=String(text||'').trim().split(/[;,\s]+/).filter(Boolean);if(parts.length!==4)throw Error('Indica BBOX como xmin, ymin, xmax, ymax');const nums=parts.map(Number);return bounds(nums)}
return{PRESETS,valid,getMapUrl,georef,parseManualBBox};
});
