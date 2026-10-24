/* Ocarto: independent cartographic and detailed contour profiles.
   All profiles are recomputed from the georeferenced MDT; the original source
   and unsmoothed layers are never overwritten. Export serially to bound memory. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.OcartoLidarContourProfiles=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const profiles=Object.freeze([
  {id:'5m_suave',interval:5,smoothed:true,intensity:25,label:'5 m · curvado general suavizado'},
  {id:'3m_suave_ligero',interval:3,smoothed:true,intensity:12,label:'3 m · curvado intermedio, suavizado ligero'},
  {id:'1m_original',interval:1,smoothed:false,intensity:0,label:'1 m · detalle sin suavizar'},
  {id:'1m_suave_ligero',interval:1,smoothed:true,intensity:8,label:'1 m · detalle suavizado ligero'},
  {id:'0_5m_original',interval:.5,smoothed:false,intensity:0,label:'0,5 m · microrelieve sin suavizar'},
  {id:'0_5m_suave_minimo',interval:.5,smoothed:true,intensity:4,label:'0,5 m · microrelieve suavizado mínimo'}
 ]);
 function options(profile,cell){
  if(!profiles.includes(profile))throw Error('Perfil de curvas no autorizado');
  if(!Number.isFinite(cell)||cell<.1)throw Error('Resolución MDT inválida');
  return profile.smoothed?{intensity:profile.intensity,protectedAngle:55,maxShift:cell*.2}:null;
 }
 async function exportSet(directory,manifest,api,{connect,smooth,signal,onProgress}={}){
  if(!api||typeof api.exportGeojson!=='function'||typeof connect!=='function'||
      typeof smooth!=='function')throw Error('Generador de perfiles de curvas incompleto');
  const out=[];
  for(let i=0;i<profiles.length;i++){
   if(signal?.aborted)throw Object.assign(Error('Pruebas de curvas detenidas'),{name:'AbortError'});
   const profile=profiles[i],name='zona_completa_curvas_'+profile.id+'.geojson';
   onProgress?.({i:i+1,total:profiles.length,profile,stage:'start'});
   const stat=await api.exportGeojson(directory,manifest,name,profile.interval,{
    signal,connect,smooth:options(profile,manifest.cellTerrain),
    onProgress:p=>onProgress?.({i:i+1,total:profiles.length,profile,stage:'tile',...p})
   });
   out.push({...stat,profile:profile.label,smoothed:profile.smoothed,
    intensity:profile.intensity,sourceResolution_m:manifest.cellTerrain});
   onProgress?.({i:i+1,total:profiles.length,profile,stage:'done',stat});
  }
  return out;
 }
 return Object.freeze({profiles,options,exportSet});
});
