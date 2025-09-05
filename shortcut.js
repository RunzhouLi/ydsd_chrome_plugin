// shortcut.js - 管理对话框快捷键功能

(function () {
    let shortcutEnabled = true;
    let isUpdating = false;

    // Toast: 强制提交中…
    const FORCE_TOAST_ID = 'ydsd-force-submitting-toast';
    function showForceSubmittingToast() {
        if (document.getElementById(FORCE_TOAST_ID)) return;
        const el = document.createElement('div');
        el.id = FORCE_TOAST_ID;
        el.textContent = '强制提交中…';
        el.setAttribute('role', 'status');
        el.style.position = 'fixed';
        el.style.top = '16px';
        el.style.right = '20px';
        el.style.zIndex = '999999';
        el.style.background = 'rgba(0,0,0,0.75)';
        el.style.color = '#fff';
        el.style.padding = '6px 10px';
        el.style.borderRadius = '6px';
        el.style.fontSize = '12px';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        el.style.pointerEvents = 'none';
        document.body.appendChild(el);
    }
    function hideForceSubmittingToast() {
        const el = document.getElementById(FORCE_TOAST_ID);
        if (el && el.remove) el.remove();
    }

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
        // 更新“强制提交”按钮文本，增加快捷键提示
        const forceSubmitBtn = dialog.querySelector('footer.el-dialog__footer button.el-button--danger.el-button--default');
        if (forceSubmitBtn) {
            const span = forceSubmitBtn.querySelector('span');
            if (span) {
                const baseForceText = "强制提交";
                if (span.textContent.trim().includes(baseForceText)) {
                    let newTextContent = shortcutEnabled ? baseForceText + '（CTRL+ENTER）' : baseForceText;
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
        // ESC -> 允许原逻辑弹出确认框，并自动点击“确定”
        if (key === 'Escape' || key === 'Esc') {
            const visibleDialogs = Array.from(document.querySelectorAll('.el-dialog'))
                .filter(d => d.offsetParent !== null);
            if (visibleDialogs.length) {
                const autoConfirm = () => {
                    // 直接尝试点击已存在的确认框
                    const boxes = Array.from(document.querySelectorAll('.el-message-box'))
                        .filter(el => el.offsetParent !== null);
                    const box = boxes[boxes.length - 1];
                    if (!box) return false;
                    const okBtn = Array.from(box.querySelectorAll('.el-message-box__btns .el-button'))
                        .find(btn => btn.offsetParent !== null && (btn.classList.contains('el-button--primary') || /确定|OK|Confirm/i.test(btn.textContent)));
                    if (okBtn) {
                        okBtn.click();
                        return true;
                    }
                    return false;
                };

                // 1) 先尝试立即点击（如果确认框已存在）
                if (autoConfirm()) return; // 不阻止默认，让原应用处理 ESC

                // 2) 监听 DOM 变化，出现确认框后自动点击“确定”
                const mo = new MutationObserver(() => {
                    if (autoConfirm()) {
                        mo.disconnect();
                    }
                });
                mo.observe(document.body, { childList: true, subtree: true });
                // 3) 最长等待 2 秒，避免常驻监听
                setTimeout(() => mo.disconnect(), 2000);
            }
            // 不阻止默认和冒泡：让业务代码先弹出确认框
        }
        if (event.ctrlKey && key === 'Enter') {
            const forceSubmitBtn = Array.from(document.querySelectorAll('.el-dialog footer.el-dialog__footer button.el-button--danger.el-button--default'))
                .find(btn => btn.offsetParent !== null && btn.textContent.includes('强制提交'));
            if (forceSubmitBtn) {
                event.preventDefault();

                // 锁定当前最上层对话框，用于判断何时关闭
                const visibleDialogs = Array.from(document.querySelectorAll('.el-dialog'))
                    .filter(d => d.offsetParent !== null);
                const targetDialog = visibleDialogs[visibleDialogs.length - 1] || null;
                const targetWrapper = targetDialog ? (targetDialog.closest('.el-overlay, .el-overlay-dialog, .el-dialog__wrapper') || targetDialog) : null;

                forceSubmitBtn.click();

                // 显示“强制提交中…”提示，直到对话框关闭
                showForceSubmittingToast();

                const isTargetVisible = () => !!(targetWrapper && document.body.contains(targetWrapper) && targetWrapper.offsetParent !== null);

                let closed = false;
                const cleanup = () => {
                    if (closed) return;
                    closed = true;
                    hideForceSubmittingToast();
                    try { moDialog.disconnect(); } catch (e) {}
                    try { clearInterval(iv); } catch (e) {}
                    try { clearTimeout(tt); } catch (e) {}
                };

                const finishIfClosed = () => { if (!isTargetVisible()) cleanup(); };
                const moDialog = new MutationObserver(finishIfClosed);
                moDialog.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
                const iv = setInterval(finishIfClosed, 300);
                const tt = setTimeout(cleanup, 10000); // 最长显示 10 秒，防止卡住

                // 提交后如出现消息框（el-message-box），自动关闭
                const tryCloseMessageBox = () => {
                    const boxes = Array.from(document.querySelectorAll('.el-message-box'))
                        .filter(el => el.offsetParent !== null);
                    const box = boxes[boxes.length - 1];
                    if (!box) return false;
                    // 优先点击主要按钮；否则匹配文案；再不行点右上角关闭
                    let btn = box.querySelector('.el-message-box__btns .el-button--primary');
                    if (!btn) {
                        btn = Array.from(box.querySelectorAll('.el-message-box__btns .el-button'))
                            .find(b => /确定|OK|Confirm|是|Yes|关闭|Close/i.test(b.textContent));
                    }
                    if (!btn) btn = box.querySelector('.el-message-box__headerbtn');
                    if (btn) {
                        btn.click();
                        return true;
                    }
                    return false;
                };

                // 1) 若已存在则立即关闭
                if (tryCloseMessageBox()) return;
                // 2) 监听 2 秒内出现的消息框并关闭
                const moMsg = new MutationObserver(() => {
                    if (tryCloseMessageBox()) {
                        moMsg.disconnect();
                    }
                });
                moMsg.observe(document.body, { childList: true, subtree: true });
                setTimeout(() => moMsg.disconnect(), 2000);
            }
        }
        else if (key === 's' || key === 'S') {
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
