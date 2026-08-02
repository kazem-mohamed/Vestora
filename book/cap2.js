const puppeteer = require('puppeteer');
const path = require('path');
const OUT = path.join(__dirname, 'assets', 'screenshots');
const O = 'http://localhost:3000';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new', args: ['--no-sandbox','--disable-gpu','--hide-scrollbars'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(O, { waitUntil: 'domcontentloaded' });
  for (const [name, loc, th] of [['venture-detail-en-light','en','light'],
                                 ['venture-detail-ar-dark','ar','dark']]) {
    await p.evaluate((l,t)=>{localStorage.setItem('vestora.locale',l);localStorage.setItem('theme',t);}, loc, th);
    await p.goto(O + '/projects/42', { waitUntil: 'networkidle2' });
    await sleep(3000);
    await p.screenshot({ path: path.join(OUT, name + '.png') });
    console.log(name, '<-', p.url());
  }
  await b.close();
})();
