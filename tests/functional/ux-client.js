// UX Observation — CLIENT role
const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';
const EMAIL = 'dimitri.martignago@yahoo.it';
const SS_DIR = 'tests/functional/screenshots/client';
const REPORT = [];

function note(page_path, category, severity, description) {
  const entry = { page: page_path, category, severity, description };
  REPORT.push(entry);
  const icon = severity === 'critico' ? '🔴' : severity === 'medio' ? '🟡' : '🔵';
  console.log(`  ${icon} [${severity.toUpperCase()}] [${category}] ${description}`);
}

async function screenshot(page, name) {
  await page.screenshot({ path: `${SS_DIR}/${name}.png`, fullPage: true });
  console.log(`  📸 ${SS_DIR}/${name}.png`);
}

async function observePage(page, path, label) {
  console.log(`\n──────────────────────────────────────`);
  console.log(`📄 ${label} (${path})`);
  console.log(`──────────────────────────────────────`);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(1500);

  const slug = label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  await screenshot(page, `${slug}-desktop`);

  // ── 1. STATO VUOTO
  const bodyText = await page.evaluate(() => document.body?.innerText || '');
  const hasEmptyMsg = /nessun|vuot|no data|empty|non ci sono|ancora niente|non hai|aggiungi|inizia|prenotat/i.test(bodyText);
  const contentLen = bodyText.replace(/\s+/g, ' ').trim().length;
  const seemsEmpty = contentLen < 250;

  if (seemsEmpty && !hasEmptyMsg) {
    note(path, 'Stato vuoto', 'medio', 'Pagina scarna senza messaggio empty-state esplicito');
  } else if (hasEmptyMsg) {
    console.log(`  ✅ Empty state: messaggio presente`);
  } else {
    console.log(`  ✅ Contenuto presente (${contentLen} chars)`);
  }

  // ── 2. BOTTONI e CTA
  const buttons = await page.evaluate(() =>
    [...document.querySelectorAll('button, a[href], [role="button"]')]
      .map(el => ({
        text: el.innerText?.trim().substring(0, 60) || '',
        disabled: el.disabled || el.getAttribute('aria-disabled') === 'true',
        visible: el.offsetParent !== null
      }))
      .filter(b => b.visible && b.text.length > 0)
      .slice(0, 25)
  );
  const emptyLabels = buttons.filter(b => b.text.length < 2);
  if (emptyLabels.length > 0) {
    note(path, 'Feedback azioni', 'medio', `${emptyLabels.length} bottone/i senza label testuale`);
  }
  console.log(`  🔘 Bottoni: ${buttons.length} — ${buttons.slice(0, 5).map(b => `"${b.text}"`).join(', ')}${buttons.length > 5 ? '...' : ''}`);

  // ── 3. ERRORI SILENTI
  const anomalies = await page.evaluate(() => {
    const text = document.body?.innerText || '';
    const issues = [];
    if (/\bundefined\b|\bnull\b|\bNaN\b/.test(text)) issues.push('valore undefined/null/NaN visibile nel testo');
    if (/\[object Object\]/.test(text)) issues.push('[object Object] visibile');
    if (/TypeError|ReferenceError|SyntaxError/.test(text)) issues.push('stack trace JS visibile');
    if (/error:/i.test(text)) issues.push('"error:" visibile nel testo');
    return issues;
  });
  for (const a of anomalies) note(path, 'Errori silenti', 'critico', a);

  // ── 4. COERENZA VISIVA — immagini rotte, overflow
  const brokenImages = await page.evaluate(() => {
    return [...document.querySelectorAll('img')]
      .filter(img => img.complete && img.naturalWidth === 0 && img.offsetParent !== null)
      .map(img => img.src.substring(0, 80));
  });
  if (brokenImages.length > 0) {
    note(path, 'Coerenza visiva', 'medio', `${brokenImages.length} immagine/i rotta/e: ${brokenImages[0]}`);
  }

  const overflows = await page.evaluate(() => {
    const issues = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollWidth > el.clientWidth + 5 && el.clientWidth > 0 && el.clientWidth < 1200) {
        issues.push(el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : ''));
      }
    });
    return [...new Set(issues)].slice(0, 5);
  });
  if (overflows.length > 0) {
    note(path, 'Coerenza visiva', 'basso', `Overflow orizzontale in: ${overflows.join(', ')}`);
  }

  // ── 5. MOBILE 390px
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  await screenshot(page, `${slug}-mobile`);

  const mobileNav = await page.evaluate(() => {
    const nav = document.querySelector('nav, [role="navigation"], header');
    if (!nav) return { found: false };
    const rect = nav.getBoundingClientRect();
    return { found: true, overflows: rect.right > window.innerWidth + 5 };
  });
  if (!mobileNav.found) {
    note(path, 'Mobile', 'medio', 'Nessun nav/header rilevato nel DOM');
  } else if (mobileNav.overflows) {
    note(path, 'Mobile', 'critico', 'Nav/header fuori viewport a 390px');
  }

  const smallTapTargets = await page.evaluate(() => {
    let count = 0;
    document.querySelectorAll('button, a, [role="button"]').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (rect.width < 36 || rect.height < 36) && el.offsetParent !== null) count++;
    });
    return count;
  });
  if (smallTapTargets > 3) {
    note(path, 'Mobile', 'medio', `${smallTapTargets} tap target < 36×36px`);
  }

  const tinyText = await page.evaluate(() => {
    let count = 0;
    document.querySelectorAll('p, span, td, li, label, h1, h2, h3').forEach(el => {
      if (parseFloat(window.getComputedStyle(el).fontSize) < 11 && el.innerText?.trim() && el.offsetParent) count++;
    });
    return count;
  });
  if (tinyText > 0) {
    note(path, 'Mobile', 'medio', `${tinyText} elementi con font < 11px`);
  }

  await page.setViewportSize({ width: 1280, height: 800 });
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const fs = require('fs');
  if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

  console.log('\n══════════════════════════════════════════');
  console.log(' UX OBSERVATION — CLIENT: ' + EMAIL);
  console.log('══════════════════════════════════════════\n');

  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.click('input[type="password"]');
  console.log('>>> INSERISCI LA PASSWORD per ' + EMAIL + ' <<<\n');

  try {
    await page.waitForURL(url => !url.href.includes('/login') && !url.href.includes('/register'), {
      timeout: 600000,
    });
    console.log('✅ Login completato — URL: ' + page.url() + '\n');
  } catch (e) {
    console.log('❌ Login fallito: ' + e.message);
    await browser.close();
    return;
  }

  await observePage(page, '/workout', 'Workout');
  await observePage(page, '/booking', 'Booking');
  await observePage(page, '/profile', 'Profilo');

  // ── FINAL REPORT
  console.log('\n\n══════════════════════════════════════════');
  console.log(' REPORT FINALE — CLIENT UX');
  console.log('══════════════════════════════════════════\n');

  if (REPORT.length === 0) {
    console.log('  ✅ Nessun problema UX rilevato automaticamente.');
    console.log('  ℹ️  Consulta gli screenshot per valutazione visiva manuale.\n');
  } else {
    const bySeverity = { critico: [], medio: [], basso: [] };
    for (const r of REPORT) bySeverity[r.severity]?.push(r);
    for (const [sev, items] of Object.entries(bySeverity)) {
      if (!items.length) continue;
      const icon = sev === 'critico' ? '🔴' : sev === 'medio' ? '🟡' : '🔵';
      console.log(`${icon} ${sev.toUpperCase()} (${items.length})`);
      for (const r of items) console.log(`   • [${r.category}] ${r.page} — ${r.description}`);
      console.log('');
    }
  }

  console.log('📁 Screenshot salvati in: ' + SS_DIR);
  await browser.close();
})();
