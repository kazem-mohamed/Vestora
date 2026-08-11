// Capture the discovery and engagement surfaces for Report 6, and the
// commitment surfaces for Report 7. The investor surfaces exist in the gallery
// under a single variant only; both axes are added here.
const puppeteer = require('puppeteer');
const path = require('path');

const ORIGIN = 'http://localhost:3000';
const OUT = path.join(__dirname, 'assets', 'screenshots');
const EMAIL = 'book.capture@vestora.local';
const PASSWORD = 'BookCapture!2026';

// Reachable without an account — discovery's founding claim is that these are.
const PUBLIC_PAGES = [
  ['discover-list', '/projects'],
  ['discover-detail', '/projects/42'],
];

// /saved is not listed: it redirects to /invest/watchlist, so capturing it
// produces a duplicate of a surface already captured under its own name.
// /investors is listed even though it refuses this account — the refusal is the
// capture Report 6 wants.
const AUTHED_PAGES = [
  ['engage-searches', '/searches'],
  ['engage-watchlist', '/invest/watchlist'],
  ['engage-activity', '/invest/activity'],
  ['engage-directory', '/investors'],
  ['commit-pipeline', '/invest/pipeline'],
  ['commit-portfolio', '/invest/portfolio'],
  ['commit-payments', '/invest/payments'],
];

const VARIANTS = [
  { locale: 'en', theme: 'light' },
  { locale: 'ar', theme: 'dark' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const setPrefs = (page, l, t) =>
  page.evaluate(
    (a, b) => {
      localStorage.setItem('vestora.locale', a);
      localStorage.setItem('theme', b);
    },
    l,
    t,
  );

// Clearing storage rather than calling /logout: logout revokes the refresh
// chain server-side and the next sign-in races its own rotation (Report 3).
//
// It also clears the locale and theme keys, so the caller's variant must be
// restored afterwards. Forgetting that produced a set of captures named
// `-ar-dark` that were rendered in English on the light theme — which is why
// shoot() below verifies the rendered document rather than trusting the name.
async function signIn(page, variant) {
  await page.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear()).catch(() => {});
  await page.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
  await sleep(1500);
  await page.type('input[type="email"]', EMAIL, { delay: 12 });
  await page.type('input[type="password"]', PASSWORD, { delay: 12 });
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
  ]);
  await sleep(4000);
  if (variant) await setPrefs(page, variant.locale, variant.theme);
  return !page.url().includes('/login');
}

async function shoot(page, name, url, v, authed) {
  const file = `${name}-${v.locale}-${v.theme}.png`;
  await page.goto(ORIGIN + url, { waitUntil: 'networkidle2' });
  await sleep(3500);
  if (authed && new URL(page.url()).pathname === '/login') {
    await signIn(page, v);
    await page.goto(ORIGIN + url, { waitUntil: 'networkidle2' });
    await sleep(3500);
  }

  const seen = await page.evaluate(() => ({
    dir: document.documentElement.dir,
    dark: document.documentElement.className.includes('dark'),
    loading: document.querySelectorAll('[class*="animate-pulse"]').length,
  }));
  const wantDir = v.locale === 'ar' ? 'rtl' : 'ltr';
  const wantDark = v.theme === 'dark';
  const landed = new URL(page.url()).pathname;

  const problems = [];
  if (landed !== url) problems.push(`landed=${landed}`);
  if (seen.dir !== wantDir) problems.push(`dir=${seen.dir} want=${wantDir}`);
  if (seen.dark !== wantDark) problems.push(`dark=${seen.dark} want=${wantDark}`);
  if (seen.loading) problems.push(`still-loading=${seen.loading}`);

  await page.screenshot({ path: path.join(OUT, file) });
  console.log(`${problems.length ? 'CHECK' : 'OK   '} ${file}${problems.length ? '  ' + problems.join(' · ') : ''}`);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });

  console.log('--- signed out');
  for (const v of VARIANTS) {
    await setPrefs(page, v.locale, v.theme);
    for (const [name, url] of PUBLIC_PAGES) {
      await shoot(page, name, url, v, false);
    }
  }

  console.log(`--- signed in: ${await signIn(page)}`);
  for (const v of VARIANTS) {
    await setPrefs(page, v.locale, v.theme);
    for (const [name, url] of AUTHED_PAGES) {
      await shoot(page, name, url, v, true);
    }
  }

  await browser.close();
})();
