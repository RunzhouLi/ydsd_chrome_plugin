// background.js

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    dpdFeatureEnabled: true,
    autoScanEnabled: true,
    shortcutFeatureEnabled: true,
    initInputEnabled: true,
    ecSyncCheckoutEnabled: true,
    rfidLoggerEnabled: true,
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background收到消息:', request, '来自:', sender);

  if (request.action === 'ecCheckout' && request.payload) {
    const { url, body } = request.payload;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      credentials: 'include'
    })
      .then(async (res) => {
        const text = await res.text();
        sendResponse({ ok: res.ok, status: res.status, body: text });
      })
      .catch((err) => {
        sendResponse({ error: err.message });
      });
    // 必须返回 true，表明异步 sendResponse
    return true;
  }

  return true;
});

