// background.js

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    dpdFeatureEnabled: true,
    autoScanEnabled: true,
    shortcutFeatureEnabled: true,
    initInputEnabled: true,
    ecSyncCheckoutEnabled: true,
    rfidLoggerEnabled: true,
    // automationEnabled: true, // Removed
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background收到消息:', request, '来自:', sender);
  
  // The following block for "runAutomation" seems to be a remnant
  // and can be removed if it's no longer used by any other part of your extension.
  // For now, I'm leaving it commented out. If you confirm it's unused, you can delete it.
  /*
  if (request.action === "runAutomation") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { greeting: "你好，来自后台脚本！" });
      }
    });
    sendResponse({ status: "自动化任务已启动" });
  }
  */

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

chrome.commands.onCommand.addListener((command) => {
  if (command === "_execute_action") {
  }
});
