/* Ocarto source registry · Spain. Metadata only; download adapters are added per provider. */
window.OCARTO_SOURCE_REGISTRY = Object.freeze([
  {id:'ign-cnig',scope:'state',provider:'IGN / CNIG',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WMTS','LAZ','ASC','GeoTIFF'],regions:['ES']},
  {id:'pnoa',scope:'state',provider:'PNOA',types:['orthophoto','lidar'],formats:['WMS','WMTS','LAZ'],regions:['ES']},
  {id:'cartociudad',scope:'state',provider:'CartoCiudad',types:['topography','roads','addresses'],formats:['WMS','WFS'],regions:['ES']},
  {id:'osm',scope:'community',provider:'OpenStreetMap',types:['roads','buildings','landuse','water'],formats:['Overpass','GeoJSON'],regions:['ES']},
  {id:'mapant-es',scope:'community',provider:'mapant.es',types:['orienteering-map','topography','roads','landuse'],formats:['web-map','vector-data'],regions:['ES'],url:'https://mapant.es/'}
  {id:'ide-andalucia',scope:'autonomous',provider:'IDE Andalucía',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WMTS','WFS'],regions:['AN']},
  {id:'ide-aragon',scope:'autonomous',provider:'IDE Aragón',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WMTS','WFS'],regions:['AR']},
  {id:'ide-asturias',scope:'autonomous',provider:'IDE Asturias',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WFS'],regions:['AS']},
  {id:'ide-baleares',scope:'autonomous',provider:'IDEIB',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WMTS','WFS'],regions:['IB']},
  {id:'ide-canarias',scope:'autonomous',provider:'IDE Canarias',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WFS'],regions:['CN']},
  {id:'ide-cantabria',scope:'autonomous',provider:'IDE Cantabria',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WFS'],regions:['CB']},
  {id:'ide-castillalamancha',scope:'autonomous',provider:'IDE Castilla-La Mancha',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WFS'],regions:['CM']},
  {id:'ide-castillayleon',scope:'autonomous',provider:'IDE Castilla y León',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WFS'],regions:['CL']},
  {id:'ide-catalunya',scope:'autonomous',provider:'ICGC',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WMTS','WFS'],regions:['CT']},
  {id:'ide-euskadi',scope:'autonomous',provider:'GeoEuskadi',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WMTS','WFS'],regions:['PV']},
  {id:'ide-galicia',scope:'autonomous',provider:'Xunta de Galicia',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WFS'],regions:['GA']},
  {id:'ide-madrid',scope:'autonomous',provider:'Comunidad de Madrid',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WFS'],regions:['MD']},
  {id:'ide-murcia',scope:'autonomous',provider:'Región de Murcia',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WFS'],regions:['MC']},
  {id:'ide-navarra',scope:'autonomous',provider:'IDENA',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WMTS','WFS'],regions:['NC']},
  {id:'ide-rioja',scope:'autonomous',provider:'La Rioja',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WFS'],regions:['RI']},
  {id:'ide-valencia',scope:'autonomous',provider:'Institut Cartogràfic Valencià',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WMTS','WFS'],regions:['VC']}
]);
