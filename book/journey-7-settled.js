// Phase 7: everything that changed because the money settled.
//
// The relationship is #227 on venture #99, funded through Stripe's sandbox —
// the previous set documented a venture the team deleted on 15 Aug.
//
// Every shot verifies route, direction, theme and the absence of skeletons
// before it is written. A mislabelled file cannot be produced here.
const puppeteer = require('puppeteer');
const path = require('path');

const ORIGIN = 'http://localhost:3000';
const OUT = path.join(__dirname, 'assets', 'screenshots');
const PW = 'BookCapture!2026';
const ROOM = '/deals/227';
const OTHER_ROOM = '/deals/150';   // a room neither capture account is party to

const EN = { locale: 'en', theme: 'light' };
const AR = { locale: 'ar', theme: 'dark' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hideDevOverlay = (p) =>
  p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {});

const prefs = (p, v) => p.evaluate((a, b) => {
  localStorage.setItem('vestora.locale', a);
  localStorage.setItem('theme', b);
}, v.locale, v.theme);

async function signIn(p, email, v) {
  await p.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
  await sleep(2200);
  await p.type('input[type="email"]', email, { delay: 10 });
  await p.type('input[type="password"]', PW, { delay: 10 });
  await Promise.all([p.click('button[type="submit"]'),
    p.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {})]);
  await sleep(7000);
  await prefs(p, v);
}

async function settle(p, want) {
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
}

let ok = 0, bad = 0;
async function shoot(p, file, v, want) {
  const seen = await settle(p, want);
  const good = (!want || seen.path === want)
    && seen.dir === (v.locale === 'ar' ? 'rtl' : 'ltr')
    && seen.dark === (v.theme === 'dark')
    && !seen.loading;
  if (good) { await hideDevOverlay(p); await p.screenshot({ path: path.join(OUT, file) }); ok++; }
  else bad++;
  console.log(`${good ? 'OK   ' : 'CHECK'} ${file}${good ? '' : '  ' + JSON.stringify(seen)}`);
}

(async () => {
  const b = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless:'new', args:['--no-sandbox','--disable-gpu','--hide-scrollbars'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 1000 });

  // ---- the return, first: it is the most transient thing here -----------
  await signIn(p, 'book.capture@vestora.local', EN);
  await p.goto(ORIGIN + '/payments/return?tx=62&outcome=success', { waitUntil: 'networkidle2' });
  await sleep(6000);
  console.log('return landed on: ' + new URL(p.url()).pathname + new URL(p.url()).search);
  await shoot(p, 'payment-return-en-light.png', EN, null);

  // ---- the investor, now holding something ------------------------------
  for (const v of [EN, AR]) {
    await signIn(p, 'book.capture@vestora.local', v);
    for (const [name, url] of [
      ['settled-payments', '/invest/payments'],
      ['settled-portfolio', '/invest/portfolio'],
      ['commit-pipeline', '/invest/pipeline'],
    ]) {
      await p.goto(ORIGIN + url, { waitUntil: 'networkidle2' });
      await shoot(p, `${name}-${v.locale}-${v.theme}.png`, v, url);
    }
    await p.goto(ORIGIN + ROOM, { waitUntil: 'networkidle2' });
    await shoot(p, `dealroom-investor-${v.locale}-${v.theme}.png`, v, ROOM);

    // A room this account is not part of: the refusal, not a 404.
    await p.goto(ORIGIN + OTHER_ROOM, { waitUntil: 'networkidle2' });
    await shoot(p, `dealroom-nonparty-${v.locale}-${v.theme}.png`, v, OTHER_ROOM);
  }

  // ---- the founder, and the platform ------------------------------------
  for (const v of [EN, AR]) {
    await signIn(p, 'book.founder@vestora.local', v);
    await p.goto(ORIGIN + ROOM, { waitUntil: 'networkidle2' });
    await shoot(p, `dealroom-founder-${v.locale}-${v.theme}.png`, v, ROOM);

    await signIn(p, 'book.admin@vestora.local', v);
    await p.goto(ORIGIN + '/admin/revenue', { waitUntil: 'networkidle2' });
    await shoot(p, `settled-revenue-${v.locale}-${v.theme}.png`, v, '/admin/revenue');
  }

  console.log(`\n${ok} captured, ${bad} needing attention`);
  await b.close();
})();
