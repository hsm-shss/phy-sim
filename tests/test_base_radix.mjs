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

await press('ON');
const build=(await st()).build;
assert(String(build).includes('BASE v2'), 'build tag', build);

// 1) MODE→3→3→1111→EXE → 1111b (not Math ERROR)
await press('MODE'); await press('3'); await press('3');
await press('1'); await press('1'); await press('1'); await press('1'); await press('EXE');
let s=await st();
assert(s.mode==='base' && s.radix===2 && s.ind==='BIN', 'BIN mode after MODE 3 3', s);
assert(String(s.disp)==='1111b' || String(s.result)==='1111b', 'BIN 1111 EXE → 1111b', s);
assert(!/ERROR/.test(String(s.disp)+String(s.result)), 'no Math ERROR on BIN 1111', s);
await page.screenshot({path: outDir+'/test-bin-1111.png'});

// 2) BIN 1111 → bare x² (DEC) → 15d
await press('x^2');
s=await st();
assert(s.radix===10 && s.ind==='DEC', 'bare x² → DEC', s);
assert(String(s.disp)==='15d' || String(s.result)==='15d', 'BIN 1111 → DEC 15d', s);
await page.screenshot({path: outDir+'/test-bin-to-dec.png'});

// 3) DEC 15 → bare log (BIN) → 1111b
await press('AC');
await press('MODE'); await press('3'); await press('1'); // DEC
await press('1'); await press('5'); await press('EXE');
s=await st();
assert(String(s.disp)==='15d' || String(s.result)==='15d', 'DEC 15 EXE', s);
await press('log');
s=await st();
assert(s.radix===2 && s.ind==='BIN', 'bare log → BIN', s);
assert(String(s.disp)==='1111b' || String(s.result)==='1111b', 'DEC 15 → BIN 1111b', s);
assert(!String(s.line).includes('log'), 'bare log must not insert log(', s);
await page.screenshot({path: outDir+'/test-dec15-to-bin.png'});

// 4) SHIFT+log also converts
await press('AC');
await press('MODE'); await press('3'); await press('1');
await press('1'); await press('5'); await press('EXE');
await press('SHIFT'); await press('log');
s=await st();
assert(s.radix===2 && (String(s.disp)==='1111b'||String(s.result)==='1111b'), 'SHIFT+log → 1111b', s);

// 5) SHIFT+x² BIN→DEC
await press('SHIFT'); await press('x^2');
s=await st();
assert(s.radix===10 && (String(s.disp)==='15d'||String(s.result)==='15d'), 'SHIFT+x² → 15d', s);

// 6) HEX / OCT bare keys
await press('^');
s=await st();
assert(s.radix===16 && s.ind==='HEX' && /F|f|15/i.test(String(s.disp)+String(s.result)), 'bare ^ → HEX F/15', s);
await press('ln');
s=await st();
assert(s.radix===8 && s.ind==='OCT', 'bare ln → OCT', s);

// 7) COMP bare log still inserts log(
await press('MODE'); await press('1');
await new Promise(r=>setTimeout(r,900));
await press('AC');
await press('log');
s=await st();
assert(String(s.line).startsWith('log('), 'COMP bare log still log(', s);

// 8) illegal digit in BIN ignored/toasted
await press('MODE'); await press('3'); await press('3');
await press('1'); await press('2'); // 2 illegal in BIN
s=await st();
assert(s.line==='1' || s.line==='', 'BIN rejects digit 2', s);

await browser.close();
if(process.exitCode) { console.error('SOME TESTS FAILED'); process.exit(1); }
console.log('ALL BASE RADIX TESTS PASSED');
