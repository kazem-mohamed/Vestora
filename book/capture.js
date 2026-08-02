// Capture the interface gallery across the theme x locale matrix.
// Theme is next-themes (localStorage "theme", class on <html>); locale is
// localStorage "vestora.locale", which also drives <html dir>.
const puppeteer = require('puppeteer');
const path = require('path');

const ORIGIN = 'http://localhost:3000';
const OUT = path.join(__dirname, 'assets', 'screenshots');

const PAGES = [
  { name: 'landing', url: '/' },
  { name: 'projects', url: '/projects' },
];

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });

  const page = await browser.newPage();

  // Seed storage once on the origin, then every navigation inherits it.
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });

  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    await page.setViewport(vp);

    for (const locale of ['en', 'ar']) {
      for (const theme of ['light', 'dark']) {
        await page.evaluate(
          (l, t) => {
            localStorage.setItem('vestora.locale', l);
            localStorage.setItem('theme', t);
          },
          locale,
          theme,
        );

        for (const p of PAGES) {
          // Mobile only needs the landing page; the matrix is already 8 shots.
          if (vpName === 'mobile' && p.name !== 'landing') continue;

          await page.goto(ORIGIN + p.url, { waitUntil: 'networkidle2' });
          await sleep(2500); // let entrance motion settle

          const suffix = vpName === 'mobile' ? '-mobile' : '';
          const file = `${p.name}-${locale}-${theme}${suffix}.png`;
          await page.screenshot({ path: path.join(OUT, file) });
          console.log(file);
        }
      }
    }
  }

  await browser.close();
})();
