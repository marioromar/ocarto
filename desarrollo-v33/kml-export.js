/* KMZ export for georeferenced Ocarto GeoJSON maps. */
(function(root){
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
  function geoJsonToKml(data,transformCoordinate){
    if(data?.metadata?.coordinate_status!=='georeferenced')throw Error('Para exportar a KMZ, georreferencia el mapa y asigna su CRS');
    const source=String(data.metadata.crs||'').trim().toUpperCase();
    if(!/^EPSG:(4326|258(?:2[8-9]|3[0-8])|326(?:0[1-9]|[1-5][0-9]|60)|327(?:0[1-9]|[1-5][0-9]|60))$/.test(source))throw Error('La exportación KMZ requiere EPSG:4326 o un CRS UTM EPSG:258xx, 326xx o 327xx compatible');
    if(typeof transformCoordinate!=='function')throw Error('No está disponible la conversión de coordenadas');
    const xy=coord=>{
      if(!Array.isArray(coord)||coord.length<2||!Number.isFinite(Number(coord[0]))||!Number.isFinite(Number(coord[1])))throw Error('El mapa contiene coordenadas no válidas');
      const p=source==='EPSG:4326'?{x:Number(coord[0]),y:Number(coord[1])}:transformCoordinate(Number(coord[0]),Number(coord[1]),source,'EPSG:4326');
      if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x < -180||p.x>180||p.y < -90||p.y>90)throw Error('Una coordenada no se pudo convertir a longitud/latitud');
      const lon=Number(p.x.toFixed(8)),lat=Number(p.y.toFixed(8));
      return `${lon},${lat}`;
    };
    const line=coords=>{if(!Array.isArray(coords)||coords.length<2)throw Error('Línea sin suficientes vértices');return coords.map(xy).join(' ')};
    const ring=coords=>{if(!Array.isArray(coords)||coords.length<3)throw Error('Polígono sin suficientes vértices');const pts=coords.slice(),a=pts[0],b=pts.at(-1);if(!Array.isArray(b)||Number(a[0])!==Number(b[0])||Number(a[1])!==Number(b[1]))pts.push(a);return line(pts)};
    const geometry=g=>{
      if(!g||!g.type)throw Error('Geometría vacía');
      if(g.type==='Point')return `<Point><coordinates>${xy(g.coordinates)}</coordinates></Point>`;
      if(g.type==='MultiPoint')return `<MultiGeometry>${g.coordinates.map(c=>geometry({type:'Point',coordinates:c})).join('')}</MultiGeometry>`;
      if(g.type==='LineString')return `<LineString><tessellate>1</tessellate><coordinates>${line(g.coordinates)}</coordinates></LineString>`;
      if(g.type==='MultiLineString')return `<MultiGeometry>${g.coordinates.map(c=>geometry({type:'LineString',coordinates:c})).join('')}</MultiGeometry>`;
      if(g.type==='Polygon'){
        if(!Array.isArray(g.coordinates)||!g.coordinates.length)throw Error('Polígono sin anillo exterior');
        const [outer,...holes]=g.coordinates;
        return `<Polygon><tessellate>1</tessellate><outerBoundaryIs><LinearRing><coordinates>${ring(outer)}</coordinates></LinearRing></outerBoundaryIs>${holes.map(h=>`<innerBoundaryIs><LinearRing><coordinates>${ring(h)}</coordinates></LinearRing></innerBoundaryIs>`).join('')}</Polygon>`;
      }
      if(g.type==='MultiPolygon')return `<MultiGeometry>${g.coordinates.map(c=>geometry({type:'Polygon',coordinates:c})).join('')}</MultiGeometry>`;
      throw Error(`Geometría ${g.type} no compatible con KML`);
    };
    const hiddenLayers=new Set((data.metadata.vector_layers||[]).filter(layer=>layer.visible===false).map(layer=>layer.name));
    const features=(Array.isArray(data.features)?data.features:[]).filter(feature=>!hiddenLayers.has(feature?.properties?.vector_layer));
    if(!features.length)throw Error('No hay elementos visibles para exportar');
    const placemarks=features.map(feature=>{
      const props=feature?.properties||{},name=props.symbol_name||props.name||props.vector_layer||'Elemento';
      const geometryXml=geometry(feature.geometry);
      const fields=[['símbolo',props.symbol],['capa',props.vector_layer],['candidato LiDAR',props.candidate?'sí':null],['origen',props.source]].filter(pair=>pair[1]!==undefined&&pair[1]!==null&&pair[1]!=='');
      const extended=fields.length?`<ExtendedData>${fields.map(([k,v])=>`<Data name="${esc(k)}"><value>${esc(v)}</value></Data>`).join('')}</ExtendedData>`:'';
      return `<Placemark><name>${esc(name)}</name>${extended}<Style><LineStyle><color>ff469b55</color><width>1.5</width></LineStyle><PolyStyle><color>55469b55</color><fill>1</fill><outline>1</outline></PolyStyle><IconStyle><color>ff469b55</color><scale>0.8</scale></IconStyle></Style>${geometryXml}</Placemark>`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${esc(data.name||'Mapa Ocarto')}</name>${placemarks}</Document></kml>`;
  }
  async function toKmz(kml,zipApi){if(!zipApi||typeof zipApi.prototype?.file!=='function')throw Error('No está disponible el creador de archivos KMZ');const zip=new zipApi();zip.file('doc.kml',kml);return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}})}
  root.OcartoKmlExport={geoJsonToKml,toKmz};
  if(typeof module==='object'&&module.exports)module.exports=root.OcartoKmlExport;
})(typeof globalThis!=='undefined'?globalThis:this);
