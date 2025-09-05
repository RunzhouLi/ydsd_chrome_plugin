(function () {
    // 立即输出加载确认
    console.log('[InitInput] initInput.js脚本开始加载');
    
    let initInputEnabled = true;
    let debugMode = true; // 添加调试模式

    // 调试日志函数
    function debugLog(message, ...args) {
        if (debugMode) {
            console.log('[InitInput]', message, ...args);
        }
    }

    // 添加错误处理
    try {
        console.log('[InitInput] 开始初始化chrome存储获取');
        chrome.storage.sync.get({ initInputEnabled: true }, data => {
            console.log('[InitInput] chrome.storage.sync.get 回调执行', data);
            initInputEnabled = data.initInputEnabled;
            debugLog('初始化状态:', initInputEnabled);
            if (initInputEnabled) {
                debugLog('准备启动startInitInput');
                startInitInput();
            }
        });
    } catch (error) {
        console.error('[InitInput] Chrome存储获取错误:', error);
    }    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        try {
            console.log('[InitInput] 收到消息:', request);
            if (request.action === 'toggleInitInput') {
                initInputEnabled = request.enabled;
                debugLog('切换状态:', initInputEnabled);
                if (initInputEnabled) startInitInput();
                else stopInitInput();
                sendResponse && sendResponse({ status: '初始化输入框功能更新' });
            }
        } catch (error) {
            console.error('[InitInput] 消息处理错误:', error);
        }
    });
    
    let dialogObserver = null;
    let bodyObserver = null;

    function findTargetDialog() {
        // 查找标题为"RFID绑定订单产品"的对话框
        const dialogs = document.querySelectorAll('.el-dialog');
        debugLog('找到对话框数量:', dialogs.length);
        
        for (const dialog of dialogs) {
            const titleElement = dialog.querySelector('.el-dialog__title');
            if (titleElement) {
                const titleText = titleElement.textContent.trim();
                debugLog('检查对话框标题:', titleText);
                
                if (titleText === 'RFID绑定订单产品' || titleText === 'rfid绑定订单产品') {
                    debugLog('找到目标对话框');
                    return dialog;
                }
            }
        }
        debugLog('未找到目标对话框');
        return null;
    }

    function findTargetOverlay() {
        const titles = document.querySelectorAll('span.el-dialog__title');
        debugLog('找到标题元素数量:', titles.length);
        
        for (const titleElement of titles) {
            const titleText = titleElement.textContent.trim();
            debugLog('检查标题:', titleText);
            
            if (titleText === 'RFID绑定订单产品' || titleText === 'rfid绑定订单产品') {
                const overlay = titleElement.closest('div.el-overlay');
                if (overlay) {
                    debugLog('找到目标overlay');
                    return overlay;
                }
            }
        }
        debugLog('未找到目标overlay');
        return null;
    }function findTrackInput() {
        // 方法1：通过占位符文本精确查找
        const allInputs = document.querySelectorAll('input.el-input__inner');
        debugLog('页面中所有输入框数量:', allInputs.length);
        
        for (const input of allInputs) {
            const placeholder = input.getAttribute('placeholder');
            if (placeholder === '请输入跟踪号') {
                debugLog('通过占位符精确匹配找到输入框:', input.id);
                return input;
            }
        }

        // 方法2：在rfid绑定对话框中查找
        const overlay = findTargetOverlay();
        if (overlay) {
            const inputs = overlay.querySelectorAll('input.el-input__inner');
            debugLog('在overlay中找到输入框数量:', inputs.length);
            
            // 先尝试通过占位符查找
            for (const input of inputs) {
                const placeholder = input.getAttribute('placeholder');
                debugLog('检查输入框占位符:', placeholder);
                if (placeholder && (placeholder.includes('跟踪号') || placeholder === '请输入跟踪号')) {
                    debugLog('通过占位符找到输入框:', input.id);
                    return input;
                }
            }
            
            // 如果没有找到带占位符的，返回第一个输入框
            if (inputs.length > 0) {
                debugLog('返回第一个输入框作为默认:', inputs[0].id);
                return inputs[0];
            }
        }

        // 方法3：通过标签文本查找（备用方案）
        const label = Array.from(document.querySelectorAll('label.el-form-item__label'))
            .find(lab => lab.textContent.trim() === '跟踪号');
        
        if (label) {
            debugLog('找到跟踪号标签');
            const inputId = label.getAttribute('for');
            if (inputId) {
                const input = document.getElementById(inputId);
                if (input && input.classList.contains('el-input__inner')) {
                    debugLog('通过标签ID找到输入框:', inputId);
                    return input;
                }
            }
            
            const formItem = label.closest('.el-form-item');
            if (formItem) {
                const input = formItem.querySelector('input.el-input__inner');
                if (input) {
                    debugLog('通过表单项找到输入框:', input.id);
                    return input;
                }
            }
        }

        debugLog('未找到跟踪号输入框');
        return null;
    }    function clearAndFocusInput() {
        const input = findTrackInput();
        if (input) {
            debugLog('清空并聚焦输入框, ID:', input.id);
            
            // 先清空值
            input.value = '';
            
            // 触发多个事件以确保Vue.js等框架能够检测到变化
            const events = ['input', 'change', 'keyup', 'blur'];
            events.forEach(eventType => {
                const event = new Event(eventType, { bubbles: true });
                input.dispatchEvent(event);
            });
            
            // 聚焦输入框
            input.focus();
            
            // 验证是否成功清空
            setTimeout(() => {
                if (input.value === '') {
                    debugLog('输入框清空成功');
                } else {
                    debugLog('输入框清空失败，当前值:', input.value);
                }
            }, 50);
        } else {
            debugLog('清空输入框失败：未找到输入框');
        }
    }function onDialogOverlayStyleChange(mutationsList, observer) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const overlayElement = mutation.target;
                const currentDisplay = overlayElement.style.display;
                debugLog('Overlay显示状态变化:', currentDisplay);
                
                // 当对话框关闭时（display变为none），清空并聚焦输入框
                if (currentDisplay === 'none') {
                    debugLog('对话框关闭，准备清空输入框');
                    // 延迟执行以确保对话框完全关闭
                    setTimeout(() => {
                        clearAndFocusInput();
                    }, 200);
                }
            }
        }
    }

    function onDialogRemoved(mutationsList, observer) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                for (const removedNode of mutation.removedNodes) {
                    if (removedNode.nodeType === Node.ELEMENT_NODE) {
                        // 检查是否是目标对话框被移除
                        if (removedNode.classList && removedNode.classList.contains('el-dialog')) {
                            const titleElement = removedNode.querySelector('.el-dialog__title');
                            if (titleElement) {
                                const titleText = titleElement.textContent.trim();
                                if (titleText === 'RFID绑定订单产品' || titleText === 'rfid绑定订单产品') {
                                    debugLog('RFID对话框被移除，清空输入框');
                                    setTimeout(() => {
                                        clearAndFocusInput();
                                    }, 200);
                                }
                            }
                        }
                        
                        // 检查是否是包含目标对话框的overlay被移除
                        if (removedNode.classList && removedNode.classList.contains('el-overlay')) {
                            const titleElement = removedNode.querySelector('.el-dialog__title');
                            if (titleElement) {
                                const titleText = titleElement.textContent.trim();
                                if (titleText === 'RFID绑定订单产品' || titleText === 'rfid绑定订单产品') {
                                    debugLog('包含RFID对话框的overlay被移除，清空输入框');
                                    setTimeout(() => {
                                        clearAndFocusInput();
                                    }, 200);
                                }
                            }
                        }
                    }
                }
            }
        }
    }    function startInitInput() {
        debugLog('开始初始化输入框功能');
        stopInitInput();

        const setupDialogObserver = (overlayEl) => {
            debugLog('设置对话框观察器');
            if (dialogObserver) {
                dialogObserver.disconnect();
            }
            dialogObserver = new MutationObserver(onDialogOverlayStyleChange);
            dialogObserver.observe(overlayEl, { attributes: true, attributeFilter: ['style'] });
        };

        const existingOverlay = findTargetOverlay();
        if (existingOverlay) {
            debugLog('找到现有的overlay');
            setupDialogObserver(existingOverlay);
        }

        // 始终监听DOM变化，以便捕获新出现的对话框和对话框的移除
        debugLog('开始监听DOM变化');
        bodyObserver = new MutationObserver((mutationsList, observer) => {
            // 检查新添加的对话框
            const newlyFoundOverlay = findTargetOverlay();
            if (newlyFoundOverlay && !dialogObserver) {
                debugLog('在DOM变化中找到新的overlay');
                setupDialogObserver(newlyFoundOverlay);
            }

            // 检查对话框的移除
            onDialogRemoved(mutationsList, observer);
        });

        bodyObserver.observe(document.body, { 
            childList: true, 
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    }function stopInitInput() {
        debugLog('停止初始化输入框功能');
        if (dialogObserver) {
            dialogObserver.disconnect();
            dialogObserver = null;
        }
        if (bodyObserver) {
            bodyObserver.disconnect();
            bodyObserver = null;
        }
    }    // 添加全局调试函数（仅在开发模式下）
    if (debugMode) {
        window.initInputDebug = {
            findTargetOverlay,
            findTargetDialog,
            findTrackInput,
            clearAndFocusInput,
            startInitInput,
            stopInitInput,
            getStatus: () => ({
                enabled: initInputEnabled,
                dialogObserver: !!dialogObserver,
                bodyObserver: !!bodyObserver
            }),
            // 新增：列出所有可能的输入框
            listAllInputs: () => {
                const allInputs = document.querySelectorAll('input.el-input__inner');
                const inputList = Array.from(allInputs).map(input => ({
                    id: input.id,
                    placeholder: input.getAttribute('placeholder'),
                    value: input.value,
                    className: input.className
                }));
                console.log('所有输入框:', inputList);
                return inputList;
            },
            // 新增：检查当前对话框状态
            checkDialogStatus: () => {
                const overlay = findTargetOverlay();
                const dialog = findTargetDialog();
                const result = {
                    overlay: overlay ? {
                        found: true,
                        display: overlay.style.display,
                        visible: overlay.style.display !== 'none'
                    } : { found: false },
                    dialog: dialog ? {
                        found: true,
                        visible: dialog.style.display !== 'none'
                    } : { found: false }
                };
                console.log('对话框状态:', result);
                return result;
            },
            // 新增：列出所有对话框
            listAllDialogs: () => {
                const dialogs = document.querySelectorAll('.el-dialog');
                const dialogList = Array.from(dialogs).map(dialog => {
                    const titleElement = dialog.querySelector('.el-dialog__title');
                    return {
                        title: titleElement ? titleElement.textContent.trim() : '无标题',
                        display: dialog.style.display || 'default',
                        visible: dialog.style.display !== 'none'
                    };
                });
                console.log('所有对话框:', dialogList);
                return dialogList;
            }        };
        debugLog('调试函数已添加到 window.initInputDebug');
    }

    console.log('[InitInput] initInput.js脚本加载完成');
    
})();
