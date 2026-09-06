// The three dashboards for Report 11, both languages and both themes. The
// existing gallery holds one variant of each; these are the missing halves.
//
// signIn clears localStorage, which also clears the locale and theme keys, so
// the caller's variant is restored afterwards. Every shot verifies the rendered
// document rather than trusting the file name.
const puppeteer = require('puppeteer');
const path = require('path');

const ORIGIN = 'http://localhost:3000';
const OUT = path.join(__dirname, 'assets', 'screenshots');
const PASSWORD = 'BookCapture!2026';

const ROLES = [
  {
    email: 'book.founder@vestora.local',
    pages: [
      ['board-founder', '/dashboard'],
      ['board-founder-analytics', '/dashboard/analytics'],
      ['board-founder-activity', '/dashboard/activity'],
    ],
  },
  {
    email: 'book.capture@vestora.local',
    pages: [['board-investor', '/invest']],
  },
  {
    email: 'book.admin@vestora.local',
    pages: [
      ['board-admin', '/admin'],
      ['board-admin-activity', '/admin/activity'],
      ['board-admin-revenue', '/admin/revenue'],
    ],
  },
];

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


const setPrefs = (page, l, t) =>
  page.evaluate(
    (a, b) => {
      localStorage.setItem('vestora.locale', a);
      localStorage.setItem('theme', b);
    },
    l,
    t,
  );

async function signIn(page, email, variant) {
  await page.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear()).catch(() => {});
  await page.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
  await sleep(1800);
  await page.type('input[type="email"]', email, { delay: 12 });
  await page.type('input[type="password"]', PASSWORD, { delay: 12 });
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
  ]);
  await sleep(4500);
  if (variant) await setPrefs(page, variant.locale, variant.theme);
  return !page.url().includes('/login');
}

async function shoot(page, name, url, v, email) {
  const file = `${name}-${v.locale}-${v.theme}.png`;
  await page.goto(ORIGIN + url, { waitUntil: 'networkidle2' });
  await sleep(4000);
  if (new URL(page.url()).pathname === '/login') {
    await signIn(page, email, v);
    await page.goto(ORIGIN + url, { waitUntil: 'networkidle2' });
    await sleep(4000);
  }

  const seen = await page.evaluate(() => ({
    path: location.pathname,
    dir: document.documentElement.dir,
    dark: document.documentElement.className.includes('dark'),
    loading: document.querySelectorAll('[class*="animate-pulse"]').length,
  }));
  const ok =
    seen.path === url &&
    seen.dir === (v.locale === 'ar' ? 'rtl' : 'ltr') &&
    seen.dark === (v.theme === 'dark') &&
    !seen.loading;

  if (ok) { await hideDevOverlay(page); await page.screenshot({ path: path.join(OUT, file) }); }
  console.log(`${ok ? 'OK   ' : 'CHECK'} ${file}${ok ? '' : '  ' + JSON.stringify(seen)}`);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  for (const r of ROLES) {
    for (const v of VARIANTS) {
      await signIn(page, r.email, v);
      for (const [name, url] of r.pages) {
        await shoot(page, name, url, v, r.email);
      }
    }
  }

  await browser.close();
})();
