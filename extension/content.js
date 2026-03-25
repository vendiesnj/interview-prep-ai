/**
 * Signal Career Tracker — content.js (Content Script)
 *
 * Shows a slim, dismissable banner at the top of pages that match a Signal
 * task pattern. The banner is injected once per page load and its dismissed
 * state is persisted per domain for the current browser session.
 */

'use strict';

// ---------------------------------------------------------------------------
// Task-pattern registry (mirrors background.js — kept in sync manually)
// ---------------------------------------------------------------------------

/**
 * Ordered list of URL substrings to match.
 * More-specific entries must appear before broader ones.
 */
const TASK_PATTERNS = [
  { pattern: 'studentaid.gov/manage-loans', label: 'Set up loan repayment' },
  { pattern: 'studentaid.gov',              label: 'Complete FAFSA' },
  { pattern: 'linkedin.com/jobs',           label: 'Apply to internships' },
  { pattern: 'linkedin.com',                label: 'Update LinkedIn' },
  { pattern: 'handshake.com',               label: 'Career fair / Handshake activity' },
  { pattern: 'annualcreditreport.com',      label: 'Check credit report' },
  { pattern: 'irs.gov/app/free',            label: 'File taxes' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the matching task entry for the current page, or null.
 * @returns {{ pattern: string, label: string } | null}
 */
function matchCurrentPage() {
  const url = window.location.href;
  for (const entry of TASK_PATTERNS) {
    if (url.includes(entry.pattern)) return entry;
  }
  return null;
}

/**
 * Storage key used to remember dismissed domains for this session.
 * @param {string} domain
 * @returns {string}
 */
function dismissedKey(domain) {
  return `signal_banner_dismissed_${domain}`;
}

/**
 * Checks whether the banner has been dismissed for this domain in the
 * current session (uses chrome.storage.session if available, falls back
 * to sessionStorage so the script works even outside the extension context
 * during development).
 * @param {string} domain
 * @returns {Promise<boolean>}
 */
async function isDismissed(domain) {
  const key = dismissedKey(domain);

  if (chrome.storage && chrome.storage.session) {
    const result = await chrome.storage.session.get(key);
    return !!result[key];
  }

  return sessionStorage.getItem(key) === '1';
}

/**
 * Persists the dismissed state for this domain for the current session.
 * @param {string} domain
 * @returns {Promise<void>}
 */
async function setDismissed(domain) {
  const key = dismissedKey(domain);

  if (chrome.storage && chrome.storage.session) {
    await chrome.storage.session.set({ [key]: true });
  } else {
    sessionStorage.setItem(key, '1');
  }
}

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

const BANNER_ID = 'signal-career-tracker-banner';

/**
 * Injects the Signal banner into the page DOM.
 * Called only when the page matches a task pattern and the banner has not
 * been dismissed during this session.
 *
 * @param {string} taskLabel  Human-readable task name shown in the banner
 */
function injectBanner(taskLabel) {
  // Guard: do not inject twice (e.g. on SPA route changes)
  if (document.getElementById(BANNER_ID)) return;

  const domain = window.location.hostname;

  // ---- Outer banner wrapper ------------------------------------------------
  const banner = document.createElement('div');
  banner.id = BANNER_ID;

  Object.assign(banner.style, {
    // Layout
    position:       'fixed',
    top:            '0',
    left:           '0',
    width:          '100%',
    height:         '36px',
    zIndex:         '999999',
    boxSizing:      'border-box',
    // Appearance
    background:     'rgba(37, 99, 235, 0.92)',
    backdropFilter: 'blur(4px)',
    boxShadow:      '0 2px 8px rgba(0,0,0,0.18)',
    // Text
    color:          '#ffffff',
    fontSize:       '12px',
    fontFamily:     '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight:     '500',
    letterSpacing:  '0.01em',
    // Flex alignment
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '0 40px 0 12px', // right padding leaves room for the X
  });

  // ---- Left icon (lightning bolt / signal dot) -----------------------------
  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '⚡';
  Object.assign(icon.style, {
    marginRight: '7px',
    fontSize:    '13px',
    lineHeight:  '1',
  });

  // ---- Message text --------------------------------------------------------
  const msg = document.createElement('span');
  msg.textContent = `Signal is tracking this activity for your career checklist`;

  // ---- Task chip -----------------------------------------------------------
  const chip = document.createElement('span');
  chip.textContent = taskLabel;
  Object.assign(chip.style, {
    marginLeft:      '8px',
    background:      'rgba(255,255,255,0.18)',
    borderRadius:    '10px',
    padding:         '2px 8px',
    fontSize:        '11px',
    fontWeight:      '600',
    letterSpacing:   '0.02em',
    whiteSpace:      'nowrap',
  });

  // ---- Dismiss button ------------------------------------------------------
  const closeBtn = document.createElement('button');
  closeBtn.setAttribute('aria-label', 'Dismiss Signal banner');
  closeBtn.textContent = '✕';

  Object.assign(closeBtn.style, {
    position:   'absolute',
    right:      '10px',
    top:        '50%',
    transform:  'translateY(-50%)',
    background: 'transparent',
    border:     'none',
    color:      'rgba(255,255,255,0.8)',
    fontSize:   '13px',
    lineHeight: '1',
    cursor:     'pointer',
    padding:    '4px 6px',
    borderRadius: '4px',
    transition: 'color 0.15s, background 0.15s',
  });

  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.color      = '#ffffff';
    closeBtn.style.background = 'rgba(255,255,255,0.15)';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.color      = 'rgba(255,255,255,0.8)';
    closeBtn.style.background = 'transparent';
  });

  closeBtn.addEventListener('click', async () => {
    // Animate out
    banner.style.transition  = 'opacity 0.2s, transform 0.2s';
    banner.style.opacity     = '0';
    banner.style.transform   = 'translateY(-100%)';

    setTimeout(() => {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
      // Restore any body top-margin we may have added
      restoreBodyMargin();
    }, 220);

    await setDismissed(domain);
  });

  // ---- Assemble ------------------------------------------------------------
  banner.appendChild(icon);
  banner.appendChild(msg);
  banner.appendChild(chip);
  banner.appendChild(closeBtn);

  // ---- Push page content down so the banner does not overlap the top -------
  pushBodyDown();

  // Animate in
  banner.style.opacity   = '0';
  banner.style.transform = 'translateY(-100%)';
  banner.style.transition = 'opacity 0.25s, transform 0.25s';

  document.documentElement.appendChild(banner);

  // Trigger reflow then start the animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      banner.style.opacity   = '1';
      banner.style.transform = 'translateY(0)';
    });
  });
}

// ---------------------------------------------------------------------------
// Body-push helpers (prevent the banner from covering the page's own header)
// ---------------------------------------------------------------------------

const BODY_MARGIN_ATTR = 'data-signal-original-margin-top';

function pushBodyDown() {
  const body = document.body;
  if (!body) return;

  const current = window.getComputedStyle(body).marginTop;
  if (!body.hasAttribute(BODY_MARGIN_ATTR)) {
    body.setAttribute(BODY_MARGIN_ATTR, current);
  }

  const currentPx = parseInt(current, 10) || 0;
  body.style.marginTop = `${currentPx + 36}px`;
}

function restoreBodyMargin() {
  const body = document.body;
  if (!body) return;

  const original = body.getAttribute(BODY_MARGIN_ATTR);
  if (original !== null) {
    body.style.marginTop = original;
    body.removeAttribute(BODY_MARGIN_ATTR);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

(async function init() {
  const match = matchCurrentPage();
  if (!match) return; // page is not in a tracked task domain

  const domain    = window.location.hostname;
  const dismissed = await isDismissed(domain);
  if (dismissed) return; // user already dismissed for this session

  // Small delay so SPAs have time to settle before we inject
  setTimeout(() => injectBanner(match.label), 400);
})();

// ---------------------------------------------------------------------------
// SPA navigation support (handles history.pushState / replaceState changes)
// ---------------------------------------------------------------------------

(function watchSpaNavigation() {
  let lastUrl = window.location.href;

  const recheck = async () => {
    const currentUrl = window.location.href;
    if (currentUrl === lastUrl) return;
    lastUrl = currentUrl;

    // Remove any existing banner (it may no longer be relevant)
    const existing = document.getElementById(BANNER_ID);
    if (existing) {
      existing.parentNode && existing.parentNode.removeChild(existing);
      restoreBodyMargin();
    }

    const match = matchCurrentPage();
    if (!match) return;

    const domain    = window.location.hostname;
    const dismissed = await isDismissed(domain);
    if (dismissed) return;

    setTimeout(() => injectBanner(match.label), 400);
  };

  // Patch history methods
  const _pushState    = history.pushState.bind(history);
  const _replaceState = history.replaceState.bind(history);

  history.pushState = function (...args) {
    _pushState(...args);
    recheck();
  };

  history.replaceState = function (...args) {
    _replaceState(...args);
    recheck();
  };

  window.addEventListener('popstate', recheck);
})();
