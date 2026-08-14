// The deal room at full height, from both sides, in both languages.
//
// The earlier captures were taken at a 900px viewport and showed roughly the
// top third of the room — the terms panel, the timeline and the private note
// were all below the fold. These are full-page.
//
// Every shot verifies the rendered document rather than trusting the file name.
const puppeteer = require('puppeteer');
const path = require('path');

const ORIGIN = 'http://localhost:3000';
const OUT = path.join(__dirname, 'assets', 'screenshots');
const PASSWORD = 'BookCapture!2026';
const ROOM = '/deals/184';

const SIDES = [
  ['dealroom-investor', 'book.capture@vestora.local'],
  ['dealroom-founder', 'book.founder@vestora.local'],
];

const VARIANTS = [
  { locale: 'en', theme: 'light' },
  { locale: 'ar', theme: 'dark' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });

  for (const [name, email] of SIDES) {
    for (const v of VARIANTS) {
      // A fresh context per shot: one revoked refresh chain cannot then
      // cascade into the next capture (Report on identity explains why).
      const ctx = await browser.createBrowserContext();
      const p = await ctx.newPage();
      // A viewport tall enough to hold the whole room, rather than fullPage:
      // the header is sticky, and fullPage stitches it back in mid-page.
      await p.setViewport({ width: 1440, height: 2000 });

      await p.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
      await sleep(2500);
      await p.type('input[type="email"]', email, { delay: 12 });
      await p.type('input[type="password"]', PASSWORD, { delay: 12 });
      await Promise.all([
        p.click('button[type="submit"]'),
        p.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
      ]);
      await sleep(7000);

      await p.evaluate(
        (l, t) => {
          localStorage.setItem('vestora.locale', l);
          localStorage.setItem('theme', t);
        },
        v.locale,
        v.theme,
      );
      await p.goto(ORIGIN + ROOM, { waitUntil: 'networkidle2' });

      // Wait for the room's own content, not just for the route.
      let seen;
      for (let i = 0; i < 12; i++) {
        await sleep(2500);
        seen = await p.evaluate(() => ({
          path: location.pathname,
          dir: document.documentElement.dir,
          dark: document.documentElement.className.includes('dark'),
          loading: document.querySelectorAll('[class*="animate-pulse"]').length,
          body: /Draft terms|صياغة الشروط|What happened|ما الذي حدث/i.test(
            document.body.innerText || '',
          ),
        }));
        if (seen.path === ROOM && seen.body && !seen.loading) break;
      }

      const ok =
        seen.path === ROOM &&
        seen.dir === (v.locale === 'ar' ? 'rtl' : 'ltr') &&
        seen.dark === (v.theme === 'dark') &&
        seen.body &&
        !seen.loading;

      const file = `${name}-${v.locale}-${v.theme}.png`;
      if (ok) await p.screenshot({ path: path.join(OUT, file) });
      console.log(`${ok ? 'OK   ' : 'CHECK'} ${file}${ok ? '' : '  ' + JSON.stringify(seen)}`);

      await ctx.close();
    }
  }

  await browser.close();
})();
