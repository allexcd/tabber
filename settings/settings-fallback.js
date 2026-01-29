// Fallback script for basic UI interaction
// Only handles visual provider switching - main functionality is in settings.js module

document.addEventListener('DOMContentLoaded', function() {
  function showProviderSettings(provider) {
    document.querySelectorAll('.provider-settings').forEach(function(section) {
      section.classList.remove('active');
    });
    var settingsSection = document.getElementById(provider + '-settings');
    if (settingsSection) {
      settingsSection.classList.add('active');
    }
  }

  // Setup provider radio listeners for visual switching only
  document.querySelectorAll('input[name="provider"]').forEach(function(radio) {
    radio.addEventListener('change', function(e) {
      showProviderSettings(e.target.value);
    });
  });

  // Show default provider settings (claude)
  var defaultProvider = document.querySelector('input[name="provider"]:checked');
  if (defaultProvider) {
    showProviderSettings(defaultProvider.value);
  } else {
    var claudeRadio = document.querySelector('input[name="provider"][value="claude"]');
    if (claudeRadio) {
      claudeRadio.checked = true;
      showProviderSettings('claude');
    }
  }
});
