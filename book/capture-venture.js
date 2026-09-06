// Capture the venture-lifecycle and moderation surfaces for Reports 4 and 5.
// The founder authoring surfaces and the administrator review queue both exist
// only under one variant in the existing gallery; both axes are added here
// because Report 5 is about a queue an Arabic-reading administrator uses.
const puppeteer = require('puppeteer');
const path = require('path');

const ORIGIN = 'http://localhost:3000';
const OUT = path.join(__dirname, 'assets', 'screenshots');
const PASSWORD = 'BookCapture!2026';

const ROLES = [
  {
    role: 'founder',
    email: 'book.founder@vestora.local',
    pages: [
      ['venture-author', '/my-projects/new'],
      ['venture-mine', '/my-projects'],
      ['venture-ladder', '/dashboard/funding'],
    ],
  },
  {
    role: 'admin',
    email: 'book.admin@vestora.local',
    pages: [
      ['review-queue', '/admin/review'],
      ['review-ventures', '/admin/ventures'],
      ['review-reports', '/admin/reports'],
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


// Clearing storage rather than calling /logout: logout revokes the refresh
// chain server-side and the next sign-in races its own rotation (Report 3).
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
  return !page.url().includes('/login');
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
    console.log(`--- ${r.role} signed in: ${await signIn(page, r.email)}`);

    for (const v of VARIANTS) {
      await page.evaluate(
        (l, t) => {
          localStorage.setItem('vestora.locale', l);
          localStorage.setItem('theme', t);
        },
        v.locale,
        v.theme,
      );

      for (const [name, url] of r.pages) {
        await page.goto(ORIGIN + url, { waitUntil: 'networkidle2' });
        await sleep(2500);
        if (new URL(page.url()).pathname === '/login') {
          await signIn(page, r.email);
          await page.goto(ORIGIN + url, { waitUntil: 'networkidle2' });
          await sleep(2500);
        }
        const file = `${name}-${v.locale}-${v.theme}.png`;
        await hideDevOverlay(page); await page.screenshot({ path: path.join(OUT, file) });
        const landed = new URL(page.url()).pathname;
        console.log(`${landed === url ? 'OK   ' : 'REDIR'} ${file}  ${url}${landed === url ? '' : ' -> ' + landed}`);
      }
    }
  }

  await browser.close();
})();
