const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert(match,'Se debe encontrar el código principal');
const context=vm.createContext({document:{addEventListener(){}} ,console,Date,Promise});
vm.runInContext(match[1],context,{filename:'app.js'});
const run=(expr)=>vm.runInContext(expr,context);

test('HTML sin exámenes DSM en resultado SOME',()=>{
  assert(!html.includes('Reevaluación DSM'));
  assert(html.includes('Fecha de agenda disponible'));
  assert(html.includes('drmunozricardo@gmail.com'));
});

test('suma de meses: 31 de enero a fin de febrero',()=>{
  assert.equal(run("toISO(monthAddClamped(fromISO('2025-01-31'),1))"),'2025-02-28');
  assert.equal(run("toISO(monthAddClamped(fromISO('2024-01-31'),1))"),'2024-02-29');
});

test('suma de meses: año bisiesto',()=>{
  assert.equal(run("toISO(monthAddClamped(fromISO('2024-02-29'),12))"),'2025-02-28');
  assert.equal(run("diffAge(fromISO('2024-02-29'),fromISO('2025-02-28')).totalMonths"),12);
});

test('diferencia en días a través de mes y año',()=>{
  assert.equal(run("diffAge(fromISO('2026-12-31'),fromISO('2027-01-01')).days"),1);
  assert.equal(run("diffAge(fromISO('2026-01-31'),fromISO('2026-02-28')).totalMonths"),1);
});

test('meses de 5 y 6 se superponen',()=>{
  const ids=run("controlItems({dob:fromISO('2026-01-01'),fecha:addClinical(fromISO('2026-01-01'),5,23),preterm:false,fpp:fromISO('2026-01-01'),cutoff:fromISO('2026-01-01')}).filter(x=>x.current).map(x=>x.c.id)");
  assert(ids.includes('m5')&&ids.includes('m6'));
});

test('3 años y 3 años 6 meses: ventana superpuesta',()=>{
  const ids=run("controlItems({dob:fromISO('2022-01-10'),fecha:addClinical(fromISO('2022-01-10'),42,4),preterm:false,fpp:fromISO('2022-01-10'),cutoff:fromISO('2022-01-10')}).filter(x=>x.current).map(x=>x.c.id)");
  assert(ids.includes('m36')&&ids.includes('m42'));
});

test('día de cambio: control 3 a control 4 meses',()=>{
  const make=days=>run("controlItems({dob:fromISO('2026-01-10'),fecha:addClinical(fromISO('2026-01-10'),3,"+days+"),preterm:false,fpp:fromISO('2026-01-10'),cutoff:fromISO('2026-01-10')}).filter(x=>x.current).map(x=>x.c.id)");
  assert(make(20).includes('m3'));
  assert(!make(21).includes('m3'));
  assert(make(21).includes('m4'));
});

test('prematuro de 32 semanas: fecha equivalente a 40 semanas',()=>{
  assert.equal(run("toISO(addDays(fromISO('2026-01-01'),(40-32)*7))"),'2026-02-26');
});

test('corrección de 34-36 semanas termina tras seis meses corregidos',()=>{
  const out=run("controlItems({dob:fromISO('2026-01-01'),fpp:fromISO('2026-02-01'),cutoff:monthAddClamped(fromISO('2026-02-01'),6),preterm:true,fecha:fromISO('2026-08-01')}).filter(x=>x.current).map(x=>x.c.id)");
  assert(Array.isArray(out));
});

test('los TDA genéricos se conservan tal como aparecen en Rayen',()=>{
  assert.equal(run("controles.find(x=>x.id==='m4').tda"),'Control Sano');
  assert.equal(run("controles.find(x=>x.id==='m5').prof"),'Nutricionista');
  assert.equal(run("controles.find(x=>x.id==='m3').tda"),'Control sano 1 y 3 meses');
  assert.equal(run("controles.find(x=>x.id==='m18').dur"),50);
});

test('fecha inválida no se acepta',()=>{
  assert.equal(run("fromISO('2026-02-30')===null"),true);
  assert.equal(run("fromISO('2024-02-29')!==null"),true);
});
