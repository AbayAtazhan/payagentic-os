// Records real footage of the live ProofPay app for the demo video.
// Deal states are the real rehearsal deal (real PayPal ids); the AI reviews in the clips are live calls.
// Usage: node capture.mjs  ->  writes ../film/assets/footage/*.mp4 and *.png

import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://payagentic-os.vercel.app';
const OUT = path.resolve('../film/assets/footage');
const TMP = path.resolve('./frames');
fs.mkdirSync(OUT, { recursive: true });

const deal = JSON.parse(fs.readFileSync('./rehearsal-deal.json', 'utf8'));
const clone = (x) => JSON.parse(JSON.stringify(x));

// --- Deal states built from the rehearsal ------------------------------------------------
function stateAgreed() {
  const d = clone(deal);
  d.milestones.forEach((m) => {
    m.status = 'AGREED';
    m.submissions = [];
    for (const k of ['orderId', 'authorizationId', 'authExpiresAt', 'termsToken', 'release']) delete m[k];
  });
  d.timeline = d.timeline.slice(0, 1);
  return d;
}
function stateFunded() {
  const d = clone(deal);
  const real = deal.milestones[0];
  d.milestones.forEach((m, i) => {
    m.submissions = [];
    delete m.release;
    m.status = i === 0 ? 'FUNDED' : 'AGREED';
    if (i === 1) for (const k of ['orderId', 'authorizationId', 'authExpiresAt', 'termsToken']) delete m[k];
  });
  Object.assign(d.milestones[0], {
    orderId: real.orderId,
    authorizationId: real.authorizationId,
    authExpiresAt: real.authExpiresAt,
    termsToken: real.termsToken,
  });
  d.timeline = d.timeline.slice(0, 3);
  return d;
}
function stateM2Review() {
  const d = clone(deal);
  const m2 = d.milestones[1];
  m2.status = 'NEEDS_REVIEW';
  delete m2.release;
  d.timeline = d.timeline.slice(0, -3);
  return d;
}

// --- Helpers ------------------------------------------------------------------------------
const CURSOR = `
  (() => {
    if (window.__cursor) return;
    window.__cursor = true;
    const add = () => {
      const c = document.createElement('div');
      c.id = '__cursor';
      c.style.cssText = 'position:fixed;left:0;top:0;width:26px;height:26px;margin:-4px 0 0 -4px;z-index:2147483647;pointer-events:none;transition:transform .08s;';
      c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l16 9-7 2-3 7z" fill="#001c64" stroke="white" stroke-width="1.6" stroke-linejoin="round"/></svg>';
      document.documentElement.appendChild(c);
      addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
      addEventListener('mousedown', (e) => {
        c.style.transform = 'scale(.8)';
        const r = document.createElement('div');
        r.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;border-radius:50%;border:3px solid #0070e0;width:16px;height:16px;left:' + (e.clientX - 8) + 'px;top:' + (e.clientY - 8) + 'px;transition:all .45s ease-out;opacity:.9';
        document.documentElement.appendChild(r);
        requestAnimationFrame(() => { r.style.transform = 'scale(4)'; r.style.opacity = '0'; });
        setTimeout(() => r.remove(), 500);
      }, true);
      addEventListener('mouseup', () => { c.style.transform = 'scale(1)'; }, true);
    };
    if (document.readyState === 'loading') addEventListener('DOMContentLoaded', add); else add();
  })();
`;

async function newPage(browser, { state, scale = 1.5 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: scale, locale: 'en-US', timezoneId: 'America/Los_Angeles' });
  await ctx.addInitScript(
    ([s, cursor]) => {
      if (s) localStorage.setItem('proofpay.deals.v1', s);
      // hide the scrollbar for a clean frame
      const st = document.createElement('style');
      st.textContent = '::-webkit-scrollbar{display:none} html{scrollbar-width:none}';
      document.addEventListener('DOMContentLoaded', () => document.head.appendChild(st));
      eval(cursor);
    },
    [state ? JSON.stringify([state]) : null, CURSOR],
  );
  const page = await ctx.newPage();
  return { ctx, page };
}

async function moveAndClick(page, locator, opts = {}) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y, { steps: opts.steps ?? 28 });
  await page.waitForTimeout(250);
  await page.mouse.down();
  await page.waitForTimeout(90);
  await page.mouse.up();
}

async function smoothScrollTo(page, y, ms = 1200) {
  await page.evaluate(
    ([y, ms]) =>
      new Promise((res) => {
        const start = scrollY;
        const t0 = performance.now();
        const step = (t) => {
          const k = Math.min(1, (t - t0) / ms);
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          scrollTo(0, start + (y - start) * e);
          k < 1 ? requestAnimationFrame(step) : res();
        };
        requestAnimationFrame(step);
      }),
    [y, ms],
  );
}

async function scrollToEl(page, locator, offset = 90, ms = 1100) {
  const y = await locator.evaluate((el, off) => el.getBoundingClientRect().top + scrollY - off, offset);
  await smoothScrollTo(page, y, ms);
}

// CDP screencast -> constant-frame-rate H.264
async function record(page, name, fn) {
  const dir = path.join(TMP, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    const file = path.join(dir, `f${String(frames.length).padStart(5, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    frames.push({ file, t: f.metadata.timestamp });
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  const t0 = Date.now() / 1000;
  await fn();
  await page.waitForTimeout(600);
  await cdp.send('Page.stopScreencast');
  const end = Date.now() / 1000;
  if (frames.length === 0) throw new Error(`no frames for ${name}`);
  let list = 'ffconcat version 1.0\n';
  frames.forEach((fr, i) => {
    const next = i + 1 < frames.length ? frames[i + 1].t : Math.max(fr.t + 0.04, end - (t0 - frames[0].t));
    list += `file '${fr.file}'\nduration ${Math.max(0.001, next - fr.t).toFixed(4)}\n`;
  });
  list += `file '${frames[frames.length - 1].file}'\n`;
  const listFile = path.join(dir, 'list.txt');
  fs.writeFileSync(listFile, list);
  const out = path.join(OUT, `${name}.mp4`);
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile,
    '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=white,fps=30,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-movflags', '+faststart', out,
  ]);
  const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString().trim();
  console.log(`clip ${name}: ${frames.length} frames, ${dur}s`);
}

async function shot(page, name, locator) {
  const file = path.join(OUT, `${name}.png`);
  await page.evaluate(() => { const c = document.getElementById('__cursor'); if (c) c.style.visibility = 'hidden'; });
  if (locator) await locator.screenshot({ path: file });
  else await page.screenshot({ path: file });
  await page.evaluate(() => { const c = document.getElementById('__cursor'); if (c) c.style.visibility = 'visible'; });
  console.log(`shot ${name}`);
}

const dealUrl = `${BASE}/deals/${deal.id}`;
const card = (page, n) => page.locator('main .rounded-2xl.overflow-hidden').nth(n); // milestone cards

// --- Run ------------------------------------------------------------------------------------
const browser = await chromium.launch({ channel: 'chrome' });
const only = process.argv.slice(2);
const want = (k) => only.length === 0 || only.includes(k);

try {
  if (want('landing')) {
    const { ctx, page } = await newPage(browser, { scale: 2 });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await shot(page, 'landing-hero');
    await scrollToEl(page, page.getByText('How it works'), 40, 10);
    await shot(page, 'landing-how');
    await scrollToEl(page, page.getByText('Rules that protect the money'), 40, 10);
    await shot(page, 'landing-rules');
    await ctx.close();
  }

  if (want('plan')) {
    const { ctx, page } = await newPage(browser);
    await page.goto(`${BASE}/deals/new`, { waitUntil: 'networkidle' });
    await page.mouse.move(640, 300);
    await record(page, 'clip-plan', async () => {
      await page.waitForTimeout(500);
      await moveAndClick(page, page.getByText('Use an example'));
      await page.waitForTimeout(900);
      await moveAndClick(page, page.getByRole('button', { name: /Draft milestones/ }));
      await page.getByRole('button', { name: 'Create deal' }).waitFor({ timeout: 90000 });
      await page.waitForTimeout(500);
      await scrollToEl(page, page.locator('main .rounded-xl').first(), 160, 1600);
      await page.waitForTimeout(1500);
      await smoothScrollTo(page, await page.evaluate(() => document.body.scrollHeight), 2500);
      await page.waitForTimeout(800);
    });
    await ctx.close();
  }

  if (want('fund')) {
    const { ctx, page } = await newPage(browser, { state: stateAgreed(), scale: 2 });
    await page.goto(dealUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500); // PayPal SDK button
    await scrollToEl(page, card(page, 0), 80, 10);
    await shot(page, 'fund-before');
    await ctx.close();

    const b = await newPage(browser, { state: stateFunded(), scale: 2 });
    await b.page.goto(dealUrl, { waitUntil: 'networkidle' });
    await scrollToEl(b.page, card(b.page, 0), 80, 10);
    await shot(b.page, 'fund-after');
    await shot(b.page, 'fund-after-card', card(b.page, 0));
    await b.ctx.close();
  }

  if (want('review')) {
    // Live AI reviews: first draft, then the draft with hidden text. No money moves.
    const { ctx, page } = await newPage(browser, { state: stateFunded() });
    await page.goto(dealUrl, { waitUntil: 'networkidle' });
    await page.mouse.move(900, 200);
    await record(page, 'clip-review', async () => {
      await page.waitForTimeout(400);
      await moveAndClick(page, page.getByRole('button', { name: 'freelancer view' }));
      await page.waitForTimeout(500);
      await scrollToEl(page, card(page, 0), 70, 1000);
      await moveAndClick(page, page.getByRole('button', { name: 'First draft' }).first());
      await page.waitForTimeout(600);
      await moveAndClick(page, page.getByRole('button', { name: 'Submit for AI review' }).first());
      await page.getByText(/criteria met/).first().waitFor({ timeout: 90000 });
      await page.waitForTimeout(700);
      await scrollToEl(page, page.getByText(/criteria met/).first(), 120, 1200);
      await page.waitForTimeout(2600);
      await scrollToEl(page, page.getByText('What to fix').first(), 260, 1200);
      await page.waitForTimeout(1800);
    });
    await shot(page, 'review-v1-card', card(page, 0));

    await record(page, 'clip-attack', async () => {
      const btn = page.getByRole('button', { name: 'Draft with hidden text' }).first();
      await scrollToEl(page, page.getByText('Submit a fixed version').first(), 220, 900);
      await moveAndClick(page, btn);
      await page.waitForTimeout(500);
      await moveAndClick(page, page.getByRole('button', { name: 'Submit for AI review' }).first());
      await page.getByText('Attempt to manipulate the AI reviewer detected').waitFor({ timeout: 90000 });
      await page.waitForTimeout(500);
      await scrollToEl(page, page.getByText(/Needs a human look/).first(), 120, 1200);
      await page.waitForTimeout(3500);
    });
    await shot(page, 'attack-card', card(page, 0));
    await ctx.close();
  }

  if (want('sample')) {
    const { ctx, page } = await newPage(browser, { scale: 2 });
    for (const v of ['v1', 'v2']) {
      await page.goto(`${BASE}/samples/sunrise-bakery/${v}`, { waitUntil: 'networkidle' });
      await shot(page, `sample-${v}`);
    }
    await ctx.close();
  }

  if (want('final')) {
    const { ctx, page } = await newPage(browser, { state: deal, scale: 2 });
    await page.goto(dealUrl, { waitUntil: 'networkidle' });
    const c0 = card(page, 0);
    await scrollToEl(page, c0.getByText(/· [0-9]\/[0-9] criteria met/), 100, 10);
    await shot(page, 'final-verdict');
    await scrollToEl(page, c0.getByText(/paid to the freelancer/), 330, 10);
    await shot(page, 'final-paid');
    await shot(page, 'final-paid-box', c0.locator('.border-emerald-200').last());
    const c1 = card(page, 1);
    await scrollToEl(page, c1.getByText(/paid to the freelancer/), 300, 10);
    await shot(page, 'm2-paid');
    await shot(page, 'm2-paid-box', c1.locator('.border-emerald-200').last());
    await scrollToEl(page, page.getByText('Activity'), 40, 10);
    await shot(page, 'activity');
    await ctx.close();

    const b = await newPage(browser, { state: stateM2Review(), scale: 2 });
    await b.page.goto(dealUrl, { waitUntil: 'networkidle' });
    const m2 = card(b.page, 1);
    await scrollToEl(b.page, m2.getByText(/· [0-9]\/[0-9] criteria met/), 100, 10);
    await shot(b.page, 'm2-review');
    await b.ctx.close();
  }

  if (want('ledger')) {
    const { ctx, page } = await newPage(browser, { state: deal });
    await page.goto(`${BASE}/deals`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.mouse.move(700, 600);
    await record(page, 'clip-ledger', async () => {
      await page.waitForTimeout(800);
      const search = page.getByPlaceholder(/Search deals/);
      await moveAndClick(page, search);
      await page.keyboard.type('45N36322', { delay: 90 });
      await page.waitForTimeout(1500);
      await page.locator('.ag-body-horizontal-scroll-viewport').evaluate((el) =>
        new Promise((res) => {
          const t0 = performance.now();
          const max = el.scrollWidth - el.clientWidth;
          const step = (t) => {
            const k = Math.min(1, (t - t0) / 2500);
            el.scrollLeft = max * (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
            k < 1 ? requestAnimationFrame(step) : res();
          };
          requestAnimationFrame(step);
        }),
      );
      await page.waitForTimeout(1500);
    });
    const b = await newPage(browser, { state: deal, scale: 2 });
    await b.page.goto(`${BASE}/deals`, { waitUntil: 'networkidle' });
    await b.page.waitForTimeout(1200);
    await shot(b.page, 'ledger');
    await b.ctx.close();
    await ctx.close();
  }
} finally {
  await browser.close();
}
