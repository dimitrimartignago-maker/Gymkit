// UX Observation — ADMIN role
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://localhost:3000';
const EMAIL = 'dimitri.martignago@gmail.com';
const SS_DIR = 'tests/functional/screenshots/admin';
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

  // Navigate
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(1500);

  const slug = label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  // ── Desktop screenshot
  await screenshot(page, `${slug}-desktop`);

  // ── 1. STATO VUOTO
  const bodyText = await page.evaluate(() => document.body?.innerText || '');
  const pageText = bodyText.toLowerCase();
  const hasEmptyMsg = /nessun|vuot|no data|empty|non ci sono|ancora niente|non hai|aggiungi il primo/i.test(bodyText);
  const seemsEmpty = pageText.length < 200;

  if (seemsEmpty && !hasEmptyMsg) {
    note(path, 'Stato vuoto', 'medio', 'Pagina con poco contenuto e nessun messaggio empty-state visibile');
  } else if (seemsEmpty && hasEmptyMsg) {
    console.log(`  ✅ Empty state: messaggio presente`);
  } else {
    console.log(`  ✅ Contenuto presente`);
  }

  // ── 2. BOTTONI — visibilità e label
  const buttons = await page.evaluate(() => {
    return [...document.querySelectorAll('button, a[href], [role="button"]')]
      .map(el => ({
        tag: el.tagName,
        text: el.innerText?.trim().substring(0, 60) || '',
        type: el.getAttribute('type') || '',
        disabled: el.disabled || el.getAttribute('aria-disabled') === 'true',
        visible: el.offsetParent !== null
      }))
      .filter(b => b.visible && b.text.length > 0)
      .slice(0, 20);
  });

  const emptyLabelBtns = buttons.filter(b => !b.text || b.text.length < 2);
  if (emptyLabelBtns.length > 0) {
    note(path, 'Feedback azioni', 'medio', `${emptyLabelBtns.length} bottone/i senza label testuale (accessibilità)`);
  }
  console.log(`  🔘 Bottoni trovati: ${buttons.length} — labels: ${buttons.slice(0,6).map(b => `"${b.text}"`).join(', ')}${buttons.length > 6 ? '...' : ''}`);

  // ── 3. FORM — presenza e feedback
  const forms = await page.evaluate(() => document.querySelectorAll('form').length);
  if (forms > 0) {
    console.log(`  📝 Form presenti: ${forms}`);
    // Check for error/success indicators
    const hasToast = await page.evaluate(() =>
      !![...document.querySelectorAll('[class*="toast"], [class*="alert"], [class*="notification"], [role="alert"], [role="status"]')].length
    );
    if (!hasToast) {
      note(path, 'Feedback azioni', 'basso', `Form presente ma nessun sistema toast/alert rilevato in DOM (potrebbe apparire solo dopo submit)`);
    }
  }

  // ── 4. ERRORI / TESTI ANOMALI nel DOM
  const anomalies = await page.evaluate(() => {
    const text = document.body?.innerText || '';
    const issues = [];
    if (/undefined|null|NaN/i.test(text)) issues.push('valore undefined/null/NaN visibile nel testo');
    if (/error:|Error:/i.test(text)) issues.push('stringa "Error:" visibile nel testo');
    if (/\[object Object\]/.test(text)) issues.push('[object Object] visibile');
    if (/TypeError|ReferenceError|SyntaxError/.test(text)) issues.push('stack trace JS visibile');
    return issues;
  });
  for (const a of anomalies) {
    note(path, 'Errori silenti', 'critico', a);
  }

  // ── 5. COERENZA VISIVA — overflow, testi troncati, z-index
  const overflows = await page.evaluate(() => {
    const issues = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollWidth > el.clientWidth + 5 && el.clientWidth > 0 && el.clientWidth < 1200) {
        const tag = el.tagName + (el.className ? '.' + el.className.split(' ')[0] : '');
        issues.push(tag);
      }
    });
    return [...new Set(issues)].slice(0, 5);
  });
  if (overflows.length > 0) {
    note(path, 'Coerenza visiva', 'basso', `Overflow orizzontale rilevato in: ${overflows.join(', ')}`);
  }

  // ── 6. MOBILE 390px
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await screenshot(page, `${slug}-mobile`);

  // Check mobile nav
  const mobileNav = await page.evaluate(() => {
    const nav = document.querySelector('nav, [role="navigation"], header');
    if (!nav) return { found: false };
    const rect = nav.getBoundingClientRect();
    return { found: true, overflowsViewport: rect.right > window.innerWidth + 5 };
  });

  if (!mobileNav.found) {
    note(path, 'Mobile', 'medio', 'Nessun elemento nav/header rilevato — difficile valutare navigazione mobile');
  } else if (mobileNav.overflowsViewport) {
    note(path, 'Mobile', 'critico', 'Navigation/header va oltre il viewport a 390px');
  }

  // Check text legibility at mobile
  const tinyText = await page.evaluate(() => {
    let count = 0;
    document.querySelectorAll('p, span, td, li, label').forEach(el => {
      const fs = parseFloat(window.getComputedStyle(el).fontSize);
      if (fs < 11 && el.innerText?.trim().length > 0 && el.offsetParent !== null) count++;
    });
    return count;
  });
  if (tinyText > 0) {
    note(path, 'Mobile', 'medio', `${tinyText} elementi con font < 11px su viewport 390px`);
  }

  // Tap target size
  const smallTapTargets = await page.evaluate(() => {
    let count = 0;
    document.querySelectorAll('button, a, [role="button"]').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (rect.width < 36 || rect.height < 36) && el.offsetParent !== null) {
        count++;
      }
    });
    return count;
  });
  if (smallTapTargets > 3) {
    note(path, 'Mobile', 'medio', `${smallTapTargets} tap target più piccoli di 36×36px`);
  }

  // Restore desktop
  await page.setViewportSize({ width: 1280, height: 800 });
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  console.log('\n══════════════════════════════════════════');
  console.log(' UX OBSERVATION — ADMIN: ' + EMAIL);
  console.log('══════════════════════════════════════════\n');

  // Login
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.click('input[type="password"]');
  console.log('>>> INSERISCI LA PASSWORD per ' + EMAIL + ' <<<\n');

  try {
    await page.waitForURL(url => !url.href.includes('/login') && !url.href.includes('/register'), {
      timeout: 600000,
    });
    console.log('✅ Login completato\n');
  } catch (e) {
    console.log('❌ Login fallito: ' + e.message);
    await browser.close();
    return;
  }

  // Observe each page
  await observePage(page, '/dashboard', 'Dashboard');
  await observePage(page, '/members', 'Membri');
  await observePage(page, '/courses', 'Corsi');
  await observePage(page, '/trainers', 'Trainers');
  await observePage(page, '/settings', 'Impostazioni');

  // ── FINAL REPORT
  console.log('\n\n══════════════════════════════════════════');
  console.log(' REPORT FINALE — ADMIN UX');
  console.log('══════════════════════════════════════════\n');

  if (REPORT.length === 0) {
    console.log('  ✅ Nessun problema UX rilevato automaticamente.');
    console.log('  ℹ️  Consulta gli screenshot per valutazione visiva manuale.\n');
  } else {
    const bySeverity = { critico: [], medio: [], basso: [] };
    for (const r of REPORT) bySeverity[r.severity]?.push(r);

    for (const [sev, items] of Object.entries(bySeverity)) {
      if (items.length === 0) continue;
      const icon = sev === 'critico' ? '🔴' : sev === 'medio' ? '🟡' : '🔵';
      console.log(`${icon} ${sev.toUpperCase()} (${items.length})`);
      for (const r of items) {
        console.log(`   • [${r.category}] ${r.page} — ${r.description}`);
      }
      console.log('');
    }
  }

  console.log('📁 Screenshot salvati in: ' + SS_DIR);
  await browser.close();
})();
