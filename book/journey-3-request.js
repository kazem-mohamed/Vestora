// Phase 3: the investor asks to back the venture.
const puppeteer = require('puppeteer');
const ORIGIN = 'http://localhost:3000';
const PW = 'BookCapture!2026';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

const dump = async (p, label) => {
  const r = await p.evaluate(() => ({
    path: location.pathname,
    body: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 800),
    controls: [...document.querySelectorAll('button, [role="button"]')]
      .map(e => (e.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(t => t && t.length < 45).filter((v, i, s) => s.indexOf(v) === i),
    dialog: !!document.querySelector('[role="dialog"]'),
    fields: [...document.querySelectorAll('input, textarea')]
      .map(e => ({ id: e.id || '', type: e.type || '', ph: e.placeholder || '' })),
  }));
  console.log(`\n===== ${label}  [${r.path}]  dialog=${r.dialog}`);
  console.log(r.body);
  console.log('controls: ' + JSON.stringify(r.controls));
  if (r.fields.length) console.log('fields: ' + JSON.stringify(r.fields));
  return r;
};

const clickText = async (p, rx) => {
  for (const h of await p.$$('button, [role="button"], a')) {
    const t = clean(await h.evaluate(e => e.textContent));
    if (!rx.test(t)) continue;
    const off = await h.evaluate(e => e.disabled === true);
    if (off) continue;
    await h.evaluate(e => e.scrollIntoView({ block: 'center' }));
    await sleep(400);
    await h.click();
    return t;
  }
  return null;
};

(async () => {
  const b = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless:'new', args:['--no-sandbox','--disable-gpu','--hide-scrollbars'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 1400 });

  await p.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
  await sleep(2200);
  await p.type('input[type="email"]', 'book.capture@vestora.local', { delay: 10 });
  await p.type('input[type="password"]', PW, { delay: 10 });
  await Promise.all([p.click('button[type="submit"]'), p.waitForNavigation({waitUntil:'networkidle2'}).catch(()=>{})]);
  await sleep(7000);
  await p.evaluate(() => { localStorage.setItem('vestora.locale','en'); localStorage.setItem('theme','light'); });

  await p.goto(ORIGIN + '/projects/99', { waitUntil: 'networkidle2' });
  for (let i=0;i<8;i++){ await sleep(2000);
    if(!(await p.evaluate(()=>document.querySelectorAll('[class*="animate-pulse"]').length))) break; }
  await dump(p, 'venture 99 as investor');

  const hit = await clickText(p, /support this venture/i);
  console.log('\nclicked: ' + JSON.stringify(hit));
  await sleep(5000);
  await dump(p, 'after click');
  await b.close();
})();
