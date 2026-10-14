/* Ocarto v27 — worker aislado para la segmentación de imagen, sin bloquear el mapa. */
importScripts('road-extract.js');
self.onmessage=e=>{try{const {image,transform,options}=e.data;if(!self.OcartoRoadExtract?.extract)throw Error('Motor de ortofoto no disponible');const data=self.OcartoRoadExtract.extract(image,transform,options);self.postMessage({type:'result',data});}catch(error){self.postMessage({type:'error',message:String(error?.message||error)})}};
