// Phase 1: the founder lists a venture.
//
// The journey this book documents ended when its venture was deleted by the
// team on 15 Aug, which is why the gateway and settlement screens could not be
// retaken. This rebuilds it from the first step.
//
// One submit, once. An earlier session produced a duplicate venture because
// Enter submitted the form a second time, so this clicks the control directly
// and then counts what the founder owns.
const puppeteer = require('puppeteer');
const ORIGIN = 'http://localhost:3000';
const PW = 'BookCapture!2026';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TEXT = {
  name: 'شمس · Shams Solar',
  topic: 'Rooftop solar for Egyptian workshops and small factories',
  description:
    'Shams Solar finances and installs rooftop photovoltaic systems for small ' +
    'industrial workshops in Greater Cairo and the Delta, where grid tariffs have ' +
    'risen faster than margins. The workshop pays nothing upfront and settles a ' +
    'fixed monthly amount below its current bill for seven years, after which the ' +
    'array is theirs. Twelve installations are running; this round funds the next ' +
    'sixty and the technicians to maintain them.',
  investmentNeeded: '250000',
  valuation: '1400000',
  equityOffered: '15',
  useOfFunds:
    'Sixty rooftop arrays and their inverters (62%), four installation and ' +
    'maintenance technicians for eighteen months (24%), and the working capital ' +
    'that covers the gap between paying a supplier and collecting the first ' +
    'monthly instalments (14%).',
};

const setNative = (p, sel, val) =>
  p.evaluate((s, v) => {
    const el = document.querySelector(s);
    if (!el) return false;
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, sel, val);

// Radix renders its list into a portal. Open, wait for it, click by label,
// then wait for it to close before touching the next control.
async function pick(p, id, rx) {
  await p.click('#' + id);
  await p.waitForSelector('[role="option"]', { timeout: 8000 });
  const opts = await p.evaluate(() => [...document.querySelectorAll('[role="option"]')]
    .map(e => (e.textContent || '').trim()));
  const hit = opts.find(o => rx.test(o));
  if (!hit) { console.log(`  ${id}: no match in ${opts.length} options`); return null; }
  // A synthetic .click() does not satisfy Radix, which listens for pointer
  // events. Use a real one, on a handle scrolled into view first — the list of
  // thirty-nine categories does not fit its own box.
  const handles = await p.$$('[role="option"]');
  for (const h of handles) {
    const t = (await h.evaluate(e => (e.textContent || '').trim()));
    if (t !== hit) continue;
    await h.evaluate(e => e.scrollIntoView({ block: 'center' }));
    await sleep(300);
    await h.click();
    break;
  }
  await p.waitForFunction(() => !document.querySelector('[role="option"]'), { timeout: 10000 })
    .catch(() => console.log(`  ${id}: list did not close`));
  await sleep(800);
  const shown = await p.evaluate((i) => (document.getElementById(i)?.textContent || '').trim(), id);
  console.log(`  ${id}: wanted "${hit}" -> trigger reads "${shown}"`);
  return shown;
}

(async () => {
  const b = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless:'new', args:['--no-sandbox','--disable-gpu','--hide-scrollbars'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 1600 });

  await p.goto(ORIGIN + '/login', { waitUntil: 'networkidle2' });
  await sleep(2200);
  await p.type('input[type="email"]', 'book.founder@vestora.local', { delay: 10 });
  await p.type('input[type="password"]', PW, { delay: 10 });
  await Promise.all([p.click('button[type="submit"]'), p.waitForNavigation({waitUntil:'networkidle2'}).catch(()=>{})]);
  await sleep(6000);
  await p.evaluate(() => { localStorage.setItem('vestora.locale','en'); localStorage.setItem('theme','light'); });

  // Refuse to run twice: the founder must own nothing before this starts.
  await p.goto(ORIGIN + '/dashboard/ventures', { waitUntil: 'networkidle2' });
  await sleep(5000);
  const before = await p.evaluate(() => (document.body.innerText||'').includes("haven't listed a venture"));
  console.log('founder owns nothing yet:', before);
  if (!before) { console.log('ABORT — founder already owns a venture; not creating another.'); await b.close(); return; }

  await p.goto(ORIGIN + '/my-projects/new', { waitUntil: 'networkidle2' });
  await sleep(5000);

  for (const [id, val] of Object.entries(TEXT)) {
    console.log(`  ${await setNative(p, '#' + id, val) ? 'set ' : 'MISS'} ${id}`);
  }
  // The location combobox is a free-text input; the form passes it no id.
  const locSel = await p.evaluate(() => {
    const i = [...document.querySelectorAll('input[type="text"]:not([id])')].find(e => e.placeholder);
    return i ? i.placeholder : null;
  });
  console.log('  location input placeholder:', JSON.stringify(locSel));
  if (locSel) console.log(`  ${await setNative(p, `input[placeholder="${locSel}"]`, 'الجيزة') ? 'set ' : 'MISS'} location`);

  await pick(p, 'category', /energy|manufactur/i);
  await pick(p, 'stage', /^Growth$/i);

  await sleep(1500);
  const label = await p.evaluate(() => {
    const btns = [...document.querySelectorAll('button[type="submit"]')];
    return btns.map(e => (e.textContent||'').replace(/\s+/g,' ').trim());
  });
  console.log('  submit controls:', JSON.stringify(label));

  await p.evaluate(() => document.querySelector('button[type="submit"]').click());
  await sleep(12000);
  console.log('  after submit, at:', new URL(p.url()).pathname);

  await p.goto(ORIGIN + '/dashboard/ventures', { waitUntil: 'networkidle2' });
  await sleep(6000);
  const after = await p.evaluate(() => ({
    body: (document.body.innerText||'').replace(/\s+/g,' ').trim().slice(0, 700),
    links: [...document.querySelectorAll('a[href^="/projects/"], a[href^="/my-projects/"]')]
      .map(a => a.getAttribute('href')).filter((v,i,s)=>s.indexOf(v)===i),
  }));
  console.log('\n--- founder ventures now ---\n' + after.body);
  console.log('links:', JSON.stringify(after.links));
  await b.close();
})();
