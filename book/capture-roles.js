// Capture every principal surface, once per role, by signing in as that role.
const puppeteer = require('puppeteer');
const path = require('path');

const ORIGIN = 'http://localhost:3000';
const OUT = path.join(__dirname, 'assets', 'screenshots');
const PASSWORD = 'BookCapture!2026';

const ROLES = [
  {
    role: 'investor',
    email: 'book.capture@vestora.local',
    pages: [
      ['invest-overview', '/invest'],
      ['invest-pipeline', '/invest/pipeline'],
      ['invest-portfolio', '/invest/portfolio'],
      ['invest-payments', '/invest/payments'],
      ['invest-watchlist', '/invest/watchlist'],
      ['invest-activity', '/invest/activity'],
      ['searches', '/searches'],
      ['investors-directory', '/investors'],
      ['messages', '/messages'],
      ['notifications', '/notifications'],
      ['settings-profile', '/settings/profile'],
      ['settings-account', '/settings/account'],
    ],
  },
  {
    role: 'founder',
    email: 'book.founder@vestora.local',
    pages: [
      ['founder-overview', '/dashboard'],
      ['founder-ventures', '/dashboard/ventures'],
      ['founder-funding', '/dashboard/funding'],
      ['founder-requests', '/dashboard/requests'],
      ['founder-analytics', '/dashboard/analytics'],
      ['founder-activity', '/dashboard/activity'],
      ['my-projects', '/my-projects'],
      ['my-projects-new', '/my-projects/new'],
    ],
  },
  {
    role: 'admin',
    email: 'book.admin@vestora.local',
    pages: [
      ['admin-overview', '/admin'],
      ['admin-review', '/admin/review'],
      ['admin-ventures', '/admin/ventures'],
      ['admin-users', '/admin/users'],
      ['admin-reports', '/admin/reports'],
      ['admin-revenue', '/admin/revenue'],
      ['admin-activity', '/admin/activity'],
      ['admin-security', '/admin/security'],
      ['admin-audit', '/admin/audit'],
    ],
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Never hit /logout between roles: it revokes the refresh chain server-side and
// the next sign-in races its own rotation (§10.6). Clearing storage is enough.
async function signIn(page, email) {
  await page.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear()).catch(() => {});
  await page.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
  await sleep(1500);
  await page.type('input[type="email"]', email, { delay: 12 });
  await page.type('input[type="password"]', PASSWORD, { delay: 12 });
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
  ]);
  await sleep(4000);
  await page.evaluate(() => {
    localStorage.setItem('vestora.locale', 'en');
    localStorage.setItem('theme', 'light');
  });
  return !page.url().includes('/login');
}

// Rotation can drop the session mid-run; re-establish it and retry once.
async function gotoAuthed(page, email, url) {
  await page.goto(ORIGIN + url, { waitUntil: 'networkidle2' });
  await sleep(2200);
  if (new URL(page.url()).pathname === '/login') {
    await signIn(page, email);
    await page.goto(ORIGIN + url, { waitUntil: 'networkidle2' });
    await sleep(2200);
  }
  return new URL(page.url()).pathname;
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
    const signedIn = await signIn(page, r.email);
    console.log(`--- ${r.role} signed in: ${signedIn} (${page.url()})`);

    for (const [name, url] of r.pages) {
      const landed = await gotoAuthed(page, r.email, url);
      const ok = landed === url;
      await page.screenshot({ path: path.join(OUT, `${name}.png`) });
      console.log(`${ok ? 'OK  ' : 'REDIR'} ${name}.png  ${url}${ok ? '' : ' -> ' + landed}`);
    }
  }

  await browser.close();
})();
