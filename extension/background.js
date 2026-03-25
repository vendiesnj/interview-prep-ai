/**
 * Signal Career Tracker — background.js (Service Worker)
 *
 * Responsibilities:
 *  - Watch tab navigations and match URLs against TASK_PATTERNS
 *  - Mark matched tasks as complete via the Signal API
 *  - Track time spent per domain using 30-second alarms
 *  - Send a daily session summary to the Signal API
 */

'use strict';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_SIGNAL_BASE = 'https://signal.careers';

/**
 * Map of URL substring → task descriptor.
 * Keys are matched in order; the first match wins.
 * More-specific patterns (longer paths) should appear before broader ones.
 */
const TASK_PATTERNS = [
  {
    pattern: 'studentaid.gov/manage-loans',
    task: { id: 'loans_plan', label: 'Set up loan repayment', stage: 'post_college' },
  },
  {
    pattern: 'studentaid.gov',
    task: { id: 'fafsa_done', label: 'Complete FAFSA', stage: 'pre_college' },
  },
  {
    pattern: 'linkedin.com/jobs',
    task: { id: 'internship_apps', label: 'Apply to internships', stage: 'during_college' },
  },
  {
    pattern: 'linkedin.com',
    task: { id: 'linkedin', label: 'Update LinkedIn', stage: 'during_college' },
  },
  {
    pattern: 'handshake.com',
    task: { id: 'career_fair', label: 'Career fair / Handshake activity', stage: 'during_college' },
  },
  {
    pattern: 'annualcreditreport.com',
    task: { id: 'credit_report', label: 'Check credit report', stage: 'post_college' },
  },
  {
    pattern: 'irs.gov/app/free',
    task: { id: 'taxes_filed', label: 'File taxes', stage: 'during_college' },
  },
];

// Alarm names
const ALARM_TICK   = 'signal_tick';    // fires every 30 s — time tracking
const ALARM_DAILY  = 'signal_daily';   // fires once per day — daily summary

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the task descriptor for a given URL, or null if none matches.
 * @param {string} url
 * @returns {{ id: string, label: string, stage: string } | null}
 */
function matchTask(url) {
  if (!url || !url.startsWith('http')) return null;
  for (const entry of TASK_PATTERNS) {
    if (url.includes(entry.pattern)) {
      return entry.task;
    }
  }
  return null;
}

/**
 * Extracts the bare hostname from a URL string.
 * @param {string} url
 * @returns {string}
 */
function domainOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Returns today's date as "YYYY-MM-DD" in local time.
 * @returns {string}
 */
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

/**
 * Reads the current session state from chrome.storage.local.
 * Initialises missing fields so callers can always read a consistent shape.
 * @returns {Promise<object>}
 */
async function loadState() {
  const defaults = {
    authToken: null,
    signalBase: DEFAULT_SIGNAL_BASE,
    // Per-day stats keyed by date string
    todayStats: {
      date: todayKey(),
      sitesVisited: 0,
      totalTimeSeconds: 0,
      tasksCompleted: 0,
    },
    // Domains visited today: { [domain]: secondsSpent }
    domainTime: {},
    // Recently completed tasks (capped at 50)
    completedTasks: [],
    // Set of task IDs already reported today (avoid duplicate POSTs)
    reportedToday: [],
  };

  const stored = await chrome.storage.local.get(Object.keys(defaults));

  // Reset per-day stats if the stored date is stale
  if (stored.todayStats && stored.todayStats.date !== todayKey()) {
    stored.todayStats  = defaults.todayStats;
    stored.domainTime  = {};
    stored.reportedToday = [];
  }

  return { ...defaults, ...stored };
}

/**
 * Writes a partial state update to chrome.storage.local.
 * @param {object} patch
 * @returns {Promise<void>}
 */
async function saveState(patch) {
  await chrome.storage.local.set(patch);
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/**
 * POSTs a payload to the Signal API extension endpoint.
 * Silently swallows network errors so background failures never crash the SW.
 * @param {object} payload
 * @returns {Promise<void>}
 */
async function postToSignal(payload) {
  const state = await loadState();
  const base  = (state.signalBase || DEFAULT_SIGNAL_BASE).replace(/\/$/, '');
  const url   = `${base}/api/extension`;

  const headers = { 'Content-Type': 'application/json' };
  if (state.authToken) {
    headers['Authorization'] = `Bearer ${state.authToken}`;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`[Signal] API responded ${res.status} for action "${payload.action}"`);
    }
  } catch (err) {
    console.warn('[Signal] API unreachable:', err.message);
  }
}

/**
 * Reports a completed task to Signal and updates local state.
 * Skips tasks already reported during today's session.
 * @param {{ id: string, label: string, stage: string }} task
 * @param {string} url  The full URL that triggered the match
 * @returns {Promise<void>}
 */
async function reportTaskComplete(task, url) {
  const state = await loadState();

  if (state.reportedToday.includes(task.id)) return; // already reported today

  const timestamp = new Date().toISOString();

  await postToSignal({
    action:    'task_complete',
    taskId:    task.id,
    stage:     task.stage,
    url,
    timestamp,
  });

  // Update local state
  const updatedReported = [...state.reportedToday, task.id];
  const updatedCompleted = [
    { ...task, url, timestamp },
    ...state.completedTasks,
  ].slice(0, 50); // keep at most 50

  const updatedStats = {
    ...state.todayStats,
    tasksCompleted: (state.todayStats.tasksCompleted || 0) + 1,
  };

  await saveState({
    reportedToday:  updatedReported,
    completedTasks: updatedCompleted,
    todayStats:     updatedStats,
  });

  console.info(`[Signal] Task marked complete: ${task.label}`);
}

/**
 * Sends the daily session summary to Signal.
 * @returns {Promise<void>}
 */
async function sendDailySummary() {
  const state = await loadState();
  const { domainTime, todayStats } = state;

  // Build top-5 sites by time spent
  const topSites = Object.entries(domainTime)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([domain, seconds]) => ({ domain, seconds }));

  await postToSignal({
    action:           'session_data',
    visitedDomains:   Object.keys(domainTime),
    totalTimeSeconds: todayStats.totalTimeSeconds || 0,
    topSites,
    date:             todayKey(),
  });

  console.info('[Signal] Daily summary sent.');
}

// ---------------------------------------------------------------------------
// Active-tab time tracking
// ---------------------------------------------------------------------------

/**
 * In-memory record of the currently active tab so we can accumulate time
 * between tick alarms without extra storage round-trips.
 */
let activeTab = { id: null, url: null, startedAt: null };

/**
 * Called on each ALARM_TICK (every 30 s).
 * Adds elapsed seconds to the active tab's domain bucket.
 * @returns {Promise<void>}
 */
async function tickTimeTracking() {
  if (!activeTab.url || !activeTab.startedAt) return;

  const elapsed = Math.round((Date.now() - activeTab.startedAt) / 1000);
  if (elapsed <= 0) return;

  // Reset the window so the next tick only measures the next interval
  activeTab.startedAt = Date.now();

  const domain = domainOf(activeTab.url);
  if (!domain) return;

  const state = await loadState();
  const domainTime = { ...state.domainTime };
  domainTime[domain] = (domainTime[domain] || 0) + elapsed;

  const updatedStats = {
    ...state.todayStats,
    totalTimeSeconds: (state.todayStats.totalTimeSeconds || 0) + elapsed,
  };

  await saveState({ domainTime, todayStats: updatedStats });
}

// ---------------------------------------------------------------------------
// Tab event listeners
// ---------------------------------------------------------------------------

/**
 * Fires whenever a tab finishes loading a new URL.
 * Matches against TASK_PATTERNS and reports completions.
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || tab.url.startsWith('chrome://')) return;

  // Update active-tab tracking
  if (activeTab.id === tabId) {
    activeTab = { id: tabId, url: tab.url, startedAt: Date.now() };
  }

  // Increment sites-visited counter (once per completed navigation)
  const state = await loadState();
  const updatedStats = {
    ...state.todayStats,
    sitesVisited: (state.todayStats.sitesVisited || 0) + 1,
  };
  await saveState({ todayStats: updatedStats });

  // Check for task match
  const task = matchTask(tab.url);
  if (task) {
    await reportTaskComplete(task, tab.url);
  }
});

/**
 * Fires when the user switches to a different tab.
 * Updates the active-tab record so time accumulates to the right domain.
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && !tab.url.startsWith('chrome://')) {
      activeTab = { id: tab.id, url: tab.url, startedAt: Date.now() };
    }
  } catch {
    // Tab may have been closed before we could query it
  }
});

/**
 * Fires when a tab is removed.
 * Clears the active-tab record to stop accumulating orphaned time.
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeTab.id === tabId) {
    activeTab = { id: null, url: null, startedAt: null };
  }
});

// ---------------------------------------------------------------------------
// Alarm listeners
// ---------------------------------------------------------------------------

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_TICK) {
    await tickTimeTracking();
  } else if (alarm.name === ALARM_DAILY) {
    await sendDailySummary();
    // Reset daily counters after sending
    await saveState({
      todayStats:    { date: todayKey(), sitesVisited: 0, totalTimeSeconds: 0, tasksCompleted: 0 },
      domainTime:    {},
      reportedToday: [],
    });
  }
});

// ---------------------------------------------------------------------------
// Startup — register alarms and restore active tab
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(async () => {
  console.info('[Signal] Extension installed / updated.');

  // Tick alarm — every 30 seconds for time tracking
  await chrome.alarms.create(ALARM_TICK, { periodInMinutes: 0.5 });

  // Daily summary alarm — once per day (1440 minutes)
  await chrome.alarms.create(ALARM_DAILY, { periodInMinutes: 1440 });
});

chrome.runtime.onStartup.addListener(async () => {
  // Re-create alarms in case they were cleared during browser restart
  const existing = await chrome.alarms.getAll();
  const names    = existing.map((a) => a.name);

  if (!names.includes(ALARM_TICK)) {
    await chrome.alarms.create(ALARM_TICK, { periodInMinutes: 0.5 });
  }
  if (!names.includes(ALARM_DAILY)) {
    await chrome.alarms.create(ALARM_DAILY, { periodInMinutes: 1440 });
  }

  // Capture the currently active tab so time tracking starts immediately
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && !tab.url.startsWith('chrome://')) {
      activeTab = { id: tab.id, url: tab.url, startedAt: Date.now() };
    }
  } catch {
    // No active window yet — that is fine
  }
});

// ---------------------------------------------------------------------------
// Message handler — popup and content script can request state updates
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_STATE') {
    loadState().then((state) => {
      sendResponse({
        todayStats:     state.todayStats,
        completedTasks: state.completedTasks,
        authToken:      !!state.authToken,  // boolean only — never expose the token
        signalBase:     state.signalBase || DEFAULT_SIGNAL_BASE,
      });
    });
    return true; // keep the message channel open for the async response
  }

  if (message.type === 'SAVE_SETTINGS') {
    const { signalBase, authToken } = message.payload || {};
    const patch = {};
    if (signalBase !== undefined) patch.signalBase = signalBase;
    if (authToken  !== undefined) patch.authToken  = authToken;
    saveState(patch).then(() => sendResponse({ ok: true }));
    return true;
  }
});
