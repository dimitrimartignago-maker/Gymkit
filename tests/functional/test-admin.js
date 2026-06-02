// Functional test — ADMIN role (dimitri.martignago@gmail.com)
const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';
const EMAIL = 'dimitri.martignago@gmail.com';
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
    const title = await page.title();
    // Check for error indicators
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

  // ── LOGIN ──────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════');
  console.log(' TEAMMATE 1 — ADMIN: ' + EMAIL);
  console.log('══════════════════════════════════════════\n');

  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.click('input[type="password"]');

  console.log('>>> INSERISCI LA PASSWORD per ' + EMAIL + ' e premi Invio/Submit <<<\n');

  // Wait up to 3 minutes for the user to type password and login
  try {
    await page.waitForURL(url => !url.href.includes('/login') && !url.href.includes('/register'), {
      timeout: 600000,
    });
    log('OK', '/login', 'Login completato');
  } catch (e) {
    log('FAIL', '/login', 'Errore: ' + e.message + ' | URL finale: ' + page.url());
    await browser.close();
    printReport();
    return;
  }

  console.log('Login riuscito, navigo le sezioni admin...\n');

  // ── ADMIN SECTIONS ─────────────────────────────────────────────────────
  await checkPage(page, '/dashboard', 'Dashboard');
  await checkPage(page, '/members', 'Lista membri');
  await checkPage(page, '/courses', 'Gestione corsi');
  await checkPage(page, '/trainers', 'Lista trainer');
  await checkPage(page, '/calendar', 'Calendario');
  await checkPage(page, '/settings', 'Impostazioni');
  await checkPage(page, '/account', 'Account');

  // ── ROLE ISOLATION — should redirect away ──────────────────────────────
  console.log('\n--- Verifica isolamento ruoli (admin non dovrebbe accedere) ---');
  await checkPage(page, '/clients', 'trainer-only → clients');
  await checkPage(page, '/exercises', 'trainer-only → exercises');
  await checkPage(page, '/templates', 'trainer-only → templates');
  await checkPage(page, '/workout', 'client-only → workout');
  await checkPage(page, '/booking', 'client-only → booking');

  printReport();
  await browser.close();

  function printReport() {
    console.log('\n══════════════════════════════════════════');
    console.log(' REPORT ADMIN');
    console.log('══════════════════════════════════════════');
    for (const r of RESULTS) {
      console.log(`  ${r.status.padEnd(8)} ${r.url}${r.note ? '  (' + r.note + ')' : ''}`);
    }
    console.log('');
  }
})();
