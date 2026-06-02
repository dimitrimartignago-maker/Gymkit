// Functional test — TRAINER role (dimitri.martignago@protonmail.com)
const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';
const EMAIL = 'dimitri.martignago@protonmail.com';
const RESULTS = [];

function log(status, url, note) {
  const line = `[${status}] ${url}${note ? ' — ' + note : ''}`;
  console.log(line);
  RESULTS.push({ status, url, note });
}

async function checkPage(page, path, label) {
  try {
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    const finalUrl = page.url();
    const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 300) || '');
    const hasError = /error|errore|not found|404|500|something went wrong/i.test(bodyText);
    const redirectedAway = !finalUrl.includes(path);
    if (redirectedAway) {
      log('REDIRECT', path, `→ ${finalUrl}`);
    } else if (hasError) {
      log('ERROR', path, bodyText.substring(0, 120).replace(/\n/g, ' '));
    } else {
      log('OK', path, label);
    }
  } catch (e) {
    log('FAIL', path, e.message.substring(0, 100));
  }
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();

  console.log('\n══════════════════════════════════════════');
  console.log(' TEAMMATE 2 — TRAINER: ' + EMAIL);
  console.log('══════════════════════════════════════════\n');

  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.click('input[type="password"]');

  console.log('>>> INSERISCI LA PASSWORD per ' + EMAIL + ' e premi Invio/Submit <<<\n');

  try {
    await page.waitForURL(url => !url.href.includes('/login') && !url.href.includes('/register'), {
      timeout: 600000,
    });
    log('OK', '/login', 'Login completato');
  } catch (e) {
    log('FAIL', '/login', 'Timeout o errore login — ' + page.url());
    await browser.close();
    printReport();
    return;
  }

  console.log('Login riuscito, navigo le sezioni trainer...\n');

  // ── TRAINER SECTIONS ───────────────────────────────────────────────────
  await checkPage(page, '/clients', 'Lista clienti');
  await checkPage(page, '/exercises', 'Esercizi');
  await checkPage(page, '/templates', 'Template schede');
  await checkPage(page, '/templates/new', 'Nuovo template');
  await checkPage(page, '/schedule', 'Calendario corsi');

  // ── ROLE ISOLATION ─────────────────────────────────────────────────────
  console.log('\n--- Verifica isolamento ruoli (trainer non dovrebbe accedere) ---');
  await checkPage(page, '/dashboard', 'admin-only → dashboard');
  await checkPage(page, '/members', 'admin-only → members');
  await checkPage(page, '/courses', 'admin-only → courses');
  await checkPage(page, '/settings', 'admin-only → settings');
  await checkPage(page, '/workout', 'client-only → workout');
  await checkPage(page, '/booking', 'client-only → booking');

  printReport();
  await browser.close();

  function printReport() {
    console.log('\n══════════════════════════════════════════');
    console.log(' REPORT TRAINER');
    console.log('══════════════════════════════════════════');
    for (const r of RESULTS) {
      console.log(`  ${r.status.padEnd(8)} ${r.url}  (${r.note || ''})`);
    }
    console.log('');
  }
})();
