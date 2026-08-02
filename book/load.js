// Concurrency sweep against the listing endpoint (NFR-02's target).
const puppeteer = require('puppeteer');
const API = 'http://localhost:5078/api/projects?page=1&pageSize=12';
const pct = (a,p)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(p/100*s.length))];};
(async () => {
  const b = await puppeteer.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless:'new', args:['--no-sandbox','--disable-gpu'] });
  const p = await b.newPage();
  await p.goto('http://localhost:3000', { waitUntil:'domcontentloaded' });
  console.log('conc | reqs |  p50 |  p95 |  p99 |  max | err | req/s');
  for (const conc of [1,5,10,20]) {
    const res = await p.evaluate(async (url, c) => {
      const total = c * 10, times = [], t00 = performance.now();
      let errs = 0, issued = 0;
      async function worker(){ while (issued < total) { issued++;
        const t0=performance.now();
        try { const r = await fetch(url,{cache:'no-store'}); if(!r.ok) errs++; } catch(e){ errs++; }
        times.push(performance.now()-t0); } }
      await Promise.all(Array.from({length:c}, worker));
      return { times, errs, wall: performance.now()-t00 };
    }, API, conc);
    const r = n => Math.round(n);
    console.log(
      String(conc).padStart(4)+' |'+String(res.times.length).padStart(5)+' |'+
      String(r(pct(res.times,50))).padStart(5)+' |'+String(r(pct(res.times,95))).padStart(5)+' |'+
      String(r(pct(res.times,99))).padStart(5)+' |'+String(r(Math.max(...res.times))).padStart(5)+' |'+
      String(res.errs).padStart(4)+' |'+String((res.times.length/(res.wall/1000)).toFixed(1)).padStart(6));
  }
  await b.close();
})();
