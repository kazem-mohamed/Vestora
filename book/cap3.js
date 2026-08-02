// Capture a real conversation thread from both sides of it.
const puppeteer = require('puppeteer');
const path = require('path');

const OUT = path.join(__dirname, 'assets', 'screenshots');
const O = 'http://localhost:3000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function signIn(p, email) {
  await p.goto(O + '/login', { waitUntil: 'networkidle2' });
  await p.evaluate(() => localStorage.clear()).catch(() => {});
  await p.goto(O + '/login', { waitUntil: 'networkidle2' });
  await sleep(1500);
  await p.type('input[type="email"]', email, { delay: 12 });
  await p.type('input[type="password"]', 'BookCapture!2026', { delay: 12 });
  await Promise.all([
    p.click('button[type="submit"]'),
    p.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
  ]);
  await sleep(4000);
}

// The thread is the subject, not the list — open the first conversation.
async function openThread(p) {
  return p.evaluate(() => {
    const rows = [...document.querySelectorAll('button, a, li, [role="button"]')];
    const row = rows.find((e) => /Founder Capture|Book Capture/i.test(e.textContent || ''));
    if (!row) return false;
    row.click();
    return true;
  });
}

(async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });

  const runs = [
    ['investor', 'book.capture@vestora.local', [['en', 'light'], ['ar', 'dark']]],
    ['founder', 'book.founder@vestora.local', [['en', 'light']]],
  ];

  for (const [who, email, variants] of runs) {
    await signIn(p, email);
    for (const [loc, th] of variants) {
      await p.evaluate(
        (l, t) => {
          localStorage.setItem('vestora.locale', l);
          localStorage.setItem('theme', t);
        },
        loc,
        th,
      );
      await p.goto(O + '/messages', { waitUntil: 'networkidle2' });
      await sleep(3000);
      const opened = await openThread(p);
      await sleep(3000);
      const name = `conversation-${who}-${loc}-${th}.png`;
      await p.screenshot({ path: path.join(OUT, name) });
      console.log(`${name}  thread=${opened}`);
    }
  }

  await b.close();
})();
