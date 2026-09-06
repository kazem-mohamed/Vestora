// Phase 4b: the founder approves the request, then asks for the money.
const puppeteer = require('puppeteer');
const ORIGIN = 'http://localhost:3000';
const PW = 'BookCapture!2026';
const ROOM = '/deals/227';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

const settle = async (p) => {
  for (let i = 0; i < 10; i++) {
    await sleep(2000);
    if (!(await p.evaluate(() => document.querySelectorAll('[class*="animate-pulse"]').length))) break;
  }
  await sleep(2000);
};

const clickText = async (p, rx, scope) => {
  const sel = scope ? `${scope} button, ${scope} [role="button"]` : 'button, [role="button"]';
  for (const h of await p.$$(sel)) {
    const t = clean(await h.evaluate(e => e.textContent));
    if (!rx.test(t)) continue;
    if (await h.evaluate(e => e.disabled === true)) continue;
    await h.evaluate(e => e.scrollIntoView({ block: 'center' }));
    await sleep(350);
    await h.click();
    return t;
  }
  return null;
};

const dump = async (p, label) => {
  const r = await p.evaluate(() => ({
    path: location.pathname,
    dialog: !!document.querySelector('[role="dialog"]'),
    body: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1300),
    controls: [...document.querySelectorAll('button, [role="button"]')]
      .map(e => ({ t: (e.textContent || '').replace(/\s+/g, ' ').trim(), off: e.disabled === true }))
      .filter(o => o.t && o.t.length < 45).filter((v, i, s) => s.findIndex(x => x.t === v.t) === i),
    fields: [...document.querySelectorAll('input, textarea')]
      .map(e => ({ id: e.id || '', type: e.type || 'textarea', ph: e.placeholder || '' })),
  }));
  console.log(`\n===== ${label}  [${r.path}] dialog=${r.dialog}`);
  console.log(r.body);
  console.log('controls: ' + JSON.stringify(r.controls));
  if (r.fields.length) console.log('fields: ' + JSON.stringify(r.fields));
  return r;
};

(async () => {
  const b = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless:'new', args:['--no-sandbox','--disable-gpu','--hide-scrollbars'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 1600 });

  await p.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
  await sleep(2200);
  await p.type('input[type="email"]', 'book.founder@vestora.local', { delay: 10 });
  await p.type('input[type="password"]', PW, { delay: 10 });
  await Promise.all([p.click('button[type="submit"]'), p.waitForNavigation({waitUntil:'networkidle2'}).catch(()=>{})]);
  await sleep(7000);
  await p.evaluate(() => { localStorage.setItem('vestora.locale','en'); localStorage.setItem('theme','light'); });

  await p.goto(ORIGIN + '/dashboard/requests', { waitUntil: 'networkidle2' });
  await settle(p);
  console.log('approve clicked: ' + JSON.stringify(await clickText(p, /^Approve$/i)));
  await sleep(6000);
  const d = await dump(p, 'after approve');
  if (d.dialog) {
    console.log('confirm in dialog: ' + JSON.stringify(
      await clickText(p, /^(approve|confirm|yes)/i, '[role="dialog"]')));
    await sleep(6000);
    await dump(p, 'after dialog confirm');
  }

  await p.goto(ORIGIN + ROOM, { waitUntil: 'networkidle2' });
  await settle(p);
  await dump(p, 'deal room after approval');
  await b.close();
})();
