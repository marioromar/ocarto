/* Ocarto · GPS para el editor cartográfico Chromium/Windows.
 * Bluetooth SPP previamente emparejado en Windows = puerto COM vía Web Serial.
 * El editor nativo Flutter utiliza su propio receptor serie (v250).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OcartoWebGps = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function checksum(sentence) {
    if (typeof sentence !== 'string' || sentence[0] !== '$') return false;
    const star = sentence.indexOf('*');
    if (star < 0 || star + 3 !== sentence.length || !/^[0-9a-f]{2}$/i.test(sentence.slice(star + 1))) return false;
    let value = 0;
    for (let i = 1; i < star; i++) value ^= sentence.charCodeAt(i);
    return value === Number.parseInt(sentence.slice(star + 1), 16);
  }
  function angle(value, hemi, lat) {
    if (!/^\d+(?:\.\d+)?$/.test(value || '')) return null;
    const numeric = Number(value), degrees = Math.floor(numeric / 100), mins = numeric - degrees * 100;
    if (!Number.isFinite(numeric) || mins < 0 || mins >= 60 || degrees > (lat ? 90 : 180)) return null;
    if (!(lat ? ['N','S'].includes(hemi) : ['E','W'].includes(hemi))) return null;
    const result = degrees + mins / 60;
    if (result > (lat ? 90 : 180)) return null;
    return ['S','W'].includes(hemi) ? -result : result;
  }
  function clock(value) {
    if (!/^\d{6}(?:\.\d+)?$/.test(value || '')) return null;
    const hour = Number(value.slice(0,2)), minute = Number(value.slice(2,4)), sec = Number(value.slice(4));
    if (hour > 23 || minute > 59 || sec >= 60) return null;
    return {hour,minute,sec};
  }
  function ggaTime(value, now) {
    const t = clock(value); if (!t) return null;
    const time = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),t.hour,t.minute,Math.floor(t.sec),Math.round((t.sec%1)*1000));
    if (time - now.getTime() > 12*3600*1000) return new Date(time - 86400000);
    if (now.getTime() - time > 12*3600*1000) return new Date(time + 86400000);
    return new Date(time);
  }
  function parseNmea(sentence, now = new Date()) {
    sentence = String(sentence).trim();
    if (!checksum(sentence)) return null;
    const f = sentence.slice(1,sentence.indexOf('*')).split(',');
    const type = (f[0] || '').slice(-3);
    let latitude, longitude, time, altitude = null, hdop = null, satellites = null, quality = 1;
    if (type === 'GGA') {
      if (f.length < 10 || !Number.isFinite(Number(f[6])) || Number(f[6]) < 1) return null;
      latitude = angle(f[2],f[3],true); longitude = angle(f[4],f[5],false);
      time = ggaTime(f[1], now);
      altitude = f[9] ? Number(f[9]) : null;
      hdop = f[8] ? Number(f[8]) : null;
      satellites = f[7] ? Number(f[7]) : null;
      quality = Number(f[6]);
    } else if (type === 'RMC') {
      if (f.length < 10 || f[2] !== 'A' || !/^\d{6}$/.test(f[9] || '')) return null;
      latitude = angle(f[3],f[4],true); longitude = angle(f[5],f[6],false);
      const t = clock(f[1]); if (!t) return null;
      const day = Number(f[9].slice(0,2)), month = Number(f[9].slice(2,4)), yr = Number(f[9].slice(4,6));
      const year = yr >= 80 ? 1900+yr : 2000+yr;
      time = new Date(Date.UTC(year,month-1,day,t.hour,t.minute,Math.floor(t.sec),Math.round((t.sec%1)*1000)));
      if (time.getUTCDate() !== day || time.getUTCMonth() !== month-1) return null;
    } else return null;
    if (latitude == null || longitude == null || !(time instanceof Date) || !Number.isFinite(time.getTime())) return null;
    if (hdop != null && (!Number.isFinite(hdop) || hdop < 0)) return null;
    if (satellites != null && (!Number.isInteger(satellites) || satellites < 0)) return null;
    if (altitude != null && !Number.isFinite(altitude)) return null;
    return {lat:latitude, lon:longitude, time:time.toISOString(), altitude, hdop, satellites, quality, sentence:type};
  }
  function distanceMeters(a,b) {
    const rad = Math.PI/180, r=6371008.8, dLat=(b.lat-a.lat)*rad,dLon=(b.lon-a.lon)*rad;
    const v=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;
    return 2*r*Math.atan2(Math.sqrt(v),Math.sqrt(Math.max(0,1-v)));
  }
  function acceptTrackFix(next, previous, {minMeters=2,maxHdop=5,maxMetersPerSecond=30}={}) {
    if (!next || (next.hdop != null && (next.hdop <= 0 || next.hdop > maxHdop))) return false;
    if (!previous) return true;
    const seconds=(Date.parse(next.time)-Date.parse(previous.time))/1000;
    if (!Number.isFinite(seconds)|| seconds<=0) return false;
    const meters=distanceMeters(previous,next);
    return meters>=minMeters && meters/seconds<=maxMetersPerSecond;
  }
  class NmeaStream {
    constructor(){this.pending='';}
    push(text, now=new Date()) {
      this.pending+=String(text);
      if(this.pending.length>32768)this.pending=this.pending.slice(-8192);
      const out=[]; let end;
      while((end=this.pending.indexOf('\n'))>=0){
        const line=this.pending.slice(0,end).trim();this.pending=this.pending.slice(end+1);
        const fix=parseNmea(line,now);if(fix)out.push(fix);
      }
      return out;
    }
  }
  function create({onFix, onStart, onStop, onExport, onFollow, symbols = []}={}) {
    if (typeof document === 'undefined') throw Error('Interfaz GPS disponible solo en un navegador');
    const menu=document.querySelector('.oc-menu');
    if(!menu)throw Error('No se ha encontrado el menú principal');
    const details=document.createElement('details');details.id='ocartoGpsMenu';
    const summary=document.createElement('summary');summary.textContent='GPS';details.append(summary);
    const drop=document.createElement('div');drop.className='oc-dropdown';drop.style.cssText='min-width:280px;max-width:340px;padding:10px';
    const text=(tag,content)=>{const node=document.createElement(tag);node.textContent=content;return node;};
    const status=text('p','GPS · desconectado');status.id='gpsLiveStatus';status.setAttribute('role','status');status.style.cssText='font-size:12px;white-space:normal;max-width:300px;color:#aee9d5';
    const coord=text('p','Sin posición GPS');coord.id='gpsLiveCoords';coord.style.cssText='font-size:12px;white-space:normal;max-width:300px';
    const serialSupported=!!(typeof navigator!=='undefined' && navigator.serial && typeof navigator.serial.requestPort==='function' && typeof isSecureContext!=='undefined' && isSecureContext);
    const info=text('p','Empareja primero el GPS Bluetooth clásico en Windows. Elige el COM en el diálogo del navegador.');info.style.cssText='font-size:11px;white-space:normal';
    const speed=document.createElement('select');speed.id='gpsBaud';speed.setAttribute('aria-label','Velocidad GPS en baudios');
    for(const n of [4800,9600,19200,38400,57600,115200]){const opt=document.createElement('option');opt.value=String(n);opt.textContent=n+' baudios';speed.append(opt)}
    const symbol=document.createElement('select');symbol.id='gpsTrackSymbol';symbol.setAttribute('aria-label','Símbolo de línea del track');
    for(const x of symbols){const option=document.createElement('option');option.value=x.id;option.textContent=(x.code||'')+' · '+x.name;symbol.append(option)}
    if(symbol.querySelector('option[value="small-footpath"]'))symbol.value='small-footpath';
    const follow=document.createElement('label');follow.style.cssText='display:flex;gap:7px;align-items:center;font-size:12px;margin:7px 0';
    const check=document.createElement('input');check.type='checkbox';check.checked=true;follow.append(check,text('span','Seguir posición en el mapa'));
    const connect=document.createElement('button');connect.type='button';connect.textContent='Conectar GPS (COM Bluetooth)';connect.disabled=!serialSupported;
    const start=document.createElement('button');start.type='button';start.textContent='● Iniciar track';start.disabled=true;
    const stop=document.createElement('button');stop.type='button';stop.textContent='■ Detener track';stop.disabled=true;
    const exportButton=document.createElement('button');exportButton.type='button';exportButton.textContent='Exportar tracks GPX';
    const error=text('p',serialSupported?'':'Web Serial requiere Chromium/Edge en contexto seguro (HTTPS o localhost).');error.style.cssText='font-size:11px;white-space:normal;color:#f3bd8f';
    for(const el of [info,speed,connect,status,coord,text('p','Símbolo lineal predeterminado'),symbol,follow,start,stop,exportButton,error])drop.append(el);
    details.append(drop);
    const existingGps=Array.from(menu.querySelectorAll(':scope>details')).find(item=>{
      const label=item.querySelector(':scope>summary')?.textContent.trim();
      return item!==details && label==='GPS';
    });
    if(existingGps)existingGps.remove();
    const configurationMenu=Array.from(menu.querySelectorAll(':scope>details')).find(item=>item.querySelector(':scope>summary')?.textContent.trim()==='CONFIGURACIÓN');
    if(configurationMenu)menu.insertBefore(details,configurationMenu);else menu.append(details);
    details.addEventListener('toggle',()=>{
      if(!details.open)return;
      menu.querySelectorAll(':scope>details').forEach(item=>{if(item!==details)item.open=false});
    });
    const decoder=new TextDecoder();
    let port=null,reader=null,closing=false,readingPromise=null,recording=false,lastFix=null,lastFixAt=0;
    let nmea=new NmeaStream();
    const show=(s,err=false)=>{status.textContent=s;status.style.color=err?'#e69e82':'#aee9d5'};
    const stopRecording=()=>{if(!recording)return;recording=false;start.disabled=!port;stop.disabled=true;symbol.disabled=false;try{onStop?.()}catch(e){show('Error al cerrar track: '+e.message,true)}};
    const disconnect=async()=>{
      closing=true;stopRecording();const r=reader;reader=null;
      if(r){try{await r.cancel()}catch{}}
      if(readingPromise){try{await readingPromise}catch{}}
      const p=port;port=null;readingPromise=null;
      if(p){try{await p.close()}catch{}}
      connect.disabled=!serialSupported;connect.textContent='Conectar GPS (COM Bluetooth)';start.disabled=true;
      show('GPS · desconectado');
    };
    const consume=(fix)=>{
      const now=Date.now();lastFix=fix;lastFixAt=now;
      coord.textContent=`${fix.lat.toFixed(7)}°, ${fix.lon.toFixed(7)}° · ${fix.satellites??'—'} sat · HDOP ${fix.hdop??'—'}`;
      show('GPS · posición válida');
      try{onFix?.(fix,{recording,follow:check.checked})}catch(e){show('GPS: '+e.message,true)}
    };
    const connectGps=async()=>{
      if(port){await disconnect();return}
      try{
        closing=false;const selected=await navigator.serial.requestPort();
        await selected.open({baudRate:Number(speed.value),dataBits:8,stopBits:1,parity:'none',flowControl:'none'});
        port=selected;nmea=new NmeaStream();lastFix=null;lastFixAt=0;
        connect.textContent='Desconectar GPS';start.disabled=false;show('Conectado · esperando posición NMEA');
        readingPromise=(async()=>{
          const input=port.readable.getReader();reader=input;
          try{
            for(;;){const {value,done}=await input.read();if(done||closing)break;
              for(const fix of nmea.push(decoder.decode(value,{stream:true})))consume(fix);
            }
            if(!closing)show('Conexión GPS finalizada',true);
          }catch(e){if(!closing)show('Error al leer GPS: '+e.message,true)}finally{
            try{input.releaseLock()}catch{}
            if(reader===input)reader=null;
            if(!closing){stopRecording();const current=port;port=null;start.disabled=true;connect.textContent='Conectar GPS (COM Bluetooth)';try{await current?.close()}catch{}}
          }
        })();
      }catch(e){if(e?.name!=='NotFoundError')show('No se ha podido conectar el GPS: '+e.message,true)}
    };
    connect.addEventListener('click',()=>{void connectGps()});
    start.addEventListener('click',()=>{
      if(!port || !lastFix || Date.now()-lastFixAt>10000){show('Espera una posición GPS reciente antes de grabar',true);return}
      try{const ok=onStart?.(lastFix,symbol.value);if(ok===false){show('Configura un mapa georreferenciado antes de grabar',true);return}
        recording=true;symbol.disabled=true;start.disabled=true;stop.disabled=false;onFix?.(lastFix,{recording:true,follow:check.checked});show('Grabando track GPS en símbolo '+symbol.options[symbol.selectedIndex]?.textContent)
      }catch(e){show('No se puede iniciar track: '+e.message,true)}
    });
    stop.addEventListener('click',stopRecording);
    exportButton.addEventListener('click',()=>{try{onExport?.()}catch(e){show('Error GPX: '+e.message,true)}});
    check.addEventListener('change',()=>onFollow?.(check.checked));
    const ticker=typeof setInterval==='function'?setInterval(()=>{
      if(port && lastFixAt && Date.now()-lastFixAt>10000)show('GPS conectado · sin posición reciente',true);
    },5000):null;
    const deviceDisconnect=(e)=>{if(e?.port===port){void disconnect()}};
    navigator.serial?.addEventListener?.('disconnect',deviceDisconnect);
    return {close:async()=>{if(ticker!==null)clearInterval(ticker);navigator.serial?.removeEventListener?.('disconnect',deviceDisconnect);await disconnect();details.remove()},get connected(){return !!port},get recording(){return recording}};
  }
  return {parseNmea,checksum,NmeaStream,acceptTrackFix,distanceMeters,create};
});