// Retry the funding request, watching the network. The first attempt clicked
// the control and nothing was written, so the failure is worth seeing rather
// than guessing at.
const puppeteer = require('puppeteer');
const ORIGIN = 'http://localhost:3000';
const PW = 'BookCapture!2026';
const ROOM = '/deals/227';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

const settle = async (p) => {
  for (let i = 0; i < 10; i++) {
    await sleep(2000);
    if (!(await p.evaluate(() => document.querySelectorAll('[class*="animate-pulse"]').length))) break;
  }
  await sleep(2500);
};

(async () => {
  const b = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless:'new', args:['--no-sandbox','--disable-gpu','--hide-scrollbars'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 1600 });

  p.on('response', async (res) => {
    const u = res.url();
    if (!/localhost:5078/.test(u)) return;
    const m = res.request().method();
    if (m === 'GET') return;
    let body = '';
    try { body = (await res.text()).slice(0, 400); } catch {}
    console.log(`  NET ${m} ${res.status()} ${u.replace('http://localhost:5078','')} :: ${clean(body)}`);
  });

  await p.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
  await sleep(2200);
  await p.type('input[type="email"]', 'book.founder@vestora.local', { delay: 10 });
  await p.type('input[type="password"]', PW, { delay: 10 });
  await Promise.all([p.click('button[type="submit"]'), p.waitForNavigation({waitUntil:'networkidle2'}).catch(()=>{})]);
  await sleep(7000);
  await p.evaluate(() => { localStorage.setItem('vestora.locale','en'); localStorage.setItem('theme','light'); });

  await p.goto(ORIGIN + ROOM, { waitUntil: 'networkidle2' });
  await settle(p);

  // Guard: never create a second request.
  if (!(await p.evaluate(() => document.body.innerText.includes('No funds requested yet')))) {
    console.log('ABORT — a funding request already exists on this room.');
    await b.close();
    return;
  }

  for (const h of await p.$$('button')) {
    if (clean(await h.evaluate(e => e.textContent)) === 'Request funds') { await h.click(); break; }
  }
  await p.waitForSelector('#funding-amount', { timeout: 10000 });
  await sleep(1500);

  // Type into the amount field instead of setting it: the control may
  // normalise on keystroke, and a value set from outside React never gets that.
  await p.click('#funding-amount');
  await p.keyboard.down('Control');
  await p.keyboard.press('KeyA');
  await p.keyboard.up('Control');
  await p.keyboard.press('Backspace');
  await sleep(500);
  const cleared = await p.evaluate(() => document.getElementById('funding-amount').value);
  console.log('  cleared to: ' + JSON.stringify(cleared));
  await p.type('#funding-amount', '120000', { delay: 60 });
  await sleep(800);
  await p.click('#funding-note');
  await p.type('#funding-note',
    'Terms as discussed: $120,000 for 7.2% on a $1.4M pre-money. '
    + 'The first twenty arrays are already scheduled with the supplier.', { delay: 6 });
  await sleep(1200);

  const state = await p.evaluate(() => ({
    amount: document.getElementById('funding-amount')?.value,
    note: (document.getElementById('funding-note')?.value || '').slice(0, 40),
    send: [...document.querySelectorAll('[role="dialog"] button')]
      .map(e => ({ t: (e.textContent||'').replace(/\s+/g,' ').trim(), off: e.disabled === true })),
  }));
  console.log('before send: ' + JSON.stringify(state));

  if (state.amount !== '120000') {
    console.log('ABORT — amount reads ' + JSON.stringify(state.amount) + ', refusing to send.');
    await b.close();
    return;
  }
  for (const h of await p.$$('[role="dialog"] button')) {
    if (clean(await h.evaluate(e => e.textContent)) !== 'Send request') continue;
    if (await h.evaluate(e => e.disabled === true)) { console.log('  send is disabled'); break; }
    await h.click();
    console.log('  send clicked');
    break;
  }
  await sleep(9000);

  const after = await p.evaluate(() => ({
    dialog: !!document.querySelector('[role="dialog"]'),
    dialogText: (document.querySelector('[role="dialog"]')?.innerText || '').replace(/\s+/g,' ').trim().slice(0, 700),
    toast: [...document.querySelectorAll('[role="status"], [role="alert"], [data-sonner-toast]')]
      .map(e => (e.textContent||'').replace(/\s+/g,' ').trim()),
    page: (document.body.innerText||'').replace(/\s+/g,' ').trim().slice(0, 300),
  }));
  console.log('\nafter send: dialog=' + after.dialog);
  console.log('toast: ' + JSON.stringify(after.toast));
  if (after.dialog) console.log('DIALOG STILL: ' + after.dialogText);
  await b.close();
})();
