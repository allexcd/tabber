// Custom Grouping Rules Page

import { secureStorage } from '../services/secure-storage.js';
import { logger } from '../services/logger.js';

const RULE_COLORS = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange', 'grey'];
let isDirty = false;

document.addEventListener('DOMContentLoaded', async () => {
  await loadRules();
  setupEventListeners();
});

function markDirty() {
  if (isDirty) return;
  isDirty = true;
  const btn = document.getElementById('save-rules-btn');
  btn.disabled = false;
  btn.textContent = 'Save Rules';
}

function markClean() {
  isDirty = false;
  const btn = document.getElementById('save-rules-btn');
  btn.disabled = true;
  btn.textContent = 'Saved!';
  setTimeout(() => {
    btn.textContent = 'Save Rules';
  }, 1500);
}

async function loadRules() {
  const data = await secureStorage.get(['customRules']);
  const rules = data.customRules || [];
  const container = document.getElementById('rules-list');
  container.innerHTML = '';
  for (const rule of rules) {
    addRuleRow(rule);
  }
}

function addRuleRow(rule = null) {
  const id = rule?.id || crypto.randomUUID();
  const container = document.getElementById('rules-list');

  const row = document.createElement('div');
  row.className = 'rule-row';
  row.dataset.ruleId = id;

  const patternInput = document.createElement('input');
  patternInput.type = 'text';
  patternInput.placeholder = 'URL pattern (e.g. github.com)';
  patternInput.className = 'rule-pattern';
  patternInput.value = rule?.urlPattern || '';

  const groupInput = document.createElement('input');
  groupInput.type = 'text';
  groupInput.placeholder = 'Group name';
  groupInput.className = 'rule-group-name';
  groupInput.value = rule?.groupName || '';

  const colorSelect = document.createElement('select');
  colorSelect.className = 'rule-color';
  for (const color of RULE_COLORS) {
    const opt = document.createElement('option');
    opt.value = color;
    opt.textContent = color.charAt(0).toUpperCase() + color.slice(1);
    colorSelect.appendChild(opt);
  }
  colorSelect.value = rule?.color || 'blue';

  const switchLabel = document.createElement('label');
  switchLabel.className = 'switch rule-switch';
  switchLabel.title = 'Enable or disable this rule';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'rule-enabled';
  checkbox.checked = rule?.enabled ?? false;
  const slider = document.createElement('span');
  slider.className = 'slider';
  switchLabel.appendChild(checkbox);
  switchLabel.appendChild(slider);

  const moveUpBtn = document.createElement('button');
  moveUpBtn.className = 'btn icon-btn rule-move-up';
  moveUpBtn.textContent = '↑';
  moveUpBtn.title = 'Move rule up';

  const moveDownBtn = document.createElement('button');
  moveDownBtn.className = 'btn icon-btn rule-move-down';
  moveDownBtn.textContent = '↓';
  moveDownBtn.title = 'Move rule down';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn danger rule-delete';
  deleteBtn.textContent = 'X';
  deleteBtn.title = 'Delete rule';

  moveUpBtn.addEventListener('click', () => {
    const prev = row.previousElementSibling;
    if (prev) {
      container.insertBefore(row, prev);
      saveRules({ silent: true });
    }
  });

  moveDownBtn.addEventListener('click', () => {
    const next = row.nextElementSibling;
    if (next) {
      container.insertBefore(next, row);
      saveRules({ silent: true });
    }
  });

  deleteBtn.addEventListener('click', () => {
    row.remove();
    saveRules({ silent: true });
  });

  checkbox.addEventListener('change', () => saveRules({ silent: true }));

  patternInput.addEventListener('input', markDirty);
  groupInput.addEventListener('input', markDirty);
  colorSelect.addEventListener('change', markDirty);

  row.appendChild(patternInput);
  row.appendChild(groupInput);
  row.appendChild(colorSelect);
  row.appendChild(switchLabel);
  row.appendChild(moveUpBtn);
  row.appendChild(moveDownBtn);
  row.appendChild(deleteBtn);
  container.appendChild(row);

  patternInput.focus();
}

async function saveRules({ silent = false } = {}) {
  const rows = document.querySelectorAll('.rule-row');
  const rules = [];
  for (const row of rows) {
    const urlPattern = row.querySelector('.rule-pattern').value.trim();
    const groupName = row.querySelector('.rule-group-name').value.trim();
    const color = row.querySelector('.rule-color').value;
    const enabled = row.querySelector('.rule-enabled').checked;
    const id = row.dataset.ruleId;
    rules.push({ id, urlPattern, groupName, color, enabled });
  }

  try {
    await secureStorage.set({ customRules: rules });
    logger.log('Custom rules saved:', rules.length);
    if (!silent) {
      markClean();
    }
  } catch (error) {
    logger.error('Failed to save custom rules:', error);
  }
}

function setupEventListeners() {
  document.getElementById('add-rule-btn').addEventListener('click', () => {
    addRuleRow();
    markDirty();
  });

  document.getElementById('save-rules-btn').addEventListener('click', () => {
    saveRules();
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}
