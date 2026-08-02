// Collect the figures the book marks [measure]: frontend paint timings and
// API latency distribution. Numbers only — no estimation.
const puppeteer = require('puppeteer');

const WEB = 'http://localhost:3000';
const API = 'http://localhost:5078';

const PAGES = [
  ['landing', '/'],
  ['venture listing', '/projects'],
];

const ENDPOINTS = [
  ['GET /api/projects', '/api/projects?page=1&pageSize=12'],
  ['GET /api/projects (page 2)', '/api/projects?page=2&pageSize=12'],
  ['GET /api/feed', '/api/feed'],
  ['GET /api/signals', '/api/signals'],
];

const pct = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });

  console.log('=== FRONTEND (cold load, 1440x900, 5 runs, median) ===');
  for (const [name, url] of PAGES) {
    const runs = [];
    for (let i = 0; i < 5; i++) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await page.setCacheEnabled(false);
      await page.goto(WEB + url, { waitUntil: 'load' });
      const m = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0] || {};
        const paints = {};
        for (const p of performance.getEntriesByType('paint')) paints[p.name] = p.startTime;
        return {
          ttfb: Math.round(nav.responseStart || 0),
          fcp: Math.round(paints['first-contentful-paint'] || 0),
          domReady: Math.round(nav.domContentLoadedEventEnd || 0),
          load: Math.round(nav.loadEventEnd || 0),
          transferKB: Math.round((nav.transferSize || 0) / 1024),
        };
      });
      runs.push(m);
      await page.close();
    }
    const med = (k) => pct(runs.map((r) => r[k]), 50);
    console.log(
      `${name.padEnd(18)} TTFB ${String(med('ttfb')).padStart(5)}ms  ` +
        `FCP ${String(med('fcp')).padStart(5)}ms  ` +
        `DOMReady ${String(med('domReady')).padStart(5)}ms  ` +
        `Load ${String(med('load')).padStart(5)}ms  ` +
        `HTML ${med('transferKB')}KB`,
    );
  }

  console.log('\n=== API LATENCY (30 requests each, warm) ===');
  const page = await browser.newPage();
  await page.goto(WEB, { waitUntil: 'domcontentloaded' });

  for (const [label, path] of ENDPOINTS) {
    const times = await page.evaluate(
      async (base, p) => {
        const out = [];
        for (let i = 0; i < 30; i++) {
          const t0 = performance.now();
          try {
            await fetch(base + p, { cache: 'no-store' });
          } catch (e) {
            /* recorded anyway */
          }
          out.push(performance.now() - t0);
        }
        return out;
      },
      API,
      path,
    );
    const r = (n) => Math.round(n);
    console.log(
      `${label.padEnd(28)} p50 ${String(r(pct(times, 50))).padStart(4)}ms  ` +
        `p95 ${String(r(pct(times, 95))).padStart(4)}ms  ` +
        `p99 ${String(r(pct(times, 99))).padStart(4)}ms  ` +
        `min ${r(Math.min(...times))}ms  max ${r(Math.max(...times))}ms`,
    );
  }

  await browser.close();
})();
