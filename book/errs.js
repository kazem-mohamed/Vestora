const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless:'new', args:['--no-sandbox','--disable-gpu'] });
  const p = await b.newPage();
  await p.goto('http://localhost:3000', { waitUntil:'domcontentloaded' });
  const out = await p.evaluate(async () => {
    const url='http://localhost:5078/api/projects?page=1&pageSize=12';
    const codes={};
    await Promise.all(Array.from({length:20}, async () => {
      try { const r = await fetch(url,{cache:'no-store'});
        codes[r.status]=(codes[r.status]||0)+1;
        if(!r.ok && !codes._body){ codes._body=(await r.text()).slice(0,160); } }
      catch(e){ codes['network/'+e.name]=(codes['network/'+e.name]||0)+1; }
    }));
    return codes;
  });
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
