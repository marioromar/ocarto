/* Ocarto v249 — revisión aislada de símbolos, tintas y orden de impresión OCAD.
 * Usa el lector existente (ocad-editable.js). NO edita el catálogo.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OcartoOcadCatalogReview = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const types = {1:'Punto', 2:'Línea', 3:'Área', 4:'Texto', 5:'Línea de texto', 6:'Rectángulo'};
  function inspect(parsed, filename) {
    if (!parsed || ![10, 11, 12, 2018].includes(parsed.version) ||
        !Array.isArray(parsed.symbols) || !Array.isArray(parsed.colors) ||
        !Array.isArray(parsed.objects)) throw Error('El lector OCAD no ha producido una estructura válida');
    const errors=[], warnings=[];
    const colorNumbers=new Set(), symbolCodes=new Set();
    const colors=parsed.colors.map((source, index) => {
      const number=source.number;
      if (!Number.isSafeInteger(number) || number<0) errors.push('Número de tinta inválido: ' + number);
      if (colorNumbers.has(number)) errors.push('Tinta duplicada: ' + number);
      colorNumbers.add(number);
      const cmyk=Array.isArray(source.cmyk)?source.cmyk.slice(0,4):[];
      if (cmyk.length!==4||cmyk.some(n=>!Number.isFinite(n)||n<0||n>100)) errors.push('CMYK no válido de la tinta ' + number);
      const rgb=/^#[0-9a-f]{6}$/i.test(source.rgb||'')?source.rgb:'#888888';
      const opacity=Number(source.opacity);
      if (!Number.isFinite(opacity)||opacity<0||opacity>100) warnings.push('Transparencia no comprobada en tinta ' + number);
      return {number, name:String(source.name||''), cmyk, rgb, opacity, overprint:!!source.overprint,
        printIndex:index+1, provisionalPriority:parsed.colors.length-index};
    });
    const symbols=parsed.symbols.map(source=>{
      const code=Number(source.code);
      if (!Number.isSafeInteger(code)||code<=0)errors.push('Símbolo sin código OCAD válido');
      if (symbolCodes.has(code))errors.push('Símbolo duplicado: '+String(source.number));
      symbolCodes.add(code);
      const inks=[...new Set(Array.isArray(source.inks)?source.inks.filter(Number.isInteger):[])];
      const missingInks=inks.filter(n=>n>=0&&!colorNumbers.has(n));
      return {code,number:String(source.number||((code/1000).toFixed(3))),name:String(source.label||''),
        type:Number(source.type),kind:types[source.type]||'Tipo no reconocido',
        inks,missingInks,status:Number(source.status)||0};
    });
    const notFound=symbols.filter(s=>s.missingInks.length);
    if (!colors.length)errors.push('No se han podido leer los colores de impresión');
    if (!symbols.length)errors.push('No se han podido leer los símbolos');
    if (notFound.length)warnings.push(notFound.length+' símbolos utilizan números de tinta ausentes en la tabla leída');
    const unsupported=symbols.filter(s=>!types[s.type]);
    if (unsupported.length)warnings.push(unsupported.length+' tipos de símbolo no reconocidos');
    const usedCodes=new Set(parsed.objects.map(o=>o.symbolNo).filter(Number.isInteger));
    const withoutDefinition=[...usedCodes].filter(code=>!symbolCodes.has(code)&&code>0);
    if (withoutDefinition.length)warnings.push(withoutDefinition.length+' códigos utilizados en objetos no tienen símbolo leído');
    if (Number(parsed.report?.malformed)>0)warnings.push(parsed.report.malformed+' registros de objeto dañados o incompletos');
    if (Number(parsed.report?.encrypted)>0)warnings.push(parsed.report.encrypted+' objetos cifrados no comprobados');
    if (Number(parsed.report?.indexed) > Number(parsed.report?.imported) +
        Number(parsed.report?.deleted) + Number(parsed.report?.encrypted) + Number(parsed.report?.malformed) + 100)
      warnings.push('Diferencia apreciable entre objetos indexados y objetos importados');
    warnings.push('Confirmar visualmente el orden de la tabla de impresión de OCAD 2018 antes de adoptarlo');
    const usage=new Map();
    for (const item of parsed.objects) usage.set(item.symbolNo,(usage.get(item.symbolNo)||0)+1);
    for (const item of symbols)item.usedObjects=usage.get(item.code)||0;
    return {
      format:'ocarto-ocad-catalog-review-v1',
      fileName:String(filename||''),ocadVersion:parsed.version,
      scale:parsed.setup?.scale??null,crs:parsed.setup?.crs??null,
      valid:errors.length===0,approved:false,applied:false,
      totals:{symbols:symbols.length,colors:colors.length,objects:parsed.objects.length,
        unrecognizedSymbols:unsupported.length,missingInks:notFound.length,missingDefinitions:withoutDefinition.length},
      colors,symbols,errors,warnings,
      printOrderNote:'Orden registrado en el fichero, con prioridad provisional. Sin validación visual frente a OCAD.',
      catalogNote:'No se cambian el catálogo activo, las tintas predeterminadas ni las preferencias de impresión.'
    };
  }
  return {inspect};
});
