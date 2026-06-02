// Functional test — CLIENT DISATTIVATO (dimitri.martignago@yahoo.it)
const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';
const EMAIL = 'dimitri.martignago@yahoo.it';
const RESULTS = [];

function log(status, url, note) {
  console.log(`[${status}] ${url}${note ? ' — ' + note : ''}`);
  RESULTS.push({ status, url, note });
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();

  console.log('\n══════════════════════════════════════════');
  console.log(' TEAMMATE 3 — CLIENT DISATTIVATO: ' + EMAIL);
  console.log('══════════════════════════════════════════\n');

  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.click('input[type="password"]');

  console.log('>>> INSERISCI LA PASSWORD per ' + EMAIL + ' e premi Invio/Submit <<<');
  console.log('>>> (Il login dovrebbe essere bloccato) <<<\n');

  // Wait for URL change away from /login (if account is properly blocked, this times out)
  let navigatedAway = false;
  try {
    await page.waitForURL(url => !url.href.includes('/login') && !url.href.includes('/register'), {
      timeout: 600000,
    });
    navigatedAway = true;
  } catch (_) {
    // Expected: stayed on /login
  }

  const finalUrl = page.url();
  const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 600) || '');

  if (navigatedAway) {
    log('SECURITY_ISSUE', finalUrl,
      'ATTENZIONE: account disattivato ha superato il login — accesso non dovrebbe essere consentito!');
  } else {
    const hasBlockMsg = /disattivat|disabilitat|bloccato|non autorizzat|inactive|disabled|blocked|unauthorized|invalid|sospeso/i.test(bodyText);
    if (hasBlockMsg) {
      log('BLOCKED_OK', '/login', 'Login bloccato con messaggio di errore visibile');
    } else {
      log('BLOCKED_NO_MSG', '/login', 'Rimasto su /login ma nessun messaggio di blocco visibile — verificare UI');
    }
  }

  console.log('\n══════════════════════════════════════════');
  console.log(' REPORT CLIENT DISATTIVATO');
  console.log('══════════════════════════════════════════');
  for (const r of RESULTS) {
    console.log(`  ${r.status.padEnd(16)} ${r.url}  (${r.note || ''})`);
  }
  console.log('');

  await browser.close();
})();
