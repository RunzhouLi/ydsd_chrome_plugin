(function () {
    let initInputEnabled = true;

    chrome.storage.sync.get({ initInputEnabled: true }, data => {
        initInputEnabled = data.initInputEnabled;
        if (initInputEnabled) startInitInput();
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'toggleInitInput') {
            initInputEnabled = request.enabled;
            if (initInputEnabled) startInitInput();
            else stopInitInput();
            sendResponse && sendResponse({ status: '初始化输入框功能更新' });
        }
    });

    let dialogObserver = null;
    let bodyObserver = null;

    function findTargetOverlay() {
        const titles = document.querySelectorAll('span.el-dialog__title');
        for (const titleElement of titles) {
            if (titleElement.textContent.trim() === 'rfid绑定订单产品') {
                const overlay = titleElement.closest('div.el-overlay');
                if (overlay) {
                    return overlay;
                }
            }
        }
        return null;
    }

    function findTrackInput() {
        const label = Array.from(document.querySelectorAll('label.el-form-item__label'))
            .find(lab => lab.textContent.trim() === '跟踪号');
        if (!label) {
            return null;
        }
        const inputId = label.getAttribute('for');
        if (inputId) {
            const input = document.getElementById(inputId);
            if (input && input.classList.contains('el-input__inner')) {
                return input;
            }
        }
        const formItem = label.closest('.el-form-item');
        if (formItem) {
            const input = formItem.querySelector('input.el-input__inner');
            if (input) {
                return input;
            }
        }
        return null;
    }

    function clearAndFocusInput() {
        const input = findTrackInput();
        if (input) {
            input.value = '';
            input.focus();
        }
    }

    function onDialogOverlayStyleChange(mutationsList, observer) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const overlayElement = mutation.target;
                if (overlayElement.style.display === 'none') {
                    clearAndFocusInput();
                }
            }
        }
    }

    function startInitInput() {
        stopInitInput();

        const setupDialogObserver = (overlayEl) => {
            if (dialogObserver) {
                dialogObserver.disconnect();
            }
            dialogObserver = new MutationObserver(onDialogOverlayStyleChange);
            dialogObserver.observe(overlayEl, { attributes: true, attributeFilter: ['style'] });

            if (overlayEl.style.display === 'none') {
                clearAndFocusInput();
            }
        };

        const existingOverlay = findTargetOverlay();
        if (existingOverlay) {
            setupDialogObserver(existingOverlay);
            if (bodyObserver) { bodyObserver.disconnect(); bodyObserver = null; }
            return;
        }

        bodyObserver = new MutationObserver((mutationsList, observer) => {
            const newlyFoundOverlay = findTargetOverlay();
            if (newlyFoundOverlay) {
                if (bodyObserver) {
                    bodyObserver.disconnect();
                    bodyObserver = null;
                }
                setupDialogObserver(newlyFoundOverlay);
            }
        });

        bodyObserver.observe(document.body, { childList: true, subtree: true });
    }

    function stopInitInput() {
        if (dialogObserver) {
            dialogObserver.disconnect();
            dialogObserver = null;
        }
        if (bodyObserver) {
            bodyObserver.disconnect();
            bodyObserver = null;
        }
    }
})();
