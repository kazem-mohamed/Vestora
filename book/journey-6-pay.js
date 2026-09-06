// Phase 6: the investor settles, and the screens that only exist during a
// payment are captured while they exist.
//
// The gateway is captured ONCE and re-rendered in the second language rather
// than opened twice: a funding request allows one live attempt, and a second
// checkout would either be refused or abandon the first.
const puppeteer = require('puppeteer');
const path = require('path');
const ORIGIN = 'http://localhost:3000';
const OUT = path.join(__dirname, 'assets', 'screenshots');
const PW = 'BookCapture!2026';
const ROOM = '/deals/227';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

const hideDevOverlay = (p) =>
  p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {});

const prefs = (p, l, t) => p.evaluate((a, b) => {
  localStorage.setItem('vestora.locale', a);
  localStorage.setItem('theme', b);
}, l, t);

const settle = async (p, want) => {
  let seen;
  for (let i = 0; i < 12; i++) {
    await sleep(2200);
    seen = await p.evaluate(() => ({
      path: location.pathname,
      dir: document.documentElement.dir,
      dark: document.documentElement.className.includes('dark'),
      loading: document.querySelectorAll('[class*="animate-pulse"]').length,
    }));
    if ((!want || seen.path === want) && !seen.loading) break;
  }
  return seen;
};

async function shoot(p, file, v, want) {
  const seen = await settle(p, want);
  const ok = (!want || seen.path === want)
    && seen.dir === (v.locale === 'ar' ? 'rtl' : 'ltr')
    && seen.dark === (v.theme === 'dark')
    && !seen.loading;
  if (ok) { await hideDevOverlay(p); await p.screenshot({ path: path.join(OUT, file) }); }
  console.log(`${ok ? 'OK   ' : 'CHECK'} ${file}${ok ? '' : '  ' + JSON.stringify(seen)}`);
  return ok;
}

const clickText = async (p, rx) => {
  for (const h of await p.$$('button, [role="button"], a')) {
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

async function signIn(p, email, v) {
  await p.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
  await sleep(2200);
  await p.type('input[type="email"]', email, { delay: 10 });
  await p.type('input[type="password"]', PW, { delay: 10 });
  await Promise.all([p.click('button[type="submit"]'),
    p.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {})]);
  await sleep(7000);
  await prefs(p, v.locale, v.theme);
}

const EN = { locale: 'en', theme: 'light' };
const AR = { locale: 'ar', theme: 'dark' };

(async () => {
  const b = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless:'new', args:['--no-sandbox','--disable-gpu','--hide-scrollbars'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });

  // ---- the ask, as the investor sees it --------------------------------
  for (const v of [EN, AR]) {
    await signIn(p, 'book.capture@vestora.local', v);
    await p.goto(ORIGIN + '/invest/payments', { waitUntil: 'networkidle2' });
    await shoot(p, `payments-${v.locale}-${v.theme}.png`, v, '/invest/payments');
  }

  // ---- the gateway ------------------------------------------------------
  await signIn(p, 'book.capture@vestora.local', EN);
  await p.goto(ORIGIN + ROOM, { waitUntil: 'networkidle2' });
  await settle(p, ROOM);
  for (let i = 0; i < 10; i++) {
    if (await p.evaluate(() => [...document.querySelectorAll('button')]
      .some(e => /complete investment/i.test(e.textContent || '')))) break;
    await sleep(2200);
  }
  console.log('pay control: ' + JSON.stringify(await clickText(p, /complete investment/i)));
  await sleep(11000);
  const at = new URL(p.url());
  console.log('landed on: ' + at.pathname + at.search);
  await shoot(p, 'checkout-live-en-light.png', EN, at.pathname);

  // Same session, other language — no second attempt is opened.
  await prefs(p, 'ar', 'dark');
  await p.reload({ waitUntil: 'networkidle2' });
  await shoot(p, 'checkout-live-ar-dark.png', AR, at.pathname);

  // ---- settle -----------------------------------------------------------
  await prefs(p, 'en', 'light');
  await p.reload({ waitUntil: 'networkidle2' });
  await settle(p, at.pathname);
  const controls = await p.evaluate(() => [...document.querySelectorAll('button, [role="button"]')]
    .map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()).filter(t => t && t.length < 40));
  console.log('gateway controls: ' + JSON.stringify(controls));
  console.log('approve: ' + JSON.stringify(await clickText(p, /approve payment|pay now|succeed/i)));
  await sleep(14000);
  console.log('returned to: ' + new URL(p.url()).pathname);
  await shoot(p, 'payment-return-en-light.png', EN, null);

  await b.close();
})();
