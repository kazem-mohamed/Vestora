// Capture authenticated surfaces. Signs in through the real form rather than
// injecting tokens, so what is captured is what a user actually reaches.
const puppeteer = require('puppeteer');
const path = require('path');

const ORIGIN = 'http://localhost:3000';
const OUT = path.join(__dirname, 'assets', 'screenshots');
const EMAIL = 'book.capture@vestora.local';
const PASSWORD = 'BookCapture!2026';

const PAGES = [
  { name: 'invest', url: '/invest' },
  { name: 'portfolio', url: '/invest/portfolio' },
  { name: 'watchlist', url: '/invest/watchlist' },
  { name: 'messages', url: '/messages' },
  { name: 'notifications', url: '/notifications' },
  { name: 'settings', url: '/settings/profile' },
];

// Two corners of the matrix rather than all four: enough to evidence both
// axes on authenticated surfaces without quadrupling the gallery.
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


(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
  await sleep(1500);

  await page.type('input[type="email"]', EMAIL, { delay: 15 });
  await page.type('input[type="password"]', PASSWORD, { delay: 15 });
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
  ]);
  await sleep(3500);
  console.log('signed in at', page.url());

  for (const v of VARIANTS) {
    await page.evaluate(
      (l, t) => {
        localStorage.setItem('vestora.locale', l);
        localStorage.setItem('theme', t);
      },
      v.locale,
      v.theme,
    );

    for (const p of PAGES) {
      await page.goto(ORIGIN + p.url, { waitUntil: 'networkidle2' });
      await sleep(2500);
      const file = `${p.name}-${v.locale}-${v.theme}.png`;
      await hideDevOverlay(page); await page.screenshot({ path: path.join(OUT, file) });
      console.log(file, '<-', page.url());
    }
  }

  await browser.close();
})();
