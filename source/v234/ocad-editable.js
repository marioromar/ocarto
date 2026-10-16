/* Ocarto – OCAD 10/11/12/2018 editable geometry and symbol importer.
 * Read-only parsing of the original binary: never modifies the supplied file.
 * Geometry, symbol ids, ink definitions and curved vertices are retained.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OcartoEditableOcad = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX_ITEMS = 100000, INDEX_ENTRIES = 256;
  const VALID = new Set([10, 11, 12, 2018]);
  function parse(input) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), size = bytes.byteLength;
    const at = (pos, len) => Number.isSafeInteger(pos) && pos >= 0 && pos + len <= size;
    const u8 = p => dv.getUint8(p), i16 = p => dv.getInt16(p, true), u16 = p => dv.getUint16(p, true), i32 = p => dv.getInt32(p, true), u32 = p => dv.getUint32(p, true);
    const fail = message => { throw new Error(message); };
    if (!at(0, 60) || u16(0) !== 0x0cad) fail('No es un archivo OCAD válido');
    const version = u16(4);
    if (!VALID.has(version)) fail('Versión OCAD ' + version + ' no admitida');
    const decoder = new TextDecoder('utf-8');
    const report = { indexed: 0, imported: 0, hidden: 0, deleted: 0, encrypted: 0, malformed: 0, unsupported: {}, symbols: 0, colors: 0, curves: 0, holes: 0 };
    // Indexed UTF-8 parameter strings. Type 1039 contains scale, CRS, grid and projected origin.
    const params = new Map();
    let strBlock = u32(32); const stringSeen = new Set();
    while (strBlock && !stringSeen.has(strBlock) && stringSeen.size < 2048) {
      if (!at(strBlock, 4 + 256 * 16)) fail('Índice de parámetros OCAD dañado');
      stringSeen.add(strBlock);
      for (let i = 0; i < INDEX_ENTRIES; i++) {
        const off = strBlock + 4 + i * 16, pos = u32(off), len = i32(off + 4), type = i32(off + 8);
        if (!pos || !len || !type || !at(pos, len) || len > 1024 * 1024) continue;
        const raw = decoder.decode(bytes.subarray(pos, pos + len)).replace(/\0+$/, '');
        const values = raw.split('\t'), obj = { name: values.shift() || '' };
        for (const value of values) if (value) obj[value[0]] = value.slice(1);
        if (!params.has(type)) params.set(type, []);
        params.get(type).push(obj);
      }
      strBlock = u32(strBlock);
    }
    const rawSetup = params.get(1039)?.[0] || {};
    const scale = Number(rawSetup.m) || 10000;
    const easting = Number(rawSetup.x) || 0, northing = Number(rawSetup.y) || 0;
    const epsg = Number(rawSetup.e);
    const setup = { scale, easting, northing, crs: epsg > 0 ? `EPSG:${epsg}` : null, georeferenced: rawSetup.r !== '0', angle: Number(rawSetup.a) || 0, grid: Number(rawSetup.i) || null };
    // OCAD color order is the order of type 9 parameter strings (top = highest print priority).
    const colors = (params.get(9) || []).map((c, order) => {
      const cmyk = ['c', 'm', 'y', 'k'].map(key => Math.max(0, Math.min(100, Number(c[key]) || 0)) / 100);
      const [cy, ma, ye, bl] = cmyk;
      const rgb = [cy, ma, ye].map(v => Math.round(255 * (1 - v) * (1 - bl)));
      return { number: Number(c.n), name: c.name, cmyk: cmyk.map(v => v * 100), rgb: '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join(''), order, overprint: c.o === '1', opacity: c.t === undefined ? 100 : Number(c.t) };
    }).filter(c => Number.isFinite(c.number));
    report.colors = colors.length;
    const byColor = new Map(colors.map(c => [c.number, c]));
    // Symbol definitions: OCAD 11+ common header and type-specific colors / line widths.
    const symbols = new Map(); let symBlock = u32(8); const symSeen = new Set();
    while (symBlock && !symSeen.has(symBlock) && symSeen.size < 4096) {
      if (!at(symBlock, 4 + 256 * 4)) fail('Índice de símbolos OCAD dañado');
      symSeen.add(symBlock);
      for (let i = 0; i < INDEX_ENTRIES; i++) {
        const p = u32(symBlock + 4 + i * 4);
        if (!p || !at(p, 30)) continue;
        const byteLength = i32(p), code = i32(p + 4), type = u8(p + 8);
        if (!at(p, byteLength) || byteLength < 30 || byteLength > 1000000) continue;
        const colorCount = i16(p + 26);
        const inks = [];
        if (colorCount > 0 && colorCount <= 14 && at(p + 28, colorCount * 2)) for (let j = 0; j < colorCount; j++) inks.push(i16(p + 28 + 2 * j));
        const description = version === 10
          ? Array.from(bytes.subarray(p + 57, p + 88)).map(c => String.fromCharCode(c)).join('').replace(/\0.*/, '').trim()
          : new TextDecoder('utf-16le').decode(bytes.subarray(p + 56, p + 120)).replace(/\0.*/, '').trim();
        const info = { code, label: description, type, inks, status: u8(p + 11), number: (code / 1000).toFixed(3) };
        if (version !== 10 && byteLength >= 806) {
          const symOffset = p + 796;
          if (type === 2) { info.lineInk = i16(symOffset); info.lineWidth = i16(symOffset + 2) / 100; info.lineStyle = i16(symOffset + 4); info.mainLength = i16(symOffset + 10) / 100; info.mainGap = i16(symOffset + 14) / 100; info.secondaryGap = i16(symOffset + 16) / 100; }
          else if (type === 3) { info.borderSym = i32(symOffset); info.fillInk = i16(symOffset + 4); info.hatchInk = i16(symOffset + 8); info.hatchMode = i16(symOffset + 6); info.hatchDist = i16(symOffset + 12) / 100; info.hatchAngle = i16(symOffset + 14) / 10; info.fillOn = !!u8(symOffset + 18); info.borderOn = !!u8(symOffset + 19); }
          else if (type === 1) {
            const elementDataSize = u16(symOffset), elements = []; let elPos = symOffset + 4, consumed = 0;
            while (consumed < elementDataSize * 8 && elements.length < 128 && elPos + 16 <= p + byteLength) {
              const elType = i16(elPos), ink = i16(elPos + 4), width = i16(elPos + 6) / 100, diameter = i16(elPos + 8) / 100, nCoords = i16(elPos + 10);
              if (nCoords < 0 || nCoords > 1024 || elPos + 16 + nCoords * 8 > p + byteLength) break;
              const points = [];
              for (let z = 0; z < nCoords; z++) { const xy = elPos + 16 + z * 8; points.push({ x: (i32(xy) >> 8) / 100, y: -(i32(xy + 4) >> 8) / 100, xf: u8(xy), yf: u8(xy + 4) }); }
              elements.push({ type: elType, ink, width, diameter, points });
              const used = 16 + nCoords * 8; elPos += used; consumed += used;
            }
            info.elements = elements;
          } else if (type === 4 && byteLength >= 836) { info.fontInk = i16(symOffset + 32); info.fontSize = i16(symOffset + 34); }
        }
        symbols.set(code, info);
      }
      symBlock = u32(symBlock);
    }
    report.symbols = symbols.size;
    function readText(pos, count, unicode) {
      if (!count) return '';
      const bytesCount = count * (unicode ? 2 : 1);
      if (!at(pos, bytesCount)) return '';
      return new TextDecoder(unicode ? 'utf-16le' : 'windows-1252').decode(bytes.subarray(pos, pos + bytesCount)).replace(/\0+$/, '');
    }
    const objects = [], seen = new Set(); let block = u32(12), visited = 0;
    while (block && !seen.has(block) && seen.size < 4096) {
      if (!at(block, 4 + 256 * 40)) fail('Índice de objetos OCAD dañado');
      seen.add(block);
      for (let i = 0; i < INDEX_ENTRIES; i++) {
        const idx = block + 4 + i * 40;
        const pos = u32(idx + 16), declaredLength = u32(idx + 20);
        if (!pos) continue;
        report.indexed++;
        const symbolNo = i32(idx + 24), type = u8(idx + 28), encrypted = u8(idx + 29), status = u8(idx + 30);
        if (status === 0 || status >= 3) { report.deleted++; continue; }
        if (encrypted) { report.encrypted++; continue; }
        const headerLen = version === 2018 || version === 12 ? 56 : 40;
        if (!at(pos, headerLen) || declaredLength < headerLen || !at(pos, declaredLength)) { report.malformed++; continue; }
        const sym = i32(pos), otp = u8(pos + 4), unicode = !!u8(pos + 5), angle = i16(pos + 6),
              nItem = u32(pos + (headerLen === 56 ? 44 : 8));
        if (otp !== type || (symbolNo !== sym && symbolNo !== 0) || nItem > MAX_ITEMS || !at(pos + headerLen, nItem * 8) || headerLen + nItem * 8 > declaredLength) { report.malformed++; continue; }
        const nText = headerLen === 56 ? u16(pos + 48) : u16(pos + 12);
        const nObjectStr = headerLen === 56 ? u16(pos + 50) : 0, nDbStr = headerLen === 56 ? u16(pos + 52) : 0;
        const coord = [];
        for (let j = 0; j < nItem; j++) {
          const p = pos + headerLen + j * 8, rawX = i32(p), rawY = i32(p + 4);
          coord.push({ x: (rawX >> 8) / 100, y: (rawY >> 8) / 100, xFlags: rawX & 255, yFlags: rawY & 255 });
        }
        const text = readText(pos + headerLen + nItem * 8, nText, unicode);
        const info = symbols.get(sym) || null;
        if (![1, 2, 3, 4, 5, 6].includes(otp) || !nItem) { report.unsupported[otp] = (report.unsupported[otp] || 0) + 1; continue; }
        // Keep original Bezier control-point flags, and derive editor-native tangents below.
        function translateRing(points) {
          const vertices = [], ctrl = []; let pending = [];
          for (const p of points) {
            if (p.xFlags & 1) { pending.push(p); continue; }
            if (p.xFlags & 2) { pending.push(p); continue; }
            const v = { x: p.x, y: -p.y, vertexType: p.yFlags & 1 ? 'corner' : 'normal', ocadXFlags: p.xFlags, ocadYFlags: p.yFlags };
            const prior = vertices[vertices.length - 1];
            if (prior && pending.length === 2) {
              prior.outTangent = { x: pending[0].x - prior.x, y: -pending[0].y - prior.y };
              v.inTangent = { x: pending[1].x - v.x, y: -pending[1].y - v.y };
              report.curves++;
            } else if (pending.length) { // Dangling handles are retained as raw object metadata.
              report.malformed++;
            }
            pending = [];
            vertices.push(v);
          }
          // Control handles wrapping from the end to the start of a closed ring.
          if (pending.length === 2 && vertices.length > 1) {
            const prior = vertices[vertices.length - 1], first = vertices[0];
            prior.outTangent = { x: pending[0].x - prior.x, y: -pending[0].y - prior.y };
            first.inTangent = { x: pending[1].x - first.x, y: -pending[1].y - first.y };
            report.curves++;
          }
          // OCAD allows repeating the first vertex at the end of a ring.
          if (vertices.length > 1 && Math.hypot(vertices[0].x - vertices[vertices.length - 1].x, vertices[0].y - vertices[vertices.length - 1].y) < 1e-8) { const closing = vertices.pop(); if (closing.inTangent) vertices[0].inTangent = closing.inTangent; if (closing.outTangent && !vertices[0].outTangent) vertices[0].outTangent = closing.outTangent; }
          return vertices;
        }
        let rings = null, vertices = null;
        if (otp === 3) {
          const chunks = [[]];
          for (let j = 0; j < coord.length; j++) {
            if (j && (coord[j].yFlags & 2)) { chunks.push([]); report.holes++; }
            chunks[chunks.length - 1].push(coord[j]);
          }
          rings = chunks.map(translateRing).filter(r => r.length > 2 || (r.length === 2 && r.some(p => p.inTangent || p.outTangent)));
          if (!rings.length) { report.malformed++; continue; }
          vertices = rings[0];
        } else vertices = translateRing(coord);
        const fontOrText = otp >= 4 && otp <= 6;
        const t = fontOrText ? 'text' : otp === 1 ? 'point' : otp === 2 ? 'line' : 'area';
        const item = { type: t, symbolNo: sym, symbolCode: (sym / 1000).toFixed(3), symbol: info, sourceOffset: pos, sourceIndexOffset: idx, angle, text,
          points: vertices, holes: rings?.slice(1) || [], hidden: status === 2,
          raw: { flags: coord.map(p => [p.xFlags, p.yFlags]), coordinates: coord.map(p => [p.x, p.y]), objectString: readText(pos + headerLen + nItem * 8 + nText * (unicode ? 2 : 1), nObjectStr, unicode),
            databaseStringCount: nDbStr, color: i32(pos + 8), lineWidth: i16(pos + 12) } };
        if (status === 2) report.hidden++;
        objects.push(item); report.imported++;
      }
      block = u32(block);
    }
    if (!objects.length) fail('No se han encontrado objetos OCAD editables');
    return { version, setup, colors, symbols: Array.from(symbols.values()), objects, report, colorByNumber: Object.fromEntries(colors.map(c => [c.number, c])) };
  }
  // Render imported symbol geometry at the original OCAD paper scale.
  function draw(ctx, feature) {
    const style = feature.ocadStyle || {};
    const color = style.color || '#26342d';
    const lineWidth = Math.max(0.025, style.lineWidth || 0.16);
    const path = (ring, close) => {
      if (!ring?.length) return;
      ctx.moveTo(ring[0].x, ring[0].y);
      const total = close ? ring.length : ring.length - 1;
      for (let i = 0; i < total; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length];
        if (a.outTangent && b.inTangent) ctx.bezierCurveTo(a.x + a.outTangent.x, a.y + a.outTangent.y, b.x + b.inTangent.x, b.y + b.inTangent.y, b.x, b.y);
        else ctx.lineTo(b.x, b.y);
      }
      if (close) ctx.closePath();
    };
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (feature.type === 'line') {
      if (style.dash?.[0] > 0 && style.dash[1] > 0) ctx.setLineDash(style.dash);
      ctx.beginPath(); path(feature.points, false); ctx.stroke(); ctx.setLineDash([]);
    } else if (feature.type === 'area') {
      ctx.beginPath(); path(feature.points, true); for (const hole of feature.holes || []) path(hole, true);
      if (style.fill) { ctx.fillStyle = style.fill; ctx.fill('evenodd'); }
      if (style.hatch && style.hatchColor) {
        ctx.save(); ctx.clip('evenodd');
        const points = feature.points || [], xs = points.map(p => p.x), ys = points.map(p => p.y);
        const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
        const diag = Math.hypot(xmax - xmin, ymax - ymin), spacing = Math.max(0.12, style.hatchSpacing || 1.2);
        const midX = (xmin + xmax) / 2, midY = (ymin + ymax) / 2;
        ctx.translate(midX, midY); ctx.rotate((style.hatchAngle || 0) * Math.PI / 180); ctx.beginPath();
        for (let x = -diag; x <= diag; x += spacing) { ctx.moveTo(x, -diag); ctx.lineTo(x, diag); }
        ctx.strokeStyle = style.hatchColor; ctx.lineWidth = Math.max(0.03, style.hatchWidth || 0.08); ctx.stroke();
        if (style.hatch === 2 || style.hatch === 3) { ctx.rotate(Math.PI / 2); ctx.beginPath(); for (let x = -diag; x <= diag; x += spacing) {ctx.moveTo(x,-diag); ctx.lineTo(x,diag);} ctx.stroke(); }
        ctx.restore();
      }
      if (style.outline) { ctx.strokeStyle = style.outline; ctx.lineWidth = lineWidth; ctx.stroke(); }
    } else if (feature.type === 'point') {
      if (feature.ocadText) {
        const text = String(feature.ocadText).split('\n'); ctx.fillStyle = color;
        const fontSize = Math.max(0.8, Number(style.fontSize) || 2.5);
        ctx.font = fontSize + 'px Arial, sans-serif';
        for (let i = 0; i < text.length; i++) ctx.fillText(text[i], 0, i * fontSize * 1.2);
      } else if (Array.isArray(style.elements) && style.elements.length) {
        ctx.rotate((Number(feature.angle) || 0) * Math.PI / 1800);
        for (const element of style.elements) {
          const pts = element.points || [], inkColor = element.color || color;
          ctx.beginPath();
          ctx.lineWidth = Math.max(0.03, element.width || 0.1); ctx.strokeStyle = inkColor; ctx.fillStyle = inkColor;
          if (element.type === 3 || element.type === 4) {
            const p = pts[0] || {x:0,y:0}; ctx.arc(p.x,p.y,Math.max(.04,element.diameter/2),0,Math.PI*2);
            if (element.type === 4) ctx.fill(); else ctx.stroke();
          } else if (pts.length) {
            ctx.moveTo(pts[0].x,pts[0].y);
            for (const p of pts.slice(1)) ctx.lineTo(p.x,p.y);
            if (element.type === 2) {ctx.closePath();ctx.fill('evenodd');} else ctx.stroke();
          }
        }
      } else {
        ctx.beginPath(); ctx.arc(0,0,0.35,0,Math.PI*2); ctx.stroke();
      }
    }
    ctx.restore();
  }
  // Loss-minimizing edit/save: original OCAD records, symbols, inks and unrelated
  // records are copied byte-for-byte. Only edited/deleted/added objects are patched.
  // Imported source objects must carry their original index positions and baseline.
  function geometrySignature(feature) {
    return JSON.stringify({type:feature.type,x:feature.x||0,y:feature.y||0,
      points:feature.points||[],holes:feature.holes||[],text:feature.ocadText||'',
      angle:feature.angle||0,symbolCode:feature.symbolCode||''});
  }
  function exportEdited(original, parsed, features) {
    if(![11,12,2018].includes(parsed.version))throw Error('La escritura .ocd admite OCAD 11/12/2018');
    const source=original instanceof Uint8Array?original:new Uint8Array(original);
    const read=new DataView(source.buffer,source.byteOffset,source.byteLength);
    if(read.getUint16(0,true)!==0x0cad||read.getUint16(4,true)!==parsed.version)throw Error('El archivo original no corresponde a esta sesión');
    const headerLen=parsed.version===11?40:56;
    const objectsByOffset=new Map(parsed.objects.map(o=>[o.sourceIndexOffset,o]));
    const matched=new Set(),warnings=[];let changed=0,deleted=0,added=0;
    const symbols=new Map(parsed.symbols.map(s=>[s.code,s]));
    const output=Array.from(source),overrides=[];
    const align=()=>{while(output.length%4)output.push(0)};
    function writePatch(at,bytes){overrides.push({at,bytes})}
    function put32(at,num){const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,num,true);writePatch(at,b)}
    function put8(at,num){writePatch(at,Uint8Array.of(num))}
    function encodePoints(feature,objType){
      const coords=[],isArea=objType===3;let rings;
      if(objType===1){rings=[[{x:feature.x||0,y:feature.y||0}]]}
      else if([4,5,6].includes(objType)){
        const sourceObject=objectsByOffset.get(Number(feature.properties?.ocadSourceIndexOffset));
        const base=sourceObject?.raw?.coordinates;
        const anchor=sourceObject?.points?.[0];
        const dx=(feature.x||0)-(anchor?.x||0),dy=(feature.y||0)-(anchor?.y||0);
        rings=[base?.length?base.map(([x,y])=>({x:x+dx,y:-y+dy})):[{x:feature.x||0,y:feature.y||0}]];
      }else rings=[feature.points||[],...(isArea?feature.holes||[]:[])];
      const push=(p,xf=0,yf=0)=>{
        if(!Number.isFinite(p?.x)||!Number.isFinite(p?.y))throw Error('Coordenada OCAD inválida');
        const x=Math.round(p.x*100),y=Math.round(-p.y*100);
        if(Math.abs(x)>=8388608||Math.abs(y)>=8388608)throw Error('Coordenada fuera del límite de OCAD (24 bits)');
        const sx=((x<<8)|(xf&255))|0,sy=((y<<8)|(yf&255))|0;
        coords.push([sx,sy]);
      };
      for(let r=0;r<rings.length;r++){
        const pts=rings[r];if(!pts.length)continue;
        const area=isArea,numberOfSegments=area?pts.length:pts.length-1;
        for(let i=0;i<pts.length;i++){
          const a=pts[i],previous=pts[(i-1+pts.length)%pts.length];
          if(!i)push(a,a.ocadXFlags&~3,(a.ocadYFlags&~2)|(r?2:0));
          if(i<numberOfSegments){const b=pts[(i+1)%pts.length];
            if(a.outTangent&&b.inTangent){
              push({x:a.x+a.outTangent.x,y:a.y+a.outTangent.y},1,0);
              push({x:b.x+b.inTangent.x,y:b.y+b.inTangent.y},2,0);
            }
            if(i+1<pts.length)push(b,b.ocadXFlags&~3,b.ocadYFlags&~2);
          }
        }
      }
      if(!coords.length)throw Error('El objeto no tiene coordenadas');
      const out=new Uint8Array(coords.length*8),d=new DataView(out.buffer);
      for(let i=0;i<coords.length;i++){d.setInt32(i*8,coords[i][0],true);d.setInt32(i*8+4,coords[i][1],true)}
      return {bytes:out,count:coords.length};
    }
    function recordFor(feature,originalObject,objectType,number){
      const offset=originalObject?.sourceOffset;
      const originalSize=offset===undefined?0:read.getUint32(originalObject.sourceIndexOffset+20,true);
      const originalCount=offset===undefined?0:read.getUint32(offset+(headerLen===56?44:8),true);
      let tail=offset===undefined?new Uint8Array(0):source.subarray(offset+headerLen+originalCount*8,offset+originalSize);
      const isText=[4,5,6].includes(objectType),newText=String(feature.ocadText||'');
      if(isText&&offset!==undefined&&newText!==originalObject.text){
        const unicode=!!read.getUint8(offset+5),sizePerChar=unicode?2:1;
        const originalLen=read.getUint16(offset+(headerLen===56?48:12),true);
        if(newText.length>65535)throw Error('Texto OCAD demasiado largo');
        const textBytes=new Uint8Array(newText.length*sizePerChar);
        const dText=new DataView(textBytes.buffer);
        for(let i=0;i<newText.length;i++){
          const ch=newText.charCodeAt(i);
          if(unicode)dText.setUint16(i*2,ch,true);
          else textBytes[i]=ch<=255?ch:63;
        }
        const rest=tail.subarray(originalLen*sizePerChar);
        tail=new Uint8Array(textBytes.length+rest.length);tail.set(textBytes);tail.set(rest,textBytes.length);
      }
      const geom=encodePoints(feature,objectType);
      const result=new Uint8Array(headerLen+geom.bytes.length+tail.length);
      if(offset!==undefined)result.set(source.subarray(offset,offset+headerLen));
      const d=new DataView(result.buffer);
      d.setInt32(0,number,true);d.setUint8(4,objectType);if(offset===undefined)d.setUint8(5,1);
      d.setInt16(6,Math.round(feature.angle||0),true);
      d.setUint32(headerLen===56?44:8,geom.count,true);
      if(isText&&offset!==undefined&&newText!==originalObject.text)d.setUint16(headerLen===56?48:12,newText.length,true);
      result.set(geom.bytes,headerLen);result.set(tail,headerLen+geom.bytes.length);
      return result;
    }
    const candidates=new Map();
    for(const f of features){
      const idx=Number(f.properties?.ocadSourceIndexOffset);
      if(objectsByOffset.has(idx)){
        if(matched.has(idx))throw Error('Un objeto OCAD original aparece duplicado');
        matched.add(idx);
        if(!f.properties?.ocadBaseline||geometrySignature(f)!==f.properties.ocadBaseline)candidates.set(idx,f);
      }
    }
    for(const [indexOffset,obj] of objectsByOffset){
      if(!matched.has(indexOffset)){put8(indexOffset+30,3);deleted++;continue}
      const f=candidates.get(indexOffset);if(!f)continue;
      const nativeType=read.getUint8(indexOffset+28);
      const sym=Number.parseInt(String(f.symbolCode||obj.symbolCode).replace('.',''),10);
      const symbol=symbols.get(sym);
      if(!symbol||((nativeType===1||nativeType===2||nativeType===3)&&symbol.type!==nativeType))throw Error('Símbolo OCAD inválido para el objeto '+f.symbolCode);
      const rec=recordFor(f,obj,nativeType,sym);
      align();const start=output.length;for(const byte of rec)output.push(byte);
      put32(indexOffset+16,start);put32(indexOffset+20,rec.length);put32(indexOffset+24,sym);changed++;
    }
    // Add newly created objects in the source OCAD layer if a compatible symbol exists.
    const fresh=[];
    for(const f of features){const idx=Number(f.properties?.ocadSourceIndexOffset);if(objectsByOffset.has(idx))continue;
      const value=Number.parseInt(String(f.symbolCode||'').replace('.',''),10),sym=symbols.get(value);
      const type=f.ocadText?4:f.type==='point'?1:f.type==='line'?2:f.type==='area'?3:0;
      if(!sym||!type||sym.type!==type){warnings.push('Objeto añadido sin símbolo OCAD compatible: '+(f.symbolCode||f.symbol||'?'));continue}
      fresh.push({feature:f,number:value,type});
    }
    // Find genuinely free index records; add new blocks when necessary.
    let block=read.getUint32(12,true),visited=new Set(),free=[],lastBlock=0;
    while(block&&!visited.has(block)&&block+4+256*40<=source.byteLength){visited.add(block);lastBlock=block;
      for(let k=0;k<256;k++){const ix=block+4+k*40;if(!read.getUint32(ix+16,true)&&!read.getUint8(ix+30))free.push(ix)}
      block=read.getUint32(block,true);
    }
    for(const item of fresh){
      let indexOffset=free.shift();
      if(indexOffset===undefined){
        align();const newBlock=output.length;output.push(...new Uint8Array(4+256*40));
        if(lastBlock)put32(lastBlock,newBlock);else put32(12,newBlock);
        lastBlock=newBlock;
        for(let k=0;k<256;k++)free.push(newBlock+4+k*40);
        indexOffset=free.shift();
      }
      const rec=recordFor(item.feature,null,item.type,item.number);align();const pos=output.length;for(const byte of rec)output.push(byte);
      const entry=new Uint8Array(40),ev=new DataView(entry.buffer);
      ev.setUint32(16,pos,true);ev.setUint32(20,rec.length,true);ev.setInt32(24,item.number,true);
      ev.setUint8(28,item.type);ev.setUint8(30,1);
      writePatch(indexOffset,entry);added++;
    }
    const bytes=Uint8Array.from(output);
    for(const patch of overrides)bytes.set(patch.bytes,patch.at);
    // Full reparse validates all modified object-index pointers and counts.
    const verified=parse(bytes);
    if(verified.report.malformed>parsed.report.malformed)throw Error('Validación OCAD: hay objetos dañados tras exportar');
    return {bytes,report:{changed,deleted,added,unchanged:matched.size-changed,warnings,verifiedObjects:verified.report.imported}};
  }

  return { parse, draw, geometrySignature, exportEdited };
});