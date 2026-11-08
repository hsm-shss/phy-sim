import puppeteer from 'puppeteer-core';
import { pathToFileURL } from 'url';
import fs from 'fs';
const file = pathToFileURL('/workspace/phy-sim/dse_scientific_calc.html').href;
const outDir = '/workspace/phy-sim/out';
fs.mkdirSync(outDir, {recursive:true});

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']
});
const page = await browser.newPage();
page.on('pageerror', e => { console.error('PAGEERROR', e.message); process.exitCode=1; });
await page.goto(file, {waitUntil:'domcontentloaded'});

async function press(k){ await page.evaluate(k => window.__calc.press(k), k); }
async function st(){ return page.evaluate(() => ({
  result: window.__calc.result,
  mode: window.__calc.calcMode,
  ui: window.__calc.uiMode,
  radix: window.__calc.baseRadix,
  line: window.__calc.line,
  disp: document.getElementById('disp').textContent,
  expr: document.getElementById('expr').textContent,
  ind: document.getElementById('indMode').textContent,
  build: document.querySelector('.build-tag')?.textContent,
})); }
function assert(cond, msg, extra){
  if(!cond){ console.error('FAIL', msg, extra||''); process.exitCode=1; throw new Error(msg); }
  console.log('OK', msg);
}
async function waitFlash(){ await new Promise(r=>setTimeout(r,950)); }

await press('ON');
const build=(await st()).build;
assert(String(build).includes('BASE v3'), 'build tag', build);

// 1) MODE→3 lands directly in DEC (no second radix menu)
await press('MODE'); await press('3');
await waitFlash();
let s=await st();
assert(s.mode==='base' && s.ui==='calc' && s.radix===10 && s.ind==='DEC', 'MODE→3 → BASE DEC ready', s);
assert(!/1:DEC|2:HEX|3:BIN/.test(String(s.disp)), 'no radix submenu on LCD', s);

// 2) Default DEC: MODE→3→1111→EXE → 1111d
await press('1'); await press('1'); await press('1'); await press('1'); await press('EXE');
s=await st();
assert(String(s.disp)==='1111d' || String(s.result)==='1111d', 'DEC 1111 EXE → 1111d', s);
assert(!/ERROR/.test(String(s.disp)+String(s.result)), 'no Math ERROR on DEC 1111', s);

// 3) DEC 15 → bare log (BIN) → 1111b
await press('AC');
await press('1'); await press('5'); await press('EXE');
s=await st();
assert(String(s.disp)==='15d' || String(s.result)==='15d', 'DEC 15 EXE', s);
await press('log');
s=await st();
assert(s.radix===2 && s.ind==='BIN', 'bare log → BIN', s);
assert(String(s.disp)==='1111b' || String(s.result)==='1111b', 'DEC 15 → BIN 1111b', s);
assert(!String(s.line).includes('log'), 'bare log must not insert log(', s);
await page.screenshot({path: outDir+'/test-dec15-to-bin.png'});

// 4) After switch to BIN: bare 1111 EXE → 1111b
await press('AC');
await press('1'); await press('1'); await press('1'); await press('1'); await press('EXE');
s=await st();
assert(s.radix===2 && (String(s.disp)==='1111b'||String(s.result)==='1111b'), 'BIN bare 1111 EXE → 1111b', s);
assert(!/ERROR/.test(String(s.disp)+String(s.result)), 'no Math ERROR on BIN 1111', s);
await page.screenshot({path: outDir+'/test-bin-1111.png'});

// 5) BIN 1111 → bare x² (DEC) → 15d
await press('x^2');
s=await st();
assert(s.radix===10 && s.ind==='DEC', 'bare x² → DEC', s);
assert(String(s.disp)==='15d' || String(s.result)==='15d', 'BIN 1111 → DEC 15d', s);
await page.screenshot({path: outDir+'/test-bin-to-dec.png'});

// 6) Remembers last radix: leave BASE, re-enter → still DEC (last was DEC after x²)
await press('MODE'); await press('1');
await waitFlash();
await press('MODE'); await press('3');
await waitFlash();
s=await st();
assert(s.mode==='base' && s.ui==='calc' && s.radix===10 && s.ind==='DEC', 're-enter BASE remembers DEC', s);

// 7) Remember BIN across re-entry
await press('log'); // → BIN
s=await st();
assert(s.radix===2, 'switched to BIN', s);
await press('MODE'); await press('1');
await waitFlash();
await press('MODE'); await press('3');
await waitFlash();
s=await st();
assert(s.mode==='base' && s.radix===2 && s.ind==='BIN' && s.ui==='calc', 're-enter BASE remembers BIN', s);

// 8) SHIFT+log / SHIFT+x² still convert
await press('AC');
await press('x^2'); // DEC
await press('1'); await press('5'); await press('EXE');
await press('SHIFT'); await press('log');
s=await st();
assert(s.radix===2 && (String(s.disp)==='1111b'||String(s.result)==='1111b'), 'SHIFT+log → 1111b', s);
await press('SHIFT'); await press('x^2');
s=await st();
assert(s.radix===10 && (String(s.disp)==='15d'||String(s.result)==='15d'), 'SHIFT+x² → 15d', s);

// 9) HEX / OCT bare keys
await press('^');
s=await st();
assert(s.radix===16 && s.ind==='HEX' && /F|f|15/i.test(String(s.disp)+String(s.result)), 'bare ^ → HEX F/15', s);
await press('ln');
s=await st();
assert(s.radix===8 && s.ind==='OCT', 'bare ln → OCT', s);

// 10) COMP bare log still inserts log(
await press('MODE'); await press('1');
await waitFlash();
await press('AC');
await press('log');
s=await st();
assert(String(s.line).startsWith('log('), 'COMP bare log still log(', s);

// 11) illegal digit in BIN ignored/toasted
await press('MODE'); await press('3');
await waitFlash();
await press('log'); // ensure BIN
await press('AC');
await press('1'); await press('2'); // 2 illegal in BIN
s=await st();
assert(s.line==='1' || s.line==='', 'BIN rejects digit 2', s);

await browser.close();
if(process.exitCode) { console.error('SOME TESTS FAILED'); process.exit(1); }
console.log('ALL BASE RADIX TESTS PASSED');
