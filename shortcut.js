// shortcut.js - 管理对话框快捷键功能

(function () {
    let shortcutEnabled = true;
    let isUpdating = false;

    chrome.storage.sync.get({ shortcutFeatureEnabled: true }, data => {
        shortcutEnabled = data.shortcutFeatureEnabled;
        if (shortcutEnabled) {
            updateAllDialogs();
        }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'toggleShortcut') {
            chrome.storage.sync.set({ shortcutFeatureEnabled: request.enabled }, () => {
                shortcutEnabled = request.enabled;
                updateAllDialogs();
                sendResponse({ status: '快捷键状态已更新' });
            });
        }
        return true;
    });

    function updateAllDialogs() {
        if (isUpdating) return;

        isUpdating = true;
        document.querySelectorAll('.el-dialog').forEach(updateDialogButtons);
        setTimeout(() => { isUpdating = false; }, 100);
    }

    function updateDialogButtons(dialog) {
        if (!dialog) return;

        const mainScanButton = dialog.querySelector('button.el-button--success.el-button--small');
        const endScanTriggerButton = Array.from(dialog.querySelectorAll('button.el-button--primary.el-button--small'))
            .find(btn => btn.querySelector('span')?.textContent.includes('结束扫描'));

        if (mainScanButton) {
            const span = mainScanButton.querySelector('span');
            if (span) {
                let targetText;
                const isEndScanTriggerButtonVisible = endScanTriggerButton && endScanTriggerButton.style.display !== 'none';

                if (isEndScanTriggerButtonVisible) {
                    targetText = "停止扫描";
                } else {
                    targetText = "开始扫描";
                }

                let newTextContent = shortcutEnabled ? targetText + '（S）' : targetText;
                if (span.textContent !== newTextContent) {
                    span.textContent = newTextContent;
                }
            }
        }

        const submitBtn = dialog.querySelector('footer.el-dialog__footer button.el-button--primary.el-button--default');
        if (submitBtn) {
            const span = submitBtn.querySelector('span');
            if (span) {
                const baseSubmitText = "提交";
                if (span.textContent.trim().startsWith(baseSubmitText)) {
                    let newTextContent = shortcutEnabled ? baseSubmitText + '（ENTER）' : baseSubmitText;
                    if (span.textContent !== newTextContent) {
                        span.textContent = newTextContent;
                    }
                }
            }
        }
    }

    const observer = new MutationObserver((mutations) => {
        if (!shortcutEnabled || isUpdating) return;
        let shouldUpdate = false;
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length) {
                shouldUpdate = true;
                break;
            }
            if (mutation.type === 'attributes' &&
                (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                const target = mutation.target;
                if (target.closest && target.closest('.el-dialog')) {
                    shouldUpdate = true;
                    break;
                }
            }
        }
        if (shouldUpdate) {
            setTimeout(updateAllDialogs, 50);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateAllDialogs);
    } else {
        updateAllDialogs();
    }

    document.addEventListener('keydown', event => {
        if (!shortcutEnabled) return;
        const key = event.key;
        if (key === 's' || key === 'S') {
            const scanBtn = Array.from(document.querySelectorAll('.el-dialog button.el-button--success.el-button--small'))
                .find(btn => btn.offsetParent !== null);
            if (scanBtn) scanBtn.click();
        }
        else if (key === 'Enter') {
            const submitBtn = Array.from(document.querySelectorAll('.el-dialog footer.el-dialog__footer button.el-button--primary.el-button--default'))
                .find(btn => btn.offsetParent !== null && btn.textContent.includes('提交'));
            if (submitBtn) submitBtn.click();
        }
    });
})();
