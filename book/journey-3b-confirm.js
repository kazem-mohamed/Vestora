// Phase 3b: the investor states an amount and confirms the request.
//
// $120,000 against a $250,000 goal — deliberately a partial commitment, so the
// round stays open and the screens show a real ratio rather than a full bar.
const puppeteer = require('puppeteer');
const ORIGIN = 'http://localhost:3000';
const PW = 'BookCapture!2026';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

const setNative = (p, sel, val) =>
  p.evaluate((s, v) => {
    const el = document.querySelector(s);
    if (!el) return false;
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, sel, val);

const clickText = async (p, rx, scope) => {
  for (const h of await p.$$((scope || '') + ' button, ' + (scope || '') + ' [role="button"]')) {
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

  console.log('opened dialog: ' + JSON.stringify(await clickText(p, /^support this venture$/i)));
  await p.waitForSelector('[role="dialog"] #support-amount', { timeout: 10000 });
  await sleep(1200);

  console.log('amount set: ' + await setNative(p, '#support-amount', '120000'));
  console.log('channel: ' + JSON.stringify(await clickText(p, /^Email$/i, '[role="dialog"]')));
  await sleep(600);
  const contact = await p.evaluate(() => {
    const i = [...document.querySelectorAll('[role="dialog"] input[type="text"]')][0];
    return i ? i.placeholder : null;
  });
  console.log('contact field: ' + JSON.stringify(contact));
  if (contact) console.log('contact set: ' +
    await setNative(p, `[role="dialog"] input[placeholder="${contact}"]`, 'book.capture@vestora.local'));
  await sleep(800);

  console.log('confirmed: ' + JSON.stringify(await clickText(p, /^confirm support$/i, '[role="dialog"]')));
  await sleep(9000);

  const r = await p.evaluate(() => ({
    path: location.pathname,
    dialog: !!document.querySelector('[role="dialog"]'),
    body: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 700),
  }));
  console.log('\n[' + r.path + '] dialog=' + r.dialog + '\n' + r.body);

  await p.goto(ORIGIN + '/invest/pipeline', { waitUntil: 'networkidle2' });
  for (let i=0;i<8;i++){ await sleep(2000);
    if(!(await p.evaluate(()=>document.querySelectorAll('[class*="animate-pulse"]').length))) break; }
  console.log('\n--- investor pipeline ---\n' + await p.evaluate(() =>
    (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 700)));
  console.log('deal links: ' + JSON.stringify(await p.evaluate(() =>
    [...document.querySelectorAll('a[href^="/deals/"]')].map(a => a.getAttribute('href')))));
  await b.close();
})();
