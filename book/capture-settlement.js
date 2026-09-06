// Settle the sandbox payment and capture what changes because of it.
//
// The provider is the offline simulator (`provider: simulated`) — no network,
// no card, no money. Approving here writes the same rows the Stripe-compatible
// path would write, which is the whole point of the abstraction in Report 8.
//
// Every shot verifies the rendered document rather than trusting the file name.
const puppeteer = require('puppeteer');
const path = require('path');

const ORIGIN = 'http://localhost:3000';
const OUT = path.join(__dirname, 'assets', 'screenshots');
const PASSWORD = 'BookCapture!2026';
const INVESTOR = 'book.capture@vestora.local';
const FOUNDER = 'book.founder@vestora.local';
const ADMIN = 'book.admin@vestora.local';
const ROOM = '/deals/184';

const VARIANTS = [
  { locale: 'en', theme: 'light' },
  { locale: 'ar', theme: 'dark' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The Next.js development overlay renders into <nextjs-portal>. It is a
// development affordance, not part of the product, and a red "N issues" badge
// in a documentation screenshot reads as an application fault.
const hideDevOverlay = (p) =>
  p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {});


const setPrefs = (p, l, t) =>
  p.evaluate(
    (a, b) => {
      localStorage.setItem('vestora.locale', a);
      localStorage.setItem('theme', b);
    },
    l,
    t,
  );

async function signIn(p, email, v) {
  await p.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
  await p.evaluate(() => localStorage.clear()).catch(() => {});
  await p.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
  await sleep(2200);
  await p.type('input[type="email"]', email, { delay: 12 });
  await p.type('input[type="password"]', PASSWORD, { delay: 12 });
  await Promise.all([
    p.click('button[type="submit"]'),
    p.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
  ]);
  await sleep(6000);
  if (v) await setPrefs(p, v.locale, v.theme);
  if (new URL(p.url()).pathname === '/onboarding') {
    await p.evaluate(() => {
      const el = [...document.querySelectorAll('button, a')].find((e) =>
        /skip for now/i.test((e.textContent || '').trim()),
      );
      if (el) el.click();
    });
    await sleep(4000);
  }
}

const click = (p, src) =>
  p.evaluate((s) => {
    const rx = new RegExp(s, 'i');
    const el = [...document.querySelectorAll('button, a, [role="button"]')].find((e) =>
      rx.test((e.textContent || '').replace(/\s+/g, ' ').trim()),
    );
    if (!el || el.disabled) return false;
    el.click();
    return true;
  }, src);

// Wait for a control to exist rather than guessing a duration — several of
// these surfaces render without skeletons.
async function waitFor(p, src, tries = 12) {
  for (let i = 0; i < tries; i++) {
    const ok = await p.evaluate((s) => {
      const rx = new RegExp(s, 'i');
      return [...document.querySelectorAll('button, a, [role="button"]')].some((e) =>
        rx.test((e.textContent || '').replace(/\s+/g, ' ')),
      );
    }, src);
    if (ok) return true;
    await sleep(2500);
  }
  return false;
}

async function shoot(p, file, v, wantPath) {
  let seen;
  for (let i = 0; i < 10; i++) {
    await sleep(2500);
    seen = await p.evaluate(() => ({
      path: location.pathname,
      dir: document.documentElement.dir,
      dark: document.documentElement.className.includes('dark'),
      loading: document.querySelectorAll('[class*="animate-pulse"]').length,
    }));
    if ((!wantPath || seen.path === wantPath) && !seen.loading) break;
  }
  const ok =
    (!wantPath || seen.path === wantPath) &&
    seen.dir === (v.locale === 'ar' ? 'rtl' : 'ltr') &&
    seen.dark === (v.theme === 'dark') &&
    !seen.loading;
  if (ok) { await hideDevOverlay(p); await p.screenshot({ path: path.join(OUT, file) }); }
  console.log(`${ok ? 'OK   ' : 'CHECK'} ${file}${ok ? '' : '  ' + JSON.stringify(seen)}`);
  return ok;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });

  // ---- Settle, once, in English ----------------------------------------
  console.log('--- settling the payment');
  await signIn(p, INVESTOR, VARIANTS[0]);
  await p.goto(ORIGIN + ROOM, { waitUntil: 'networkidle2' });
  await waitFor(p, 'Complete investment');
  console.log('  opened checkout:', await click(p, 'Complete investment'));
  await sleep(9000);
  console.log('  at:', new URL(p.url()).pathname);

  const approved = await waitFor(p, 'Approve payment');
  console.log('  approve button present:', approved);
  if (approved) {
    console.log('  approved:', await click(p, 'Approve payment'));
    await sleep(12000);
    console.log('  landed:', new URL(p.url()).pathname);
    await shoot(p, 'payment-return-en-light.png', VARIANTS[0], null);
  }

  // ---- What settlement changed ------------------------------------------
  for (const v of VARIANTS) {
    console.log(`--- investor after settlement ${v.locale}/${v.theme}`);
    await signIn(p, INVESTOR, v);
    for (const [name, url] of [
      ['settled-payments', '/invest/payments'],
      ['settled-portfolio', '/invest/portfolio'],
      ['settled-pipeline', '/invest/pipeline'],
    ]) {
      await p.goto(ORIGIN + url, { waitUntil: 'networkidle2' });
      await shoot(p, `${name}-${v.locale}-${v.theme}.png`, v, url);
    }

    console.log(`--- founder after settlement ${v.locale}/${v.theme}`);
    await signIn(p, FOUNDER, v);
    await p.goto(ORIGIN + '/dashboard/funding', { waitUntil: 'networkidle2' });
    await shoot(p, `settled-founder-funding-${v.locale}-${v.theme}.png`, v, '/dashboard/funding');

    console.log(`--- platform revenue ${v.locale}/${v.theme}`);
    await signIn(p, ADMIN, v);
    await p.goto(ORIGIN + '/admin/revenue', { waitUntil: 'networkidle2' });
    await shoot(p, `settled-revenue-${v.locale}-${v.theme}.png`, v, '/admin/revenue');
  }

  await browser.close();
})();
