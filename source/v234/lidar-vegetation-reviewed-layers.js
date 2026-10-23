/* Ocarto v285 — reviewable vegetation GeoJSON layer import (no automatic IOF assignment).
   Pure preparation module: no map edits and no CRS assumptions. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.OcartoVegetationReviewedLayers=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const CLASSES=Object.freeze([
    Object.freeze({key:'verde_oscuro',name:'Verde oscuro impasable',color:'#356c38'}),
    Object.freeze({key:'rayado',name:'Vegetación rayada',color:'#8cae6e'}),
    Object.freeze({key:'amarillo',name:'Amarillo / terreno abierto',color:'#e9cf49'})
  ]);
  const BY_KEY=new Map(CLASSES.map(c=>[c.key,c]));
  function classKey(value){
    const s=String(value||'').toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'').replace(/[\s-]+/g,'_');
    if(s==='verde_oscuro'||s==='verde_oscuro_impasable')return 'verde_oscuro';
    if(s==='rayado'||s==='vegetacion_rayada')return 'rayado';
    if(s==='amarillo'||s==='terreno_abierto'||s==='amarillo_terreno_abierto')return 'amarillo';
    return null;
  }
  function validRing(ring){
    return Array.isArray(ring)&&ring.length>=4&&ring.length<=50000&&
      ring.every(p=>Array.isArray(p)&&p.length>=2&&p.length<=3&&
        Number.isFinite(p[0])&&Number.isFinite(p[1]))&&
      ring[0][0]===ring[ring.length-1][0]&&ring[0][1]===ring[ring.length-1][1];
  }
  function polygonRings(geometry){
    if(!geometry||!['Polygon','MultiPolygon'].includes(geometry.type))
      throw Error('Solo se admiten polígonos de vegetación');
    const polys=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
    if(!Array.isArray(polys)||!polys.length||polys.length>5000)
      throw Error('Geometría de vegetación vacía o demasiado grande');
    for(const poly of polys){
      if(!Array.isArray(poly)||!poly.length||poly.length>250||!poly.every(validRing))
        throw Error('Anillos de vegetación inválidos o sin cerrar');
    }
    return polys;
  }
  function declaredCrs(fc){
    const source=fc?.metadata?.crs||fc?.crs?.properties?.name||null;
    if(source!==null&&typeof source!=='string')throw Error('Declaración de CRS inválida');
    return source?source.trim().toUpperCase():null;
  }
  function prepare(files,selected,{confirmedCrs=false,mapCrs=''}={}){
    if(!Array.isArray(files)||!files.length||files.length>12)
      throw Error('Selecciona entre uno y doce GeoJSON de vegetación');
    if(!Array.isArray(selected)||!selected.length||selected.some(k=>!BY_KEY.has(k)))
      throw Error('Selecciona al menos una de las tres clases');
    if(!confirmedCrs||!/^EPSG:(25829|25830|25831|32629|32630|32631)$/i.test(String(mapCrs)))
      throw Error('Confirma el EPSG del mapa y que el TIFF y los GeoJSON utilizan sus mismas coordenadas');
    const grouped=Object.fromEntries(CLASSES.map(c=>[c.key,[]]));
    const selection=new Set(selected),ids=new Set();let total=0;
    for(const item of files){
      const fc=typeof item?.content==='string'?JSON.parse(item.content):item?.content;
      if(fc?.type!=='FeatureCollection'||!Array.isArray(fc.features))
        throw Error('El archivo '+String(item?.name||'')+' no es una colección GeoJSON');
      if(fc.features.length>5000)throw Error('Demasiadas áreas en un GeoJSON');
      const declared=declaredCrs(fc);
      if(declared&&declared!==String(mapCrs).toUpperCase())
        throw Error('CRS distinto en '+String(item.name||'GeoJSON')+': '+declared);
      for(const feature of fc.features){
        if(feature?.type!=='Feature')throw Error('Elemento GeoJSON no válido');
        const p=feature.properties||{},key=classKey(p.clase||p.category);
        if(!key)throw Error('Clase de vegetación no reconocida: '+String(p.clase||p.category));
        if(!selection.has(key))continue;
        const polygons=polygonRings(feature.geometry);
        const id=String(p.id||'').trim();
        if(id&&(ids.has(id)))throw Error('Identificador repetido: '+id);
        if(id)ids.add(id);
        for(const rings of polygons){
          total++;
          if(total>5000)throw Error('Máximo de 5000 polígonos por importación');
          const pt=rings[0][0];
          if(Math.abs(pt[0])<=180&&Math.abs(pt[1])<=90)
            throw Error('Parece una coordenada geográfica; se esperan coordenadas UTM en metros');
        }
        grouped[key].push({id,properties:{...p,review_required:true,iof_symbol:null},
          geometry:feature.geometry});
      }
    }
    if(!total)throw Error('No hay polígonos de las clases seleccionadas');
    return {grouped,total,counts:Object.fromEntries(CLASSES.map(c=>[c.key,grouped[c.key].length])),
      crs:String(mapCrs).toUpperCase(),reviewRequired:true};
  }
  // Open only the three expected GeoJSON members of the Ocarto ZIP.
  // Never decompress the TIFF or PNG images bundled alongside the vectors.
  async function readSources(rawFiles,zipLib){
    if(!Array.isArray(rawFiles)||!rawFiles.length||rawFiles.length>12)
      throw Error('Selecciona uno o varios GeoJSON o un ZIP de Bobadilla');
    const extracted=[],allowed=new Set(CLASSES.map(c=>c.key+'.geojson'));
    for(const file of rawFiles){
      const name=String(file?.name||'');
      if(/\.zip$/i.test(name)){
        if(!zipLib||typeof zipLib.loadAsync!=='function')
          throw Error('No se ha podido abrir ZIP: falta JSZip');
        if(!Number.isFinite(file.size)||file.size>60*1024*1024)
          throw Error('El ZIP supera el límite de 60 MB');
        const archive=await zipLib.loadAsync(file);
        const entries=Object.values(archive.files||{});
        if(entries.length>1500)throw Error('El ZIP contiene demasiados archivos');
        const matches=entries.filter(e=>{
          const base=String(e.name||'').split('/').at(-1).toLowerCase();
          return !e.dir&&allowed.has(base);
        });
        if(matches.length<1||matches.length>3)
          throw Error('El ZIP debe incluir verde_oscuro.geojson, rayado.geojson o amarillo.geojson');
        const seen=new Set();
        for(const entry of matches){
          const base=entry.name.split('/').at(-1).toLowerCase();
          if(seen.has(base))throw Error('El ZIP contiene una clase duplicada: '+base);
          seen.add(base);
          const declaredSize=entry._data?.uncompressedSize;
          if(!Number.isFinite(declaredSize)||declaredSize<1||declaredSize>10*1024*1024)
            throw Error('Un GeoJSON del ZIP supera el límite de 10 MB');
          const content=await entry.async('string');
          if(content.length>10*1024*1024)
            throw Error('GeoJSON demasiado grande al extraer el ZIP');
          extracted.push({name:base,content});
        }
      }else if(/\.(geojson|json)$/i.test(name)){
        if(!Number.isFinite(file.size)||file.size>10*1024*1024)
          throw Error('Cada GeoJSON debe ser inferior a 10 MB');
        extracted.push({name,content:await file.text()});
      }else throw Error('Solo se admiten ZIP y GeoJSON para las clases de vegetación');
    }
    if(!extracted.length||extracted.length>12)
      throw Error('No se encontraron clases GeoJSON compatibles');
    return extracted;
  }
  return Object.freeze({CLASSES,classKey,prepare,readSources});
});