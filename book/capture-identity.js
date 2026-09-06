// Capture the identity surfaces — the seven screens Report 3 is about.
// Five are reachable signed out; onboarding and the public profile are not.
// Full theme x locale matrix on the signed-out five: they are the first thing
// a visitor sees, so both axes are evidenced there rather than asserted.
const puppeteer = require('puppeteer');
const path = require('path');

const ORIGIN = 'http://localhost:3000';
const OUT = path.join(__dirname, 'assets', 'screenshots');
const EMAIL = 'book.capture@vestora.local';
const PASSWORD = 'BookCapture!2026';

const PUBLIC_PAGES = [
  { name: 'login', url: '/login' },
  { name: 'register', url: '/register' },
  { name: 'verify-email', url: '/verify-email' },
  { name: 'forgot-password', url: '/forgot-password' },
  { name: 'reset-password', url: '/reset-password' },
];

// Two corners on authenticated surfaces, matching capture-auth.js.
const AUTHED_VARIANTS = [
  { locale: 'en', theme: 'light' },
  { locale: 'ar', theme: 'dark' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The Next.js development overlay renders into <nextjs-portal>. It is a
// development affordance, not part of the product, and a red "N issues" badge
// in a documentation screenshot reads as an application fault.
const hideDevOverlay = (p) =>
  p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {});


const setPrefs = (page, locale, theme) =>
  page.evaluate(
    (l, t) => {
      localStorage.setItem('vestora.locale', l);
      localStorage.setItem('theme', t);
    },
    locale,
    theme,
  );

async function shoot(page, file, url) {
  await page.goto(ORIGIN + url, { waitUntil: 'networkidle2' });
  await sleep(2500);
  await hideDevOverlay(page); await page.screenshot({ path: path.join(OUT, file) });
  const landed = new URL(page.url()).pathname;
  const ok = landed === url;
  console.log(`${ok ? 'OK   ' : 'REDIR'} ${file}  ${url}${ok ? '' : ' -> ' + landed}`);
  return ok;
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

  console.log('--- signed out (full matrix)');
  for (const locale of ['en', 'ar']) {
    for (const theme of ['light', 'dark']) {
      await setPrefs(page, locale, theme);
      for (const p of PUBLIC_PAGES) {
        await shoot(page, `${p.name}-${locale}-${theme}.png`, p.url);
      }
    }
  }

  // Sign in through the real form, as the other capture scripts do.
  console.log('--- signing in');
  await setPrefs(page, 'en', 'light');
  await page.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
  await sleep(1500);
  await page.type('input[type="email"]', EMAIL, { delay: 15 });
  await page.type('input[type="password"]', PASSWORD, { delay: 15 });
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
  ]);
  await sleep(4000);
  console.log('signed in at', page.url());

  // The public profile needs a real id. The directory does not always render a
  // link (it depends on who is listed), so resolve one from the public project
  // feed instead — every published venture carries its owner's id.
  const profileUrl = await page.evaluate(async (origin) => {
    const res = await fetch(`${origin.replace('3000', '5078')}/api/projects?page=1&pageSize=20`);
    const data = await res.json();
    const owner = (data.items || []).find((p) => p.backerCount > 0) || (data.items || [])[0];
    return owner ? `/u/${owner.ownerId}` : null;
  }, ORIGIN);
  console.log('profile url:', profileUrl);

  console.log('--- authenticated (two corners)');
  for (const v of AUTHED_VARIANTS) {
    await setPrefs(page, v.locale, v.theme);
    await shoot(page, `onboarding-${v.locale}-${v.theme}.png`, '/onboarding');
    if (profileUrl) {
      await shoot(page, `profile-public-${v.locale}-${v.theme}.png`, profileUrl);
    }
  }

  await browser.close();
})();
