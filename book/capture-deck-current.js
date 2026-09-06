// The deck's product block, captured against the platform as it stands.
//
// The previous block was built on a venture that has since been deleted, and
// showed a single $40,000 transaction on a platform that now carries fifty-two
// settled payments. These captures are of live rows.
//
// Every shot verifies the rendered document before it is written.
const puppeteer = require('puppeteer');
const path = require('path');

const ORIGIN = 'http://localhost:3000';
const OUT = path.join(__dirname, 'assets', 'screenshots');
const PW = 'BookCapture!2026';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hideDevOverlay = (p) =>
  p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {});

const prefs = (p) =>
  p.evaluate(() => {
    localStorage.setItem('vestora.locale', 'en');
    localStorage.setItem('theme', 'light');
  });

async function signIn(p, email) {
  await p.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
  await sleep(2500);
  await p.type('input[type="email"]', email, { delay: 12 });
  await p.type('input[type="password"]', PW, { delay: 12 });
  await Promise.all([
    p.click('button[type="submit"]'),
    p.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
  ]);
  await sleep(7000);
  await prefs(p);
  if (new URL(p.url()).pathname === '/onboarding') {
    await p.evaluate(() => {
      const el = [...document.querySelectorAll('button, a')]
        .find((e) => /skip for now/i.test((e.textContent || '').trim()));
      if (el) el.click();
    });
    await sleep(4000);
  }
}

async function shoot(p, file, url, height) {
  await p.setViewport({ width: 1440, height });
  await p.goto(ORIGIN + url, { waitUntil: 'networkidle2' });
  let seen;
  for (let i = 0; i < 12; i++) {
    await sleep(2500);
    seen = await p.evaluate(() => ({
      path: location.pathname,
      dir: document.documentElement.dir,
      dark: document.documentElement.className.includes('dark'),
      loading: document.querySelectorAll('[class*="animate-pulse"]').length,
    }));
    if (seen.path === url && !seen.loading) break;
  }
  const ok = seen.path === url && seen.dir === 'ltr' && !seen.dark && !seen.loading;
  if (ok) {
    await hideDevOverlay(p);
    await p.screenshot({ path: path.join(OUT, file) });
  }
  console.log(`${ok ? 'OK   ' : 'CHECK'} ${file}  ${JSON.stringify(seen)}`);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });

  // Public discovery, as it stands.
  {
    const ctx = await browser.createBrowserContext();
    const p = await ctx.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    await p.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
    await prefs(p);
    await shoot(p, 'live-discovery.png', '/projects', 900);
    await ctx.close();
  }

  // Administrator: a live relationship, and the platform economics.
  {
    const ctx = await browser.createBrowserContext();
    const p = await ctx.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    await signIn(p, 'book.admin@vestora.local');
    // A real, currently funded relationship — the health indicator is carrying
    // real elapsed time, which a freshly created room could never show.
    await shoot(p, 'live-dealroom.png', '/deals/150', 2000);
    await shoot(p, 'live-revenue.png', '/admin/revenue', 1400);
    await ctx.close();
  }

  await browser.close();
})();
