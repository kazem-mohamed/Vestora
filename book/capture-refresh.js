// Re-capture every gallery shot that predates the later platform changes:
// structured categories, the deal room negotiation surface, and the added
// administrative areas. Same filenames, current application.
//
// A fresh browser context per group, so a revoked refresh chain in one group
// cannot cascade into the next. Every shot verifies the rendered document
// (route, direction, theme, no loading skeletons) before it is written.
const puppeteer = require('puppeteer');
const path = require('path');

const ORIGIN = 'http://localhost:3000';
const OUT = path.join(__dirname, 'assets', 'screenshots');
const PW = 'BookCapture!2026';

const PUBLIC = [
  ['landing', '/', [['en', 'light'], ['ar', 'dark']], true],
  ['projects', '/projects', [['en', 'light'], ['en', 'dark'], ['ar', 'light']], false],
  ['venture-detail', '/projects/42', [['en', 'light'], ['ar', 'dark']], false],
];

const ROLES = [
  ['book.capture@vestora.local', [
    ['invest', '/invest', [['en', 'light'], ['ar', 'dark']]],
    ['invest-overview', '/invest', [['en', 'light']]],
    ['invest-pipeline', '/invest/pipeline', [['en', 'light']]],
    ['invest-portfolio', '/invest/portfolio', [['en', 'light']]],
    ['invest-payments', '/invest/payments', [['en', 'light']]],
    ['invest-watchlist', '/invest/watchlist', [['en', 'light']]],
    ['invest-activity', '/invest/activity', [['en', 'light']]],
    ['searches', '/searches', [['en', 'light']]],
    ['settings-profile', '/settings/profile', [['en', 'light']]],
    ['investors-directory', '/investors', [['en', 'light']]],
  ]],
  ['book.founder@vestora.local', [
    ['founder-overview', '/dashboard', [['en', 'light']]],
    ['founder-ventures', '/dashboard/ventures', [['en', 'light']]],
    ['founder-funding', '/dashboard/funding', [['en', 'light']]],
    ['founder-requests', '/dashboard/requests', [['en', 'light']]],
    ['founder-analytics', '/dashboard/analytics', [['en', 'light']]],
    ['my-projects-new', '/my-projects/new', [['en', 'light']]],
  ]],
  ['book.admin@vestora.local', [
    ['admin-overview', '/admin', [['en', 'light']]],
    ['admin-review', '/admin/review', [['en', 'light']]],
    ['admin-ventures', '/admin/ventures', [['en', 'light']]],
    ['admin-users', '/admin/users', [['en', 'light']]],
    ['admin-revenue', '/admin/revenue', [['en', 'light']]],
    ['admin-activity', '/admin/activity', [['en', 'light']]],
    ['admin-security', '/admin/security', [['en', 'light']]],
    ['admin-audit', '/admin/audit', [['en', 'light']]],
  ]],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The Next.js development overlay renders into <nextjs-portal>. It is a
// development affordance, not part of the product, and a red "N issues" badge
// in a documentation screenshot reads as an application fault.
const hideDevOverlay = (p) =>
  p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {});

let ok = 0, bad = 0;

const prefs = (p, l, t) =>
  p.evaluate((a, b) => {
    localStorage.setItem('vestora.locale', a);
    localStorage.setItem('theme', b);
  }, l, t);

async function signIn(p, email) {
  await p.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
  await sleep(2200);
  await p.type('input[type="email"]', email, { delay: 12 });
  await p.type('input[type="password"]', PW, { delay: 12 });
  await Promise.all([
    p.click('button[type="submit"]'),
    p.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
  ]);
  await sleep(6000);
  if (new URL(p.url()).pathname === '/onboarding') {
    await p.evaluate(() => {
      const el = [...document.querySelectorAll('button, a')]
        .find((e) => /skip for now/i.test((e.textContent || '').trim()));
      if (el) el.click();
    });
    await sleep(4000);
  }
}

// Some routes are expected to redirect (a refusal is the intended capture), so
// the caller says whether a redirect is acceptable.
async function shoot(p, file, url, loc, th, allowRedirect) {
  await p.goto(ORIGIN + url, { waitUntil: 'networkidle2' });
  let seen;
  for (let i = 0; i < 10; i++) {
    await sleep(2500);
    seen = await p.evaluate(() => ({
      path: location.pathname,
      dir: document.documentElement.dir,
      dark: document.documentElement.className.includes('dark'),
      loading: document.querySelectorAll('[class*="animate-pulse"]').length,
    }));
    if (!seen.loading && (allowRedirect || seen.path === url)) break;
  }
  const good =
    (allowRedirect || seen.path === url) &&
    seen.path !== '/login' &&
    seen.dir === (loc === 'ar' ? 'rtl' : 'ltr') &&
    seen.dark === (th === 'dark') &&
    !seen.loading;
  if (good) { await hideDevOverlay(p); await p.screenshot({ path: path.join(OUT, file) }); ok++; }
  else bad++;
  console.log(`${good ? 'OK   ' : 'CHECK'} ${file}${good ? '' : '  ' + JSON.stringify(seen)}`);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });

  {
    const ctx = await browser.createBrowserContext();
    const p = await ctx.newPage();
    await p.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
    for (const [name, url, variants, mobileToo] of PUBLIC) {
      for (const [loc, th] of variants) {
        await p.setViewport({ width: 1440, height: 900 });
        await prefs(p, loc, th);
        await shoot(p, `${name}-${loc}-${th}.png`, url, loc, th, false);
        if (mobileToo) {
          await p.setViewport({ width: 390, height: 844 });
          await shoot(p, `${name}-${loc}-${th}-mobile.png`, url, loc, th, false);
        }
      }
    }
    await p.setViewport({ width: 1440, height: 900 });
    await prefs(p, 'en', 'light');
    await shoot(p, 'projects.png', '/projects', 'en', 'light', false);
    await ctx.close();
  }

  for (const [email, pages] of ROLES) {
    const ctx = await browser.createBrowserContext();
    const p = await ctx.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    await signIn(p, email);
    for (const [name, url, variants] of pages) {
      for (const [loc, th] of variants) {
        await prefs(p, loc, th);
        const suffix = variants.length > 1 ? `-${loc}-${th}` : '';
        await shoot(p, `${name}${suffix}.png`, url, loc, th, name === 'investors-directory');
      }
    }
    await ctx.close();
  }

  await browser.close();
  console.log(`\n${ok} captured, ${bad} needing attention`);
})();
