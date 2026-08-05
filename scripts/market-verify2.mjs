import puppeteer from 'puppeteer';
const BASE = 'http://localhost:3010';
const results = [];
const check = (name, cond) => results.push(`${cond ? 'PASS' : 'FAIL'} ${name}`);
const browser = await puppeteer.launch({ headless: 'new', executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const clickContinueAs = (name) => page.evaluate((n) => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(`Continue as ${n}`));
  if (b) { b.click(); return true; }
  return false;
}, name);

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
await page.waitForFunction(() => document.body.textContent.includes('Ada Okonkwo'), { timeout: 10000 });
await clickContinueAs('Ada');
await page.waitForFunction(() => location.pathname.startsWith('/member/dashboard'), { timeout: 10000 });
await page.goto(`${BASE}/member/market`, { waitUntil: 'networkidle2' });
await page.waitForFunction(() => document.body.textContent.includes('Cooperative Market'), { timeout: 10000 });

// Add 2× Improved Maize Seed — click only the Add button inside the maize card, one render cycle apart
const addMaize = () => page.evaluate(() => {
  const cards = [...document.querySelectorAll('h3')];
  const h3 = cards.find((el) => el.textContent.includes('Improved Maize Seed'));
  const card = h3?.closest('div')?.closest('div');
  const btn = [...(card?.querySelectorAll('button') || [])].find((b) => b.textContent.includes('Add to cart'));
  btn?.click();
  return !!btn;
});
if (!(await addMaize())) throw new Error('maize add button not found');
await new Promise(r => setTimeout(r, 300));
await page.evaluate(() => { const h3 = [...document.querySelectorAll('h3')].find((el) => el.textContent.includes('Improved Maize Seed')); const card = h3?.closest('div')?.closest('div'); [...(card?.querySelectorAll('button') || [])].find((b) => b.getAttribute('aria-label') === 'Increase')?.click(); });
await new Promise(r => setTimeout(r, 300));

const cartText = await page.evaluate(() => document.body.textContent);
check('cart counts 2 items', cartText.includes('2 items'));
check('cart total ₦17,000.00', cartText.includes('₦17,000.00'));
check('maize stepper shows 2 × 10kg bag', cartText.includes('2 × 10kg bag'));

// Place order
await page.evaluate(() => { [...document.querySelectorAll('button')].find(x => x.textContent.includes('Place Order'))?.click(); });
await new Promise(r => setTimeout(r, 600));
const afterText = await page.evaluate(() => document.body.textContent);
check('order confirmed banner shows', /ORD-2026-\d{4}/.test(afterText) && afterText.includes('confirmed'));

// Switch to admin, verify stock consumed 38 → 36
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
await page.waitForFunction(() => document.body.textContent.includes('Dan Segun'), { timeout: 10000 });
await clickContinueAs('Super Admin');
await page.waitForFunction(() => location.pathname.startsWith('/admin/dashboard'), { timeout: 10000 });
await page.goto(`${BASE}/admin/market`, { waitUntil: 'networkidle2' });
await page.waitForFunction(() => document.body.textContent.includes('Market Catalog'), { timeout: 10000 });
const catText = await page.evaluate(() => document.body.textContent);
check('maize stock consumed to 36', catText.includes('36'));
check('maize sold count 2', catText.includes('Sold') && catText.includes('2'));

console.log(results.join('\n'));
const failed = results.filter(r => r.startsWith('FAIL'));
console.log(failed.length ? `\n${failed.length} FAILURES` : '\nALL PASS');
await browser.close();
process.exit(failed.length ? 1 : 0);
