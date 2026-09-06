// The live payment gateway, and the surfaces that only exist once a
// relationship has money in it. The sandbox checkout session is time-boxed
// (35 minutes), so it is captured first and the rest follows.
//
// Every shot verifies the rendered document rather than trusting the file name.
const puppeteer = require('puppeteer');
const path = require('path');

const ORIGIN = 'http://localhost:3000';
const OUT = path.join(__dirname, 'assets', 'screenshots');
const PASSWORD = 'BookCapture!2026';
const INVESTOR = 'book.capture@vestora.local';
const FOUNDER = 'book.founder@vestora.local';
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
  await sleep(1800);
  await p.type('input[type="email"]', email, { delay: 12 });
  await p.type('input[type="password"]', PASSWORD, { delay: 12 });
  await Promise.all([
    p.click('button[type="submit"]'),
    p.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
  ]);
  await sleep(5000);
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

// Poll until the skeletons clear rather than guessing a duration.
async function settle(p, want) {
  let seen;
  for (let i = 0; i < 10; i++) {
    await sleep(2500);
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

async function shoot(p, file, v, wantPath) {
  const seen = await settle(p, wantPath);
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

  // ---- The payment gateway ---------------------------------------------
  for (const v of VARIANTS) {
    console.log(`--- gateway ${v.locale}/${v.theme}`);
    await signIn(p, INVESTOR, v);
    await p.goto(ORIGIN + '/invest/payments', { waitUntil: 'networkidle2' });
    await settle(p, '/invest/payments');
    await shoot(p, `commit-payments-${v.locale}-${v.theme}.png`, v, '/invest/payments');

    // The investor completes the payment from the deal room, which is where
    // the request was made — the room is the record of the agreement, so it is
    // also where the agreement is acted on.
    await p.goto(ORIGIN + ROOM, { waitUntil: 'networkidle2' });
    await settle(p, ROOM);

    // The room renders without skeletons, so settle() alone can return before
    // its content exists. Wait for the control itself to appear.
    for (let i = 0; i < 10; i++) {
      const ready = await p.evaluate(() =>
        [...document.querySelectorAll('button')].some((e) =>
          /complete investment|إتمام الاستثمار|أكمل الاستثمار/i.test(e.textContent || ''),
        ),
      );
      if (ready) break;
      await sleep(2500);
    }

    const started = await click(p, '(Complete investment|إتمام الاستثمار|أكمل الاستثمار)');
    if (!started) {
      console.log(
        '  no pay control; available:',
        JSON.stringify(
          await p.evaluate(() =>
            [...document.querySelectorAll('button, a, [role="button"]')]
              .map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim())
              .filter((t) => t && t.length < 40),
          ),
        ),
      );
    }
    console.log('  pay clicked:', started);
    await sleep(10000);
    await shoot(p, `checkout-live-${v.locale}-${v.theme}.png`, v, '/payments/sandbox-checkout');
  }

  // ---- The deal room, from both sides ----------------------------------
  for (const v of VARIANTS) {
    console.log(`--- deal room ${v.locale}/${v.theme}`);
    await signIn(p, INVESTOR, v);
    await p.goto(ORIGIN + ROOM, { waitUntil: 'networkidle2' });
    await shoot(p, `dealroom-investor-${v.locale}-${v.theme}.png`, v, ROOM);

    await signIn(p, FOUNDER, v);
    await p.goto(ORIGIN + ROOM, { waitUntil: 'networkidle2' });
    await shoot(p, `dealroom-founder-${v.locale}-${v.theme}.png`, v, ROOM);
  }

  // ---- The investor surfaces, now that they hold something -------------
  for (const v of VARIANTS) {
    console.log(`--- investor surfaces ${v.locale}/${v.theme}`);
    await signIn(p, INVESTOR, v);
    for (const [name, url] of [
      ['commit-pipeline', '/invest/pipeline'],
      ['commit-portfolio', '/invest/portfolio'],
    ]) {
      await p.goto(ORIGIN + url, { waitUntil: 'networkidle2' });
      await shoot(p, `${name}-${v.locale}-${v.theme}.png`, v, url);
    }
  }

  await browser.close();
})();
