// Crop the region of interest out of full-page captures, for the deck.
//
// A 1440-wide capture whose content sits in a centred card becomes unreadable
// when it is scaled into half a slide: most of the frame is page background.
// These crops keep the part that carries the point, at a size a committee can
// read from the back of a room. Nothing is altered — only framed.
//
// Sources are the `live-*` captures, taken against the platform as it stands.
// An earlier version of this deck cropped a venture that had since been
// deleted, and showed one $40,000 transaction on a platform carrying fifty-two.
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SHOTS = path.join(__dirname, 'assets', 'screenshots');

// name -> [output, [x, y, w, h]] as FRACTIONS of the source, so the numbers
// stay meaningful if a capture is retaken at a different size.
const CROPS = {
  // The claim on that slide is 'found on attributes'. The evidence is the band
  // carrying the counts, the search field, the four filters and the six sort
  // orders — not the hero above it, which says nothing a committee can check.
  'live-discovery': ['deck-discovery', [0.06, 0.345, 0.89, 0.215]],
  // The room is 2000px of page. Two crops carry it: the header, where the
  // health indicator sits, and the right column, where the real timeline and
  // the measured time-in-stage live.
  'live-dealroom': ['deck-dealroom', [0.12, 0.06, 0.75, 0.18]],
  // The whole right column is a tall, narrow strip: cropped whole it is
  // unreadable at any size a slide allows. The stage-duration table is the part
  // the slide's claim rests on, and it crops to a shape that can be shown large.
  'live-dealroom#2': ['deck-timeline', [0.593, 0.630, 0.281, 0.140]],
  'live-revenue': ['deck-revenue', [0.19, 0.06, 0.79, 0.26]],
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });

  for (const [key, [out, [fx, fy, fw, fh]]] of Object.entries(CROPS)) {
    const src = key.split('#')[0];
    const file = path.join(SHOTS, `${src}.png`);
    if (!fs.existsSync(file)) {
      console.log(`MISS ${src}`);
      continue;
    }

    const page = await browser.newPage();
    await page.goto('file:///' + file.split(path.sep).join('/'), { waitUntil: 'load' });

    const dim = await page.evaluate(() => {
      const i = document.querySelector('img');
      return { w: i.naturalWidth, h: i.naturalHeight };
    });

    await page.setViewport({ width: dim.w, height: Math.min(dim.h, 12000) });
    await page.evaluate(() => {
      document.body.style.margin = '0';
      const i = document.querySelector('img');
      i.style.width = i.naturalWidth + 'px';
      i.style.height = i.naturalHeight + 'px';
      i.style.display = 'block';
    });

    const clip = {
      x: Math.round(dim.w * fx),
      y: Math.round(dim.h * fy),
      width: Math.round(dim.w * fw),
      height: Math.round(dim.h * fh),
    };
    await page.screenshot({ path: path.join(SHOTS, `${out}.png`), clip });
    console.log(`OK   ${out}.png  ${clip.width}x${clip.height}  (from ${src} ${dim.w}x${dim.h})`);
    await page.close();
  }

  await browser.close();
})();
