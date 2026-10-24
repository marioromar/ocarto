// Chromium GUI -> real file input -> browser reader -> Web Worker -> offline LAZ WASM.
// Non-destructive smoke checks on top of v279. No modification of editor state.
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fixture = ext =>
  path.join(__dirname, '..', '..', 'source', 'v234', 'tests', 'fixtures', '1815.' + ext);

test('el editor avanzado conserva las herramientas LiDAR y la carga del WASM', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page).toHaveTitle(/Ocarto/i);
  await expect(page.locator('#lidarNav')).toHaveCount(1);
  await expect(page.locator('#pointFile')).toHaveCount(1);
  await expect(page.locator('#heightRasterFiles')).toHaveCount(1);
  await expect(page.locator('#tiledAreaBtn')).toHaveCount(1);
  await expect(page.locator('#auditMdtBtn')).toHaveCount(1);
  await expect(page.locator('#pointFile')).toHaveAttribute('accept', /\.las.*\.laz/);
  await expect(page.locator('#heightRasterFiles')).toHaveAttribute('accept', /\.png.*\.pgw/);
  const worker = await page.request.get('/lidar-worker.js');
  expect(worker.status()).toBe(200);
  const wasm = await page.request.get('/vendor/laz-perf.wasm');
  expect(wasm.status()).toBe(200);
  expect(wasm.headers()['content-type']).toContain('application/wasm');
});

for (const extension of ['las', 'laz']) {
  test('importación REAL con Chromium de ' + extension.toUpperCase(), async ({ page }) => {
    await page.goto('/index.html');
    // Select the actual cloud input, not the first arbitrary input on the page.
    await page.locator('#pointFile').setInputFiles(fixture(extension));
    // Verify the same real file remains readable through slice() in Chromium.
    // This identifies browser stream failures independently of the LAZ decoder.
    const header=await page.locator('#pointFile').evaluate(async input=>{
      const file=input.files?.[0];
      if(!file)return null;
      const bytes=new Uint8Array(await file.slice(0,4).arrayBuffer());
      return Array.from(bytes);
    });
    // The onchange handler clears file input once the transfer completes;
    // for fast fixtures it can finish before this read, so only assert if present.
    if(header)expect(header).toEqual([76,65,83,70]); // LASF
    // Real import must finish through worker.loaded; errors and cancellations fail.
    await expect(page.locator('#lidarStatus')).toHaveText('Carga completa', { timeout:75_000 });
    // The old #lidarNav remains in the DOM for compatibility, but is hidden
    // by the redesigned layout. The visible workspace tab is the real control.
    const lidarTab=page.locator('#workspaceTabs .workspace-tab[aria-controls="lidarWorkspace"]');
    await expect(lidarTab).toBeVisible();
    await lidarTab.click();
    await expect(page.locator('#lidarWorkspace')).toBeVisible();
    await expect(page.locator('#pointInfo')).toBeVisible();
    await expect(page.locator('#cloudName')).toHaveText('1815.' + extension);
    const count=await page.locator('#pointCount').textContent();
    expect(Number((count||'').split(' ')[0].replace(/[^\d]/g,''))).toBeGreaterThan(0);
    await expect(page.locator('#terrainBtn')).toBeEnabled();
  });
}


test('v285: selección de tres capas visible y no destructiva sin mapa georreferenciado', async ({ page }) => {
  await page.goto('/index.html');
  for(const id of ['vegReviewedPanel','vegReviewedFiles','vegReviewedDark',
    'vegReviewedHatch','vegReviewedYellow','vegReviewedImport','vegReviewedStatus',
    'vegReviewedAsTemplate'])
    await expect(page.locator('#'+id)).toHaveCount(1);
  const before=await page.locator('#featureCount').textContent();
  await page.evaluate(()=>{
    document.getElementById('vegReviewedYellow').checked=false;
    document.getElementById('vegReviewedImport').click();
  });
  await expect(page.locator('#vegReviewedStatus')).toContainText('No se importó ningún cambio');
  await expect(page.locator('#featureCount')).toHaveText(before);
});


test('v285: importar ZIP de 3 clases como plantilla protegida y rechazar duplicados', async ({page})=>{
  await page.goto('/index.html');
  const before=await page.evaluate(()=>({count:window.S.features.length,layers:window.S.vectorLayers.length}));
  // Exercise the real JSZip library shipped with Ocarto and browser File input.
  const archiveBytes=await page.evaluate(async()=>{
    const archive=new JSZip();
    const ring=[[500000,4100000],[500030,4100000],[500030,4100030],[500000,4100030],[500000,4100000]];
    const hole=[[500010,4100010],[500020,4100010],[500020,4100020],[500010,4100020],[500010,4100010]];
    for(const [name,id] of [['verde_oscuro','VO'],['rayado','VR'],['amarillo','AM']]){
      const fc={type:'FeatureCollection',features:[{
        type:'Feature',properties:{id:'BOB-TEST-'+id,clase:name,estado:'pendiente_revision'},
        geometry:{type:'Polygon',coordinates:[ring,hole]}
      }]};
      archive.file(name+'.geojson',JSON.stringify(fc));
    }
    archive.file('Bobadilla_original.tif',new Uint8Array(200));
    return Array.from(await archive.generateAsync({type:'uint8array'}));
  });
  await page.locator('#vegReviewedFiles').setInputFiles({
    name:'Ocarto_Bobadilla_v4_capas_seleccionables.zip',mimeType:'application/zip',
    buffer:Buffer.from(archiveBytes)
  });
  await page.evaluate(()=>{
    // Synthetic georeferenced map: no EPSG inference from actual Bobadilla!
    window.S.georef={a:.5,b:0,c:499800,d:0,e:-.5,f:4100200};
    window.S.renderGeo={cx:500000,cy:4100000,scale:1};
    document.getElementById('mapCrs').value='EPSG:32630';
    document.getElementById('vegReviewedDark').checked=true;
    document.getElementById('vegReviewedHatch').checked=false;
    document.getElementById('vegReviewedYellow').checked=false;
    document.getElementById('vegReviewedAsTemplate').checked=true;
    document.getElementById('vegReviewedConfirmCrs').checked=true;
    document.getElementById('vegReviewedImport').click();
  });
  await expect(page.locator('#vegReviewedStatus')).toContainText('plantillas vectoriales protegidas',{timeout:15000});
  const result=await page.evaluate(()=>({
    features:window.S.features.slice(-1),layers:window.S.vectorLayers.slice(-1),
    total:window.S.features.length,layerCount:window.S.vectorLayers.length
  }));
  expect(result.total).toBe(before.count+1);
  expect(result.layerCount).toBe(before.layers+1);
  expect(result.layers[0].referenceOnly).toBe(true);
  expect(result.layers[0].name).toContain('Verde oscuro');
  expect(result.features[0].holes).toHaveLength(1);
  expect(result.features[0].reviewRequired).toBe(true);
  expect(result.features[0].vegetationReviewClass).toBe('verde_oscuro');
  expect(result.features[0].vegetationReviewSourceId).toBe('BOB-TEST-VO');
  // Duplicate import must not modify existing layers.
  await page.evaluate(()=>{
    window.S.georef={a:.5,b:0,c:499800,d:0,e:-.5,f:4100200};
    window.S.renderGeo={cx:500000,cy:4100000,scale:1};
    document.getElementById('vegReviewedImport').click();
  });
  await expect(page.locator('#vegReviewedStatus')).toContainText('No se importó ningún cambio',{timeout:15000});
  const final=await page.evaluate(()=>({total:window.S.features.length,layers:window.S.vectorLayers.length}));
  expect(final).toEqual({total:result.total,layers:result.layerCount});
});


// v286: dos LAS contiguos hasta cuatro GeoJSON, pasando por la interfaz REAL
// y el sistema de carpetas del navegador. Archivo artificial para probar la
// integración, NO equivale a procesar los 22,1 millones de puntos PNOA.
function makeAdjacentLas(x0,vegetated) {
  const points=[];
  for(let y=0;y<=10;y++)for(let x=0;x<=10;x++){
    points.push({x:x0+x,y:4100000+y,z:100,cls:2});
    if(vegetated){
      for(let k=0;k<3;k++)points.push({x:x0+x,y:4100000+y,z:105,cls:5});
      points.push({x:x0+x,y:4100000+y,z:101,cls:1});
    }
  }
  // LAS 1.4 / formato 8, idéntico al tipo de registro PNOA de Bobadilla.
  const bytes=Buffer.alloc(375+points.length*38);
  const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  d.setUint32(0,0x4653414c,true); // LASF
  d.setUint8(24,1);d.setUint8(25,4);
  d.setUint16(94,375,true);d.setUint32(96,375,true);
  d.setUint8(104,8);d.setUint16(105,38);
  d.setBigUint64(247,BigInt(points.length),true);
  for(const at of [131,139,147])d.setFloat64(at,.01,true);
  d.setFloat64(179,x0+10,true);d.setFloat64(187,x0,true);
  d.setFloat64(195,4100010,true);d.setFloat64(203,4100000,true);
  d.setFloat64(211,vegetated?105:100,true);d.setFloat64(219,100,true);
  for(const [i,p] of points.entries()){
    const at=375+i*38;
    d.setInt32(at,Math.round(p.x*100),true);
    d.setInt32(at+4,Math.round(p.y*100),true);
    d.setInt32(at+8,Math.round(p.z*100),true);
    d.setUint8(at+14,0x11);
    d.setUint8(at+16,p.cls);
  }
  return bytes;
}

test('v286: dos LAS contiguos hasta cuatro GeoJSON y plantillas UTM',async({page})=>{
  await page.addInitScript(()=>{
    const folders=[];
    function fakeDirectory(name){
      const files=new Map(),subs=new Map();
      const folder={
        name,files,subs,
        async getDirectoryHandle(child,{create=false}={}){
          if(!subs.has(child)){
            if(!create)throw new Error('Missing directory '+child);
            const next=fakeDirectory(child);subs.set(child,next);folders.push(next);
          }
          return subs.get(child);
        },
        async getFileHandle(filename,{create=false}={}){
          if(!files.has(filename)){
            if(!create)throw new Error('Missing file '+filename);
            files.set(filename,new Blob([]));
          }
          return {
            async getFile(){return new File([files.get(filename)],filename)},
            async createWritable(){
              const chunks=[];
              return {
                async write(data){chunks.push(data)},
                async close(){files.set(filename,new Blob(chunks))},
                async abort(){}
              };
            }
          };
        },
        async removeEntry(filename){files.delete(filename);subs.delete(filename)}
      };
      return folder;
    }
    const root=fakeDirectory('test-output');
    window.__ocartoTestFolders=folders;
    window.showDirectoryPicker=async()=>root;
  });
  await page.goto('/index.html');
  // El CRS está en otra pestaña. Fijarlo sin forzar su visibilidad ni
  // modificar la configuración real de la interfaz.
  await page.evaluate(()=>{
    for(const [id,value] of [['mapCrs','EPSG:25830'],['cellSize','0.5'],
      ['vegetationCell','0.5'],['vectorAggregationCell','2']]){
      const input=document.getElementById(id);
      input.value=value;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }
    document.getElementById('tiledAreaConfirmCrs').checked=true;
  });
  const lidarTab=page.locator('#workspaceTabs .workspace-tab[aria-controls="lidarWorkspace"]');
  await lidarTab.click();
  await expect(page.locator('#tiledAreaBtn')).toBeVisible();
  await page.locator('#tiledPointFile').setInputFiles([
    {name:'BOBADILLA_PRUEBA_384.las',mimeType:'application/octet-stream',
      buffer:makeAdjacentLas(500000,true)},
    {name:'BOBADILLA_PRUEBA_385.las',mimeType:'application/octet-stream',
      buffer:makeAdjacentLas(500010,false)}
  ]);
  await expect(page.locator('#tiledAreaStatus')).toContainText('Seleccionados 2');
  await page.locator('#tiledAreaBtn').click();
  await expect(page.locator('#tiledAreaStatus')).toContainText(
    'Zona LiDAR procesada',{timeout:85_000});
  const outputs=await page.evaluate(async()=>{
    const d=window.__ocartoTestFolders.at(-1);
    if(!d)return {files:[]};
    const names=[...d.files.keys()];
    const text=async name=>(await(await d.getFileHandle(name)).getFile()).text();
    const manifest=JSON.parse(await text('manifest.json'));
    const layers=await Promise.all(['verde_oscuro','rayado','amarillo'].map(async k=>{
      const fc=JSON.parse(await text('zona_completa_'+k+'_lidar.geojson'));
      return {name:k,count:fc.features.length,crs:fc.crs?.properties?.name,
        review:fc.features.every(f=>f.properties.review_required===true)};
    }));
    return {files:names,manifestState:manifest.state,mosaicState:manifest.mosaic?.state,
      vectorState:manifest.mosaic?.vectorization?.state,
      vectorError:manifest.mosaic?.vectorization?.error,
      sources:manifest.sourceFiles?.map(f=>f.name),layers};
  });
  expect(outputs.manifestState).toBe('complete');
  expect(outputs.mosaicState).toBe('complete');
  expect(outputs.vectorState).toBe('complete');
  expect(outputs.sources).toEqual(['BOBADILLA_PRUEBA_384.las','BOBADILLA_PRUEBA_385.las']);
  for(const file of ['zona_completa_vegetacion_candidata_lidar.geojson',
      'zona_completa_alturas_lidar.vrt','zona_completa_feature_map_lidar.vrt',
      'zona_completa_suelo_medido.csv',
      'zona_completa_verde_oscuro_lidar.geojson',
      'zona_completa_rayado_lidar.geojson',
      'zona_completa_amarillo_lidar.geojson'])
    expect(outputs.files).toContain(file);
  expect(outputs.layers).toHaveLength(3);
  expect(outputs.layers.every(layer=>layer.crs==='EPSG:25830'&&layer.review)).toBe(true);
  expect(outputs.layers.reduce((n,l)=>n+l.count,0)).toBeGreaterThan(0);
});
