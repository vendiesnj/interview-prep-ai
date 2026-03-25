/**
 * Signal Career Tracker — popup.js
 *
 * Drives the extension popup UI.
 * Reads state from chrome.storage.local (via a background message) and
 * renders today's stats, recently completed tasks, connection status, and
 * the settings panel.
 */

'use strict';

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

const statusDot      = document.getElementById('statusDot');
const statusText     = document.getElementById('statusText');
const statSites      = document.getElementById('statSites');
const statTime       = document.getElementById('statTime');
const statTasks      = document.getElementById('statTasks');
const taskList       = document.getElementById('taskList');
const dashboardBtn   = document.getElementById('dashboardBtn');
const connectBtn     = document.getElementById('connectBtn');
const signalUrlInput = document.getElementById('signalUrlInput');
const saveBtn        = document.getElementById('saveBtn');
const saveFeedback   = document.getElementById('saveFeedback');

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let signalBase = 'https://signal.careers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats a number of seconds as a rounded minute string.
 * @param {number} seconds
 * @returns {string}
 */
function fmtMinutes(seconds) {
  const m = Math.round((seconds || 0) / 60);
  return String(m);
}

/**
 * Formats an ISO timestamp as a human-friendly relative string.
 * @param {string} iso
 * @returns {string}
 */
function fmtRelative(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * Returns the CSS class name for a stage pill.
 * @param {string} stage
 * @returns {string}
 */
function stagePillClass(stage) {
  const safe = (stage || '').replace(/[^a-z_]/gi, '');
  return `task-stage stage-${safe}`;
}

/**
 * Returns a friendly stage label.
 * @param {string} stage
 * @returns {string}
 */
function stageLabel(stage) {
  const map = {
    pre_college:    'Pre-college',
    during_college: 'College',
    post_college:   'Post-college',
  };
  return map[stage] || stage || '';
}

// ---------------------------------------------------------------------------
// Render functions
// ---------------------------------------------------------------------------

/**
 * Updates the connection status badge.
 * @param {boolean} connected
 */
function renderStatus(connected) {
  if (connected) {
    statusDot.className  = 'status-dot';
    statusText.textContent = 'Connected';
    connectBtn.style.display = 'none';
  } else {
    statusDot.className  = 'status-dot disconnected';
    statusText.textContent = 'Not connected';
    connectBtn.style.display = 'block';
  }
}

/**
 * Updates the three stat counters in the header.
 * @param {{ sitesVisited: number, totalTimeSeconds: number, tasksCompleted: number }} stats
 */
function renderStats(stats) {
  statSites.textContent = stats.sitesVisited   ?? '0';
  statTime.textContent  = fmtMinutes(stats.totalTimeSeconds);
  statTasks.textContent = stats.tasksCompleted ?? '0';
}

/**
 * Renders the completed-tasks list.
 * Shows the 10 most recent entries; renders an empty state if none.
 * @param {Array<{ id: string, label: string, stage: string, timestamp: string, url: string }>} tasks
 */
function renderTaskList(tasks) {
  taskList.innerHTML = '';

  const recent = (tasks || []).slice(0, 10);

  if (recent.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="empty-state-icon">📋</div>
      <div>No tasks auto-completed yet.</div>
      <div style="margin-top:4px;font-size:11px;">Visit a tracked site to get started.</div>
    `;
    taskList.appendChild(empty);
    return;
  }

  recent.forEach((task) => {
    const li = document.createElement('li');
    li.className = 'task-item';

    li.innerHTML = `
      <div class="task-check">✓</div>
      <div class="task-info">
        <div class="task-name">${escHtml(task.label)}</div>
        <div class="task-meta">
          <span class="${stagePillClass(task.stage)}">${escHtml(stageLabel(task.stage))}</span>
          ${escHtml(fmtRelative(task.timestamp))}
        </div>
      </div>
    `;

    taskList.appendChild(li);
  });
}

/**
 * Minimal HTML-escape to prevent XSS from stored task data.
 * @param {string} str
 * @returns {string}
 */
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Load state from background service worker
// ---------------------------------------------------------------------------

async function loadAndRender() {
  try {
    const state = await chrome.runtime.sendMessage({ type: 'GET_STATE' });

    signalBase = state.signalBase || 'https://signal.careers';

    // Update dashboard link
    dashboardBtn.href = `${signalBase}/dashboard`;

    // Populate settings input
    signalUrlInput.value = signalBase;

    // Render everything
    renderStatus(state.authToken);
    renderStats(state.todayStats || {});
    renderTaskList(state.completedTasks || []);

  } catch (err) {
    // Background not available (e.g. service worker sleeping and cold start race)
    // Fall back to reading storage directly
    console.warn('[Signal popup] Background message failed, reading storage directly:', err.message);
    await loadFromStorageDirect();
  }
}

/**
 * Fallback: read chrome.storage.local directly without going through the SW.
 */
async function loadFromStorageDirect() {
  const result = await chrome.storage.local.get([
    'authToken', 'signalBase', 'todayStats', 'completedTasks',
  ]);

  signalBase = result.signalBase || 'https://signal.careers';
  dashboardBtn.href    = `${signalBase}/dashboard`;
  signalUrlInput.value = signalBase;

  renderStatus(!!result.authToken);
  renderStats(result.todayStats || {});
  renderTaskList(result.completedTasks || []);
}

// ---------------------------------------------------------------------------
// Settings — save Signal URL
// ---------------------------------------------------------------------------

saveBtn.addEventListener('click', async () => {
  const newBase = signalUrlInput.value.trim().replace(/\/$/, '') || 'https://signal.careers';
  signalBase = newBase;

  // Persist via background (preferred) or direct storage
  try {
    await chrome.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      payload: { signalBase: newBase },
    });
  } catch {
    await chrome.storage.local.set({ signalBase: newBase });
  }

  // Update the dashboard link to reflect the new base
  dashboardBtn.href = `${newBase}/dashboard`;

  // Show brief confirmation
  saveFeedback.textContent = 'Saved!';
  saveFeedback.style.opacity = '1';
  setTimeout(() => {
    saveFeedback.style.opacity = '0';
    setTimeout(() => { saveFeedback.textContent = ''; }, 300);
  }, 1800);
});

// Allow pressing Enter in the input to trigger Save
signalUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});

// ---------------------------------------------------------------------------
// Connect account — opens the Signal settings page in a new tab
// ---------------------------------------------------------------------------

connectBtn.addEventListener('click', () => {
  const connectUrl = `${signalBase}/settings?connect_extension=1`;
  chrome.tabs.create({ url: connectUrl });
  window.close();
});

// ---------------------------------------------------------------------------
// Dashboard button — update href dynamically before navigation
// ---------------------------------------------------------------------------

dashboardBtn.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: dashboardBtn.href });
  window.close();
});

// ---------------------------------------------------------------------------
// Initialise
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', loadAndRender);
