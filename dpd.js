// dpd.js - DPD单号截取功能
(function() {
  let dpdFeatureEnabled = true;

  chrome.storage.sync.get(
    { dpdFeatureEnabled: true },
    data => {
      dpdFeatureEnabled = data.dpdFeatureEnabled;
    }
  );

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleDpdFeature') {
      dpdFeatureEnabled = request.enabled;
      sendResponse({ status: 'DPD功能更新' });
    }
  });

  function handleDpdInput(event) {
    if (!dpdFeatureEnabled) return;
    const input = event.target;
    const match = input.value.match(/^%(\d{27})$/);
    if (match) {
      const extracted = match[1].substring(7, 21);
      input.value = extracted;
    }
  }

  document.addEventListener(
    'input',
    handleDpdInput,
    true
  );
})();
