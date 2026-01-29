// Changelog Module
// Handles changelog modal display and rendering

export function setupChangelogModal() {
  const infoButton = document.getElementById('changelog-info');
  const modal = document.getElementById('changelog-modal');
  const closeButton = document.getElementById('changelog-close');
  const content = document.getElementById('changelog-content');

  if (!infoButton || !modal || !closeButton || !content) {
    return;
  }

  const closeModal = () => {
    modal.classList.add('hidden');
  };

  const openModal = async () => {
    modal.classList.remove('hidden');
    content.innerHTML = '<p class="loading">Loading changelog...</p>';
    try {
      const response = await fetch(chrome.runtime.getURL('CHANGELOG.json'));
      if (!response.ok) {
        throw new Error('Failed to load changelog');
      }
      const data = await response.json();
      renderChangelog(data, content);
    } catch (error) {
      content.innerHTML = '<p class="loading">Unable to load changelog.</p>';
    }
  };

  infoButton.addEventListener('click', openModal);
  closeButton.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target?.dataset?.close === 'true') {
      closeModal();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });
}

function renderChangelog(data, container) {
  if (!data || !Array.isArray(data.versions) || data.versions.length === 0) {
    container.innerHTML = '<p class="loading">No changelog data available.</p>';
    return;
  }

  const html = data.versions.map((version) => {
    const sections = version.sections || {};
    const sectionHtml = Object.keys(sections).map((sectionTitle) => {
      const items = sections[sectionTitle] || [];
      if (!items.length) {
        return '';
      }
      const listItems = items.map(item => `<li>${item}</li>`).join('');
      return `
        <div class="changelog-section">
          <h4>${sectionTitle}</h4>
          <ul>${listItems}</ul>
        </div>
      `;
    }).join('');

    return `
      <div class="changelog-version">
        <h3>${version.version}</h3>
        ${version.date ? `<div class="changelog-date">${version.date}</div>` : ''}
        ${sectionHtml}
      </div>
    `;
  }).join('');

  container.innerHTML = html || '<p class="loading">No changelog data available.</p>';
}
