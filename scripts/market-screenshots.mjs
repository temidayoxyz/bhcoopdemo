import puppeteer from 'puppeteer';

const BASE = 'http://localhost:3010';
const OUT = process.env.OUT_DIR || 'shots';

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const clickContinueAs = (name) => page.evaluate((n) => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(`Continue as ${n}`));
  if (b) { b.click(); return true; }
  return false;
}, name);

// 1. Sign in as Ada Okonkwo (member) from the login page
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
if (!(await clickContinueAs('Ada'))) throw new Error('Ada button not found');
await page.waitForFunction(() => location.pathname.startsWith('/member/dashboard'), { timeout: 10000 });

// 2. Member market
await page.goto(`${BASE}/member/market`, { waitUntil: 'networkidle2' });
await page.waitForFunction(() => document.body.textContent.includes("Cooperative Market"), { timeout: 10000 });
await page.screenshot({ path: `${OUT}/member-market.jpg`, type: 'jpeg', quality: 85 });

// Add the first product to cart and screenshot again
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Add to cart'));
  if (b) b.click();
});
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: `${OUT}/member-market-cart.jpg`, type: 'jpeg', quality: 85 });

// 3. Switch to staff (Super Admin Dan) — login page swaps the session
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
await page.waitForFunction(() => document.body.textContent.includes('Dan Segun'), { timeout: 10000 });
if (!(await clickContinueAs('Super Admin'))) throw new Error('Dan button not found');
await page.waitForFunction(() => location.pathname.startsWith('/admin/dashboard'), { timeout: 10000 });

// 4. Admin catalog
await page.goto(`${BASE}/admin/market`, { waitUntil: 'networkidle2' });
await page.waitForFunction(() => document.body.textContent.includes("Market Catalog"), { timeout: 10000 });
await page.screenshot({ path: `${OUT}/admin-market.jpg`, type: 'jpeg', quality: 85 });

// 5. Admin orders
await page.goto(`${BASE}/admin/market/orders`, { waitUntil: 'networkidle2' });
await page.waitForFunction(() => document.body.textContent.includes("Market Orders"), { timeout: 10000 });
await page.screenshot({ path: `${OUT}/admin-orders.jpg`, type: 'jpeg', quality: 85 });

console.log('OK');
await browser.close();
