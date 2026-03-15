(function () {
  'use strict';

  const STORAGE_KEY = 'counter-app-state';
  const PRESET_COLORS = [
    '#c8b4e0', '#f2a0b0', '#f5c5a0', '#f5e6a0', '#a8e6a0', '#a0f5d0',
    '#b0b0b0', '#8b7355', '#f5cba0', '#fffacd', '#a0c4f5', '#b0e8e8',
  ];

  // ── State ──

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          counters: Array.isArray(parsed.counters) ? parsed.counters : [],
          theme: parsed.theme || null,
        };
      }
    } catch (e) {
      // Corrupted data — start fresh
    }
    return { counters: [], theme: null };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      counters: state.counters,
      theme: state.theme,
    }));
  }

  function updateState(changes) {
    Object.assign(state, changes);
    saveState();
    router();
  }

  const state = { ...loadState(), settingsMode: false };

  // ── Theme ──

  function applyTheme() {
    const theme = state.theme ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.body.setAttribute('data-theme', theme);
  }

  function toggleTheme() {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    updateState({ theme: next });
    applyTheme();
  }

  // ── Helpers ──

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getContrastColor(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    // Relative luminance (WCAG formula)
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? '#1a1a1a' : '#ffffff';
  }

  function getCounterById(id) {
    return state.counters.find(c => c.id === id);
  }

  // ── Router ──

  function router() {
    const hash = location.hash || '#/';
    const app = document.getElementById('app');

    let match;
    if ((match = hash.match(/^#\/counter\/(.+)$/))) {
      renderCounterMain(app, match[1]);
    } else if ((match = hash.match(/^#\/edit\/(.+)$/))) {
      renderCounterEdit(app, match[1]);
    } else if (hash === '#/new') {
      renderCounterEdit(app, null);
    } else {
      renderHome(app);
    }
  }

  // ── Home view ──

  function renderHome(app) {
    const themeIcon = document.body.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
    const settingsClass = state.settingsMode ? ' active' : '';

    let cardsHtml = '';
    if (state.counters.length === 0) {
      cardsHtml = '<div class="empty-state">No counters yet. Tap + to create one.</div>';
    } else {
      cardsHtml = '<div class="counter-list">';
      for (const c of state.counters) {
        const bg = c.color || '#a0c4f5';
        const fg = getContrastColor(bg);
        const name = escapeHtml(c.name);

        const cardHtml = `
          <div class="counter-card-wrapper" style="background:${bg}; color:${fg}" data-id="${c.id}">
            <div class="counter-card-name">${name}</div>
            <div class="counter-card-row">
              <button class="counter-card-btn" style="background:${bg}; color:${fg}" data-action="decrement" data-id="${c.id}">−</button>
              <div class="counter-card-body" style="background:rgba(255,255,255,0.35); color:${fg}" data-action="open-counter" data-id="${c.id}">${c.value}</div>
              <button class="counter-card-btn" style="background:${bg}; color:${fg}" data-action="increment" data-id="${c.id}">+</button>
            </div>
          </div>`;

        if (state.settingsMode) {
          cardsHtml += `
            <div class="card-wrapper">
              <button class="settings-icon delete-btn" data-action="delete" data-id="${c.id}" title="Delete">🗑</button>
              ${cardHtml}
              <button class="settings-icon" data-action="edit" data-id="${c.id}" title="Edit">✏️</button>
            </div>`;
        } else {
          cardsHtml += cardHtml;
        }
      }
      cardsHtml += '</div>';
    }

    app.innerHTML = `
      <div class="header">
        <button class="icon-btn${settingsClass}" data-action="toggle-settings" title="Settings">⚙️</button>
        <h1>Counters</h1>
        <button class="icon-btn" data-action="toggle-theme" title="Toggle theme">${themeIcon}</button>
      </div>
      ${cardsHtml}
      <button class="fab" data-action="new-counter" title="New counter">+</button>
    `;
  }

  // ── Counter Main view ──

  function renderCounterMain(app, id) {
    const counter = getCounterById(id);
    if (!counter) {
      location.hash = '#/';
      return;
    }

    const bg = counter.color || '#a0c4f5';
    const fg = getContrastColor(bg);

    app.innerHTML = `
      <div class="counter-main">
        <div class="counter-main-header">
          <button class="icon-btn" data-action="go-home" title="Back">←</button>
          <h2>${escapeHtml(counter.name)}</h2>
          <button class="icon-btn" data-action="edit-from-main" data-id="${counter.id}" title="Edit">✏️</button>
        </div>
        <div class="counter-main-value">${counter.value}</div>
        <div class="counter-main-controls">
          <button class="counter-main-btn" style="background:${bg}; color:${fg}" data-action="decrement" data-id="${counter.id}">−</button>
          <button class="counter-main-btn" style="background:${bg}; color:${fg}" data-action="increment" data-id="${counter.id}">+</button>
        </div>
      </div>
    `;
  }

  // ── Counter Edit view ──

  function renderCounterEdit(app, id) {
    const isNew = !id;
    const counter = isNew
      ? { name: '', value: 0, increment: 1, color: PRESET_COLORS[4] }
      : getCounterById(id);

    if (!isNew && !counter) {
      location.hash = '#/';
      return;
    }

    const swatches = PRESET_COLORS.map(c => {
      const sel = c === counter.color ? ' selected' : '';
      return `<div class="color-swatch${sel}" style="background:${c}" data-action="pick-color" data-color="${c}"></div>`;
    }).join('');

    app.innerHTML = `
      <div class="edit-view">
        <div class="edit-header">
          <button class="icon-btn" data-action="edit-back" data-id="${id || ''}" title="Back">←</button>
          <h2>${isNew ? 'New Counter' : 'Edit Counter'}</h2>
        </div>
        <div class="form-group">
          <label for="edit-name">Name</label>
          <input id="edit-name" type="text" value="${escapeHtml(counter.name)}" placeholder="Counter Name" maxlength="50">
        </div>
        <div class="form-group">
          <label for="edit-value">Value</label>
          <input id="edit-value" type="number" value="${counter.value}">
        </div>
        <div class="form-row">
          <label for="edit-increment">Increment:</label>
          <input id="edit-increment" type="number" value="${counter.increment}" min="1">
        </div>
        <div class="form-row color-section">
          <label>Color:</label>
          <input id="edit-color" type="text" value="${counter.color}" placeholder="#FF00FF" maxlength="7">
        </div>
        <div class="color-grid" id="color-grid">
          ${swatches}
        </div>
        <button class="save-btn" data-action="save" data-id="${id || ''}">Save</button>
      </div>
    `;
  }

  // ── Confirm dialog ──

  function showConfirmDialog(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <p>${escapeHtml(message)}</p>
        <div class="confirm-actions">
          <button class="btn-cancel" data-action="confirm-cancel">Cancel</button>
          <button class="btn-confirm-delete" data-action="confirm-yes">Delete</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'confirm-cancel') {
        overlay.remove();
      } else if (action === 'confirm-yes') {
        overlay.remove();
        onConfirm();
      }
    });
  }

  // ── Event delegation ──

  document.getElementById('app').addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id;

    switch (action) {
      case 'toggle-settings':
        state.settingsMode = !state.settingsMode;
        router();
        break;

      case 'toggle-theme':
        toggleTheme();
        break;

      case 'increment': {
        e.stopPropagation();
        const counter = getCounterById(id);
        if (counter) {
          counter.value += (counter.increment || 1);
          updateState({ counters: state.counters });
        }
        break;
      }

      case 'decrement': {
        e.stopPropagation();
        const counter = getCounterById(id);
        if (counter) {
          counter.value -= (counter.increment || 1);
          updateState({ counters: state.counters });
        }
        break;
      }

      case 'open-counter':
        if (!state.settingsMode) {
          location.hash = `#/counter/${id}`;
        }
        break;

      case 'edit':
      case 'edit-from-main':
        location.hash = `#/edit/${id}`;
        break;

      case 'delete':
        showConfirmDialog('Delete this counter?', () => {
          updateState({ counters: state.counters.filter(c => c.id !== id) });
        });
        break;

      case 'new-counter':
        location.hash = '#/new';
        break;

      case 'go-home':
        location.hash = '#/';
        break;

      case 'edit-back':
        // Go back to counter main if editing existing, home if new
        if (id) {
          location.hash = `#/counter/${id}`;
        } else {
          location.hash = '#/';
        }
        break;

      case 'pick-color': {
        const color = target.dataset.color;
        const colorInput = document.getElementById('edit-color');
        if (colorInput) colorInput.value = color;
        // Update swatch selection visually
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        target.classList.add('selected');
        break;
      }

      case 'save': {
        const nameInput = document.getElementById('edit-name');
        const valueInput = document.getElementById('edit-value');
        const incrementInput = document.getElementById('edit-increment');
        const colorInput = document.getElementById('edit-color');

        const name = (nameInput.value || '').trim();
        if (!name) {
          nameInput.focus();
          return;
        }

        const value = parseInt(valueInput.value, 10) || 0;
        const increment = Math.max(1, parseInt(incrementInput.value, 10) || 1);
        const color = /^#[0-9a-fA-F]{6}$/.test(colorInput.value)
          ? colorInput.value
          : PRESET_COLORS[4];

        if (id) {
          const counter = getCounterById(id);
          if (counter) {
            Object.assign(counter, { name, value, increment, color });
            updateState({ counters: state.counters });
          }
          location.hash = `#/counter/${id}`;
        } else {
          const newCounter = { id: generateId(), name, value, increment, color };
          state.counters.push(newCounter);
          updateState({ counters: state.counters });
          location.hash = '#/';
        }
        break;
      }
    }
  });

  // ── Init ──

  applyTheme();
  window.addEventListener('hashchange', router);
  router();
})();
