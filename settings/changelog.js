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
    content.innerHTML = '<p class="loading">Loading release notes...</p>';
    try {
      const response = await fetch(chrome.runtime.getURL('CHANGELOG.json'));
      if (!response.ok) {
        throw new Error('Failed to load release notes');
      }
      const data = await response.json();
      renderChangelog(data, content);
    } catch (error) {
      content.innerHTML = '<p class="loading">Unable to load release notes.</p>';
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
    container.innerHTML = '<p class="loading">No release notes data available.</p>';
    return;
  }

  const currentVersion = normalizeVersion(chrome.runtime.getManifest().version);
  const releaseNotes = data.versions.filter(
    (version) => normalizeVersion(version.version) === currentVersion
  );

  if (releaseNotes.length === 0) {
    container.innerHTML = '<p class="loading">No release notes available for this version.</p>';
    return;
  }

  const html = releaseNotes
    .map((version) => {
      const sections = version.sections || {};
      const sectionHtml = Object.keys(sections)
        .map((sectionTitle) => {
          const items = sections[sectionTitle] || [];
          if (!items.length) {
            return '';
          }
          const listItems = items.map((item) => `<li>${item}</li>`).join('');
          return `
        <div class="changelog-section">
          <h4>${sectionTitle}</h4>
          <ul>${listItems}</ul>
        </div>
      `;
        })
        .join('');

      return `
      <div class="changelog-version">
        <h3>${version.version}</h3>
        ${version.date ? `<div class="changelog-date">${version.date}</div>` : ''}
        ${sectionHtml}
      </div>
    `;
    })
    .join('');

  container.innerHTML = html || '<p class="loading">No release notes data available.</p>';
}

function normalizeVersion(version) {
  return String(version || '')
    .replace(/^v/i, '')
    .trim();
}
