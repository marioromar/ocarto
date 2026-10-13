const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

async function run(format, length, count) {
  const messages = [];
  let nextPtr = 8, freed = [], opened = null, emitted = [];
  const heap = new Uint8Array(4096);
  class LASZip {
    open(ptr, size) { opened = { ptr, size }; }
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
    _malloc(size) { const p = nextPtr; nextPtr += size + 8; return p; },
    _free(ptr) { freed.push(ptr); },
  };
  const self = { createLazPerf: async options => { assert.equal(options.locateFile('laz-perf.wasm'), 'vendor/laz-perf.wasm'); return mod; } };
  const ctx = { self, postMessage: m => messages.push(m), importScripts: file => assert.equal(file, 'vendor/laz-perf.js'),
    Float64Array, DataView, Uint8Array, Map, Number, Math, Error, Promise };
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
  assert.deepEqual(freed, [8 + buffer.byteLength + 8, 8]); assert.equal(opened.size, buffer.byteLength);
}
(async () => {
  await run(0, 20, 1);
  await run(6, 30, 2);
  console.log('OK: laz-perf API mock, LAS 1.4 count, XYZ offsets/scales, memory cleanup');
})().catch(error => { console.error(error); process.exitCode = 1; });
