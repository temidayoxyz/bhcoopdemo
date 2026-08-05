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

// —— Member: Ada ———
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
await page.waitForFunction(() => document.body.textContent.includes('Ada Okonkwo'), { timeout: 10000 });
await clickContinueAs('Ada');
await page.waitForFunction(() => location.pathname.startsWith('/member/dashboard'), { timeout: 10000 });
await page.goto(`${BASE}/member/market`, { waitUntil: 'networkidle2' });
await page.waitForFunction(() => document.body.textContent.includes('Cooperative Market'), { timeout: 10000 });

const marketText = await page.evaluate(() => document.body.textContent);
check('member market renders 6 products', ['Improved Maize Seed','Rice Seed (FARO 44)','NPK Fertilizer','Poultry Feed','Organic Manure','Maize Grains'].every(p => marketText.includes(p)));
check('member sees deposit wallet balance', /₦83,000\.00/.test(marketText));
check('member sees seeded order stock (maize 38)', marketText.includes('38 in stock'));

// Add 2× maize seed to cart, then checkout state
await page.evaluate(() => {
  const add = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Add to cart'));
  add.click();
  const add2 = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Add to cart'));
  add2.click();
});
await new Promise(r => setTimeout(r, 300));
const cartText = await page.evaluate(() => document.body.textContent);
check('cart shows 2 items after 2 adds', cartText.includes('2 items'));
check('cart total shows ₦17,000', cartText.includes('₦17,000.00'));
check('place order button present', cartText.includes('Place Order'));

// Place the order — Ada has ₦83,000; 2× maize = ₦17,000
await page.evaluate(() => {
  [...document.querySelectorAll('button')].find(x => x.textContent.includes('Place Order'))?.click();
});
await new Promise(r => setTimeout(r, 600));
const afterText = await page.evaluate(() => document.body.textContent);
check('order confirmed banner shows', /ORD-2026-\d{4}/.test(afterText) && afterText.includes('confirmed'));

// My Orders page
await page.goto(`${BASE}/member/market/orders`, { waitUntil: 'networkidle2' });
await page.waitForFunction(() => document.body.textContent.includes('My Market Orders'), { timeout: 10000 });
const ordersText = await page.evaluate(() => document.body.textContent);
check('member order history lists seeded order', ordersText.includes('ORD-2026-1001') && ordersText.includes('FULFILLED'));
check('member order history lists new order', /ORD-2026-\d{4}/.test(ordersText) && ordersText.includes('PLACED'));

// —— Staff: Super Admin Dan ———
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
await page.waitForFunction(() => document.body.textContent.includes('Dan Segun'), { timeout: 10000 });
await clickContinueAs('Super Admin');
await page.waitForFunction(() => location.pathname.startsWith('/admin/dashboard'), { timeout: 10000 });

// Admin catalog
await page.goto(`${BASE}/admin/market`, { waitUntil: 'networkidle2' });
await page.waitForFunction(() => document.body.textContent.includes('Market Catalog'), { timeout: 10000 });
const catText = await page.evaluate(() => document.body.textContent);
check('admin catalog lists products', ['Improved Maize Seed','Rice Seed (FARO 44)','Organic Manure'].every(p => catText.includes(p)));
check('admin catalog shows stock', catText.includes('38') && catText.includes('49'));
check('admin catalog shows sold counts', catText.includes('Sold'));
check('admin sees Add Product button', catText.includes('Add Product'));

// Admin orders
await page.goto(`${BASE}/admin/market/orders`, { waitUntil: 'networkidle2' });
await page.waitForFunction(() => document.body.textContent.includes('Market Orders'), { timeout: 10000 });
const adminOrdersText = await page.evaluate(() => document.body.textContent);
check('admin orders list seeded ORD-2026-1001 (FULFILLED)', adminOrdersText.includes('ORD-2026-1001') && adminOrdersText.includes('FULFILLED'));
check('admin orders list seeded ORD-2026-1002 (PLACED)', adminOrdersText.includes('ORD-2026-1002') && adminOrdersText.includes('PLACED'));
check('admin sees member names', adminOrdersText.includes('Ada Okonkwo') && adminOrdersText.includes('Temidayo Adebayo'));
check('admin sees Pack button on PLACED order', adminOrdersText.includes('Pack'));
check('new order visible to admin', /ORD-2026-\d{4}/.test(adminOrdersText));

console.log(results.join('\n'));
const failed = results.filter(r => r.startsWith('FAIL'));
console.log(failed.length ? `\n${failed.length} FAILURES` : '\nALL PASS');
await browser.close();
process.exit(failed.length ? 1 : 0);
