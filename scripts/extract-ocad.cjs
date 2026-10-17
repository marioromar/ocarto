// Extrae las definiciones COMPLETAS de símbolos de un .ocd (OCAD 2018) a mm base ISOM (÷1,5).
const fs=require('fs');
const file=process.argv[2],out=process.argv[3],K=+(process.argv[4]||1.5);
const b=fs.readFileSync(file);const dv=new DataView(b.buffer,b.byteOffset,b.length);
const i16=p=>dv.getInt16(p,true),u16=p=>dv.getUint16(p,true),i32=p=>dv.getInt32(p,true),u32=p=>dv.getUint32(p,true),u8=p=>b[p];
const r=v=>Math.round(v/K*1000)/1000, mm=v=>Math.round(v/K)/100;
// colores (tabla de parámetros tipo 9: "Nombre\tn#\tc..\tm..\ty..\tk..\to..\tt..")
const inks={};
{const nParam=i32(0x0)>=0?null:null;}
const colors={};
const ORD={};{const {parse}=require(require('path').join(__dirname,'../source/v234/ocad-editable.js'));parse(new Uint8Array(b)).colors.forEach((c,i)=>{ORD[c.number]=i})}
{ // índice de parámetros: u32(32)=puntero a lista; formato usado por el proyecto: bloque en offset indicado en cabecera
  let pb=u32(32); // StringIndex
  const seen=new Set();
  while(pb&&!seen.has(pb)&&pb<b.length){seen.add(pb);
    for(let i=0;i<256;i++){const q=pb+4+i*16;if(q+16>b.length)break;const pos=u32(q),len=i32(q+4),type=i32(q+8);if(!pos||len<=0)continue;
      if(type===9){const s=Buffer.from(b.subarray(pos,pos+len)).toString('utf8').replace(/\0.*/,'');const f=s.split('\t');const g=k=>{const t=f.find(x=>x[0]===k);return t?parseFloat(t.slice(1)):0};
        const n=g('n');colors[n]={name:f[0],c:g('c'),m:g('m'),y:g('y'),k:g('k')}}}
    pb=u32(pb)}
}
const rgb=c=>c?'#'+[c.c,c.m,c.y].map(v=>Math.round(255*(1-v/100)*(1-c.k/100)).toString(16).padStart(2,'0')).join(''):'#000000';
const coord=(p)=>{const x=i32(p),y=i32(p+4);return {x:(x>>8)/100,y:-(y>>8)/100,xf:x&255,yf:y&255}};
function elements(pos,end){const els=[];while(pos+16<=end){const type=i16(pos),ink=i16(pos+4),w=i16(pos+6),d=i16(pos+8),n=i16(pos+10);
  if(type<1||type>4||n<0||n>2000||pos+16+n*8>end)break;const pts=[];for(let z=0;z<n;z++){const c=coord(pos+16+z*8);pts.push([r(c.x*100)/100,r(c.y*100)/100,c.xf,c.yf])}
  els.push({k:['','linea','area','circulo','punto'][type],ink,w:mm(w),d:mm(d),pts});pos+=16+n*8}return els}
const recs=[];let blk=u32(8);const seen=new Set();
while(blk&&!seen.has(blk)){seen.add(blk);for(let i=0;i<256;i++){const p=u32(blk+4+i*4);if(p)recs.push(p)}blk=u32(blk)}
const syms=[];
for(const p of recs){const len=i32(p),code=i32(p+4),type=u8(p+8);const ncol=i16(p+26);const used=[];for(let j=0;j<ncol&&j<14;j++)used.push(i16(p+28+2*j));
  const name=new TextDecoder('utf-16le').decode(b.subarray(p+56,p+120)).replace(/\0.*/,'').trim();
  const S=p+796,end=p+len;const o={code,name,tipo:['','punto','linea','area','texto'][type]||type,tintas:used};
  if(type===1){const n=u16(S)*8;o.elementos=elements(S+4,Math.min(end,S+4+n))}
  else if(type===2){const f=k=>i16(S+k*2);
    Object.assign(o,{tinta:f(0),ancho:mm(f(1)),extremos:f(2),distIni:mm(f(3)),distFin:mm(f(4)),largo:mm(f(5)),largoFin:mm(f(6)),hueco:mm(f(7)),huecoSec:mm(f(8)),huecoFin:mm(f(9)),minSim:f(10),nSimb:f(11),distSimb:mm(f(12)),
      doble:{modo:f(13),flags:f(14),relleno:f(15),izq:f(16),der:f(17),ancho:mm(f(18)),anchoIzq:mm(f(19)),anchoDer:mm(f(20)),largo:mm(f(21)),hueco:mm(f(22))}});
    let q=S+76;const sz=[32,33,34,35,36].map(k=>f(k)*8);const names=['prim','sec','esquina','inicio','fin'];o.marcas={};
    names.forEach((nm,ix)=>{if(sz[ix]>0){o.marcas[nm]=elements(q,q+sz[ix]);q+=sz[ix]}})}
  else if(type===3){const f=k=>i16(S+k*2);
    Object.assign(o,{rellenoOn:!!(f(9)&255),bordeOn:!!(f(9)>>8),tintaRelleno:f(2),
      trama:f(3)?{modo:f(3),tinta:f(4),ancho:mm(f(5)),dist:mm(f(6)),ang1:f(7)/10,ang2:f(8)/10}:null});
    const nEl=end-(S+36);if(f(10)&255&&nEl>=16)o.estructura={modo:f(10)&255,ancho:mm(f(11)),alto:mm(f(12)),ang:f(13)/10,elementos:elements(S+36,end)}}
  syms.push(o)}
syms.sort((a,b)=>a.code-b.code);
const usedInk=new Set();syms.forEach(s=>{(s.tintas||[]).forEach(i=>usedInk.add(i));[s.tinta,s.tintaRelleno,s.doble?.relleno,s.doble?.izq,s.doble?.der,s.trama?.tinta].forEach(i=>i!=null&&usedInk.add(i))});
const outColors={};for(const i of usedInk)if(colors[i])outColors[i]={orden:ORD[i]??999,nombre:colors[i].name,cmyk:[colors[i].c,colors[i].m,colors[i].y,colors[i].k],rgb:rgb(colors[i])};
fs.writeFileSync(out,JSON.stringify({fuente:file.split('/').pop(),factorOrigenAIsom:K,unidades:'mm de papel a escala base ISOM 1:15000 (valor del .ocd ÷ '+K+')',tintas:outColors,simbolos:syms}));
const cnt={};syms.forEach(s=>cnt[s.tipo]=(cnt[s.tipo]||0)+1);console.log('símbolos',syms.length,JSON.stringify(cnt),'tintas',Object.keys(outColors).length,'| con marcas de línea',syms.filter(s=>s.marcas&&Object.keys(s.marcas).length).length,'| áreas con estructura',syms.filter(s=>s.estructura).length);
