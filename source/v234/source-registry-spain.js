/* Ocarto source registry · Spain. Provider metadata and download/template adapters. */
window.OCARTO_SOURCE_REGISTRY = Object.freeze([
  {id:'ign-cnig',scope:'state',provider:'IGN / CNIG',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WMTS','LAZ','ASC','GeoTIFF'],regions:['ES'],serviceUrl:'https://www.ign.es/wmts/pnoa-ma',downloadUrl:'https://centrodedescargas.cnig.es/CentroDescargas/catalogo.do?Serie=LIDA3',downloadKind:'catalog',downloadHint:'Catálogo CNIG de LiDAR y productos geográficos'},
  {id:'pnoa',scope:'state',provider:'PNOA',types:['orthophoto','lidar'],formats:['WMS','WMTS','LAZ','COG'],regions:['ES'],serviceUrl:'https://www.ign.es/wms-inspire/pnoa-ma?request=GetCapabilities&service=WMS',downloadUrl:'https://pnoa.ign.es/web/portal/pnoa-lidar/productos-a-descarga',downloadKind:'catalog',downloadHint:'Catálogo oficial PNOA/CNIG'},
  {id:'cartociudad',scope:'state',provider:'CartoCiudad',types:['topography','roads','addresses'],formats:['WMS','WFS'],regions:['ES'],serviceUrl:'https://www.cartociudad.es/services-base/CartoCiudad/WMSServer?request=GetCapabilities&service=WMS',downloadKind:'service',downloadHint:'Servicio interoperable; se conecta como plantilla'},
  {id:'osm',scope:'community',provider:'OpenStreetMap',types:['roads','buildings','landuse','water'],formats:['Overpass','GeoJSON'],regions:['ES'],downloadKind:'overpass',downloadHint:'Descarga automática GeoJSON por la zona seleccionada'},
  {id:'mapant-es',scope:'community',provider:'mapant.es',types:['orienteering-map','topography','roads','landuse'],formats:['web-map','vector-data'],regions:['ES'],url:'https://mapant.es/',downloadKind:'reference',downloadHint:'Visor y fuente de mapas de orientación'},
  {id:'ide-andalucia',scope:'autonomous',provider:'IDE Andalucía',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WMTS','WFS'],regions:['AN'],downloadKind:'catalog'},
  {id:'ide-aragon',scope:'autonomous',provider:'IDE Aragón',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WMTS','WFS'],regions:['AR'],downloadKind:'catalog'},
  {id:'ide-asturias',scope:'autonomous',provider:'IDE Asturias',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WFS'],regions:['AS'],downloadKind:'catalog'},
  {id:'ide-baleares',scope:'autonomous',provider:'IDEIB',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WMTS','WFS'],regions:['IB'],downloadKind:'catalog'},
  {id:'ide-canarias',scope:'autonomous',provider:'IDE Canarias',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WFS'],regions:['CN'],downloadKind:'catalog'},
  {id:'ide-cantabria',scope:'autonomous',provider:'IDE Cantabria',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WFS'],regions:['CB'],downloadKind:'catalog'},
  {id:'ide-castillalamancha',scope:'autonomous',provider:'IDE Castilla-La Mancha',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WFS'],regions:['CM'],downloadKind:'catalog'},
  {id:'ide-castillayleon',scope:'autonomous',provider:'IDE Castilla y León',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WFS'],regions:['CL'],downloadKind:'catalog'},
  {id:'ide-catalunya',scope:'autonomous',provider:'ICGC',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WMTS','WFS'],regions:['CT'],downloadKind:'catalog'},
  {id:'ide-euskadi',scope:'autonomous',provider:'GeoEuskadi',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WMTS','WFS'],regions:['PV'],downloadKind:'catalog'},
  {id:'ide-galicia',scope:'autonomous',provider:'Xunta de Galicia',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WFS'],regions:['GA'],downloadKind:'catalog'},
  {id:'ide-madrid',scope:'autonomous',provider:'Comunidad de Madrid',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WFS'],regions:['MD'],downloadKind:'catalog'},
  {id:'ide-murcia',scope:'autonomous',provider:'Región de Murcia',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WFS'],regions:['MC'],downloadKind:'catalog'},
  {id:'ide-navarra',scope:'autonomous',provider:'IDENA',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WMTS','WFS'],regions:['NC'],downloadKind:'catalog'},
  {id:'ide-rioja',scope:'autonomous',provider:'La Rioja',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WFS'],regions:['RI'],downloadKind:'catalog'},
  {id:'ide-valencia',scope:'autonomous',provider:'Institut Cartogràfic Valencià',types:['orthophoto','lidar','dem','topography'],formats:['WMS','WMTS','WFS'],regions:['VC'],downloadKind:'catalog'}
]);