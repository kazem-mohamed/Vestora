// Phase 2: the administrator reviews the venture.
//
// Moderation is a separate axis from the funding lifecycle — this writes
// ModerationStatus and nothing else. A queue holding something exists only
// until the decision is taken, so it is captured before the click.
const puppeteer = require('puppeteer');
const ORIGIN = 'http://localhost:3000';
const PW = 'BookCapture!2026';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

(async () => {
  const b = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless:'new', args:['--no-sandbox','--disable-gpu','--hide-scrollbars'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 1400 });

  await p.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
  await sleep(2200);
  await p.type('input[type="email"]', 'book.admin@vestora.local', { delay: 10 });
  await p.type('input[type="password"]', PW, { delay: 10 });
  await Promise.all([p.click('button[type="submit"]'), p.waitForNavigation({waitUntil:'networkidle2'}).catch(()=>{})]);
  await sleep(7000);
  await p.evaluate(() => { localStorage.setItem('vestora.locale','en'); localStorage.setItem('theme','light'); });

  await p.goto(ORIGIN + '/admin/review', { waitUntil: 'networkidle2' });
  for (let i=0;i<8;i++){ await sleep(2000);
    if(!(await p.evaluate(()=>document.querySelectorAll('[class*="animate-pulse"]').length))) break; }

  await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {});
  const seen = await p.evaluate(() => ({ path: location.pathname, dir: document.documentElement.dir,
    dark: document.documentElement.className.includes('dark'),
    loading: document.querySelectorAll('[class*="animate-pulse"]').length }));
  if (seen.path === '/admin/review' && seen.dir === 'ltr' && !seen.dark && !seen.loading) {
    await p.screenshot({ path: 'assets/screenshots/admin-review.png' });
    console.log('OK    admin-review.png (queue holding one venture)');
  } else console.log('CHECK admin-review.png ' + JSON.stringify(seen));

  const handles = await p.$$('button, [role="button"]');
  let clicked = false;
  for (const h of handles) {
    if (clean(await h.evaluate(e => e.textContent)) !== 'Approve') continue;
    await h.evaluate(e => e.scrollIntoView({ block: 'center' }));
    await sleep(400);
    await h.click();
    clicked = true;
    break;
  }
  console.log('approve clicked: ' + clicked);
  await sleep(6000);

  const after = await p.evaluate(() => ({
    body: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 600),
    dialog: !!document.querySelector('[role="dialog"]'),
    dialogControls: [...document.querySelectorAll('[role="dialog"] button')]
      .map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()),
  }));
  console.log('dialog open: ' + after.dialog + ' ' + JSON.stringify(after.dialogControls));
  console.log('page now:\n' + after.body);
  await b.close();
})();
