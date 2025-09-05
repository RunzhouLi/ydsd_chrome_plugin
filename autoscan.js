// autoscan.js
(function() {
  let autoScanEnabled = true;
  chrome.storage.sync.get({ autoScanEnabled: true }, data => {
    autoScanEnabled = data.autoScanEnabled;
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleAutoScan') {
      autoScanEnabled = request.enabled;
      sendResponse({ status: '自动扫描更新' });
    }
  });

  function clickStartScanInDialog(dialog) {
    const btn = dialog.querySelector('button.el-button--success.el-button--small');
    if (btn && autoScanEnabled) {
      btn.click();
    }
  }

  const autoScanObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          if (node.matches('.el-dialog')) {
            clickStartScanInDialog(node);
          } else if (node.querySelectorAll) {
            node.querySelectorAll('.el-dialog').forEach(dialog => clickStartScanInDialog(dialog));
          }
        }
      });
    });
  });
  autoScanObserver.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('DOMContentLoaded', () => {
    if (!autoScanEnabled) return;
    document.querySelectorAll('.el-dialog').forEach(dialog => clickStartScanInDialog(dialog));
  });
})();
