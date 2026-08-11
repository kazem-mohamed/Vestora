// The oversight surfaces for Report 12: accounts, the security log and the
// audit log, in both languages and both themes. The gallery holds one variant
// of each.
//
// signIn clears localStorage, which also clears the locale and theme keys, so
// the caller's variant is restored afterwards. Every shot verifies the rendered
// document rather than trusting the file name.
const puppeteer = require('puppeteer');
const path = require('path');

const ORIGIN = 'http://localhost:3000';
const OUT = path.join(__dirname, 'assets', 'screenshots');
const EMAIL = 'book.admin@vestora.local';
const PASSWORD = 'BookCapture!2026';

const PAGES = [
  ['gov-users', '/admin/users'],
  ['gov-security', '/admin/security'],
  ['gov-audit', '/admin/audit'],
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

async function signIn(page, variant) {
  await page.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear()).catch(() => {});
  await page.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
  await sleep(1800);
  await page.type('input[type="email"]', EMAIL, { delay: 12 });
  await page.type('input[type="password"]', PASSWORD, { delay: 12 });
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
  ]);
  await sleep(4500);
  if (variant) await setPrefs(page, variant.locale, variant.theme);
  return !page.url().includes('/login');
}

// Poll until the skeletons clear rather than guessing a duration — the
// oversight pages aggregate across tables and settle slower than most.
async function settle(page, url, v) {
  let seen;
  for (let i = 0; i < 10; i++) {
    await sleep(2500);
    seen = await page.evaluate(() => ({
      path: location.pathname,
      dir: document.documentElement.dir,
      dark: document.documentElement.className.includes('dark'),
      loading: document.querySelectorAll('[class*="animate-pulse"]').length,
    }));
    if (seen.path === url && !seen.loading) break;
  }
  return seen;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  for (const v of VARIANTS) {
    console.log(`--- ${v.locale}/${v.theme} signed in: ${await signIn(page, v)}`);
    for (const [name, url] of PAGES) {
      const file = `${name}-${v.locale}-${v.theme}.png`;
      await page.goto(ORIGIN + url, { waitUntil: 'networkidle2' });
      let seen = await settle(page, url, v);

      if (seen.path === '/login') {
        await signIn(page, v);
        await page.goto(ORIGIN + url, { waitUntil: 'networkidle2' });
        seen = await settle(page, url, v);
      }

      const ok =
        seen.path === url &&
        seen.dir === (v.locale === 'ar' ? 'rtl' : 'ltr') &&
        seen.dark === (v.theme === 'dark') &&
        !seen.loading;

      if (ok) await page.screenshot({ path: path.join(OUT, file) });
      console.log(`${ok ? 'OK   ' : 'CHECK'} ${file}${ok ? '' : '  ' + JSON.stringify(seen)}`);
    }
  }

  await browser.close();
})();
