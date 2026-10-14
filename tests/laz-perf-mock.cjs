const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

async function run(format, length, count) {
  const messages = [];
  let nextPtr = 8, freed = [], opened = null, emitted = [], mallocSizes = [], failNextOpen = false;
  const heap = new Uint8Array(4096);
  class LASZip {
    open(ptr, size) { opened = { ptr, size }; if(failNextOpen){failNextOpen=false;throw Error('mock decoder open failure')} }
    getCount() { return count; }
    getPointLength() { return length; }
    getPointFormat() { return format; }
    getPoint(ptr) {
      const v = new DataView(heap.buffer);
      const idx = emitted.length;
      const base = idx === 0 ? [100, 200, 30] : [110, 220, 40];
      v.setInt32(ptr, base[0], true); v.setInt32(ptr + 4, base[1], true); v.setInt32(ptr + 8, base[2], true);
      emitted.push(idx);
    }
    delete() { this.deleted = true; }
  }
  const mod = {
    LASZip, HEAPU8: heap,
    _malloc(size) { const p = nextPtr; mallocSizes.push(size); nextPtr += size + 8; return p; },
    _free(ptr) { freed.push(ptr); },
  };
  const self = { createLazPerf: async options => { assert.equal(options.locateFile('laz-perf.wasm'), 'vendor/laz-perf.wasm'); return mod; } };
  const ctx = { self, postMessage: m => messages.push(m), importScripts: file => assert.equal(file, 'vendor/laz-perf.js'),
    Float64Array, DataView, Uint8Array, Map, Number, Math, Error, Promise, setTimeout };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../lidar-worker.js'), 'utf8'), ctx);
  const header = 375, buffer = new ArrayBuffer(header + 16), d = new DataView(buffer);
  d.setUint32(0, 0x4653414c, true); d.setUint8(24, 1); d.setUint8(25, 4);
  d.setUint8(104, format | 0x40); d.setUint16(105, length, true); d.setUint32(96, header, true);
  d.setUint32(107, count, true); d.setFloat64(131, 0.01, true); d.setFloat64(139, 0.02, true); d.setFloat64(147, 0.1, true);
  d.setFloat64(155, 1000, true); d.setFloat64(163, 2000, true); d.setFloat64(171, 10, true);
  d.setBigUint64(247, BigInt(count), true);
  await ctx.onmessage({ data: { type: 'load', buffer } });
  const result = messages.at(-1);
  assert.equal(result.type, 'loaded'); assert.equal(result.count, count);
  assert.equal(result.preview[0], 1001); assert.equal(result.preview[1], 2004); assert.equal(result.preview[2], 13);
  assert.deepEqual(freed, [8 + buffer.byteLength + 8], 'the per-point buffer is freed while the compressed LAZ stays cached');
  assert.equal(opened.size, buffer.byteLength); assert.equal(opened.ptr, 8);
  await ctx.onmessage({data:{type:'detect',options:{cell:10,minZ:-Infinity,maxZ:Infinity,minCount:1,localMax:false}}});
  assert.equal(messages.at(-1).type,'detected','reuses the cached compressed LAZ for analysis: '+messages.at(-1).message);
  assert.equal(opened.ptr,8,'analysis reopens the original WASM buffer');
  assert.equal(mallocSizes.filter(size=>size===buffer.byteLength).length,1,'compressed bytes are copied to WASM once, not once per analysis');
  failNextOpen=true;await ctx.onmessage({data:{type:'load',buffer:buffer.slice(0)}});
  assert.equal(messages.at(-1).type,'error','a corrupt replacement LAZ fails cleanly');
  assert.equal(freed.includes(8),false,'failed replacement preserves the currently loaded LAZ');
  await ctx.onmessage({data:{type:'detect',options:{cell:10,minZ:-Infinity,maxZ:Infinity,minCount:1,localMax:false}}});
  assert.equal(messages.at(-1).type,'detected','the previous LAZ remains usable after a failed replacement');
  const plain=new ArrayBuffer(247),plainView=new DataView(plain);plainView.setUint32(0,0x4653414c,true);plainView.setUint8(24,1);plainView.setUint8(25,2);plainView.setUint16(105,20,true);plainView.setUint32(96,227,true);plainView.setUint32(107,1,true);for(const off of [131,139,147])plainView.setFloat64(off,1,true);plainView.setInt32(227,1,true);plainView.setInt32(231,2,true);plainView.setInt32(235,3,true);
  await ctx.onmessage({data:{type:'load',buffer:plain}});
  assert.equal(messages.at(-1).type,'loaded','a replacement LAS loads normally');
  assert(freed.includes(8),'replacing a LAZ releases its cached WASM allocation');
  const streamed=buffer.slice(0),streamJob=91;await ctx.onmessage({data:{type:'load-start',jobId:streamJob,fileSize:streamed.byteLength}});assert.equal(messages.at(-1).type,'load-ready');
  let offset=0,sequence=0;for(const size of [101,streamed.byteLength-101]){const chunk=new Uint8Array(streamed,offset,size);sequence++;await ctx.onmessage({data:{type:'load-chunk',jobId:streamJob,sequence,offset,chunk}});offset+=size;assert.equal(messages.at(-1).type,'load-chunk-ack')}
  await ctx.onmessage({data:{type:'load-end',jobId:streamJob}});assert.equal(messages.at(-1).type,'loaded','LAZ chunks are copied straight into the retained WASM allocation');assert.equal(messages.at(-1).jobId,streamJob);
  assert.equal(mallocSizes.filter(size=>size===streamed.byteLength).length,3,'streamed LAZ uses its destination allocation directly, with no second compressed-file copy');
}
(async () => {
  await run(0, 20, 1);
  await run(6, 30, 2);
  console.log('OK: laz-perf API mock, LAS 1.4 count, XYZ offsets/scales, cached LAZ reuse and cleanup');
})().catch(error => { console.error(error); process.exitCode = 1; });
