// RFID操作日志记录功能
(function() {
    console.log('rfidLogger.js脚本已加载');
    let rfidLoggerEnabled = true;
    let operationLogs = [];

    // 监听存储变化
    chrome.storage.sync.get({ rfidLoggerEnabled: true }, data => {
        rfidLoggerEnabled = data.rfidLoggerEnabled;
        console.log('RFID日志记录功能状态:', rfidLoggerEnabled);
    });

    // 监听来自popup的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('rfidLogger收到消息:', request);
        
        if (request.action === 'toggleRfidLogger') {
            rfidLoggerEnabled = request.enabled;
            console.log('RFID日志记录功能状态:', rfidLoggerEnabled);
            sendResponse({ status: 'RFID日志记录功能更新' });
        } else if (request.action === 'downloadRfidLogs') {
            downloadTodayLogs();
            sendResponse({ status: '开始下载今日日志' });
        }
        return true;
    });

    // 获取今日日期字符串 (YYYY-MM-DD)
    function getTodayDateString() {
        const today = new Date();
        return today.getFullYear() + '-' + 
               String(today.getMonth() + 1).padStart(2, '0') + '-' + 
               String(today.getDate()).padStart(2, '0');
    }

    // 获取当前时间字符串 (HH:MM:SS)
    function getCurrentTimeString() {
        const now = new Date();
        return String(now.getHours()).padStart(2, '0') + ':' + 
               String(now.getMinutes()).padStart(2, '0') + ':' + 
               String(now.getSeconds()).padStart(2, '0');
    }

    // 提取订单号 - 复用ecSyncCheckout的逻辑但增强查找能力
    function extractOrderNumber() {
        // 方法1: 从页面中查找带有"订单号"标签的元素
        const orderElements = Array.from(document.querySelectorAll('*')).filter(el => {
            const text = el.textContent || '';
            return text.includes('订单号:') || text.includes('订单编号:') || text.includes('Order:');
        });

        for (const el of orderElements) {
            const text = el.textContent.trim();
            // 匹配订单号格式
            const match = text.match(/(?:订单号[:：]|订单编号[:：]|Order[:：])\s*([A-Z0-9-]+)/i);
            if (match && match[1]) {
                return match[1].trim();
            }
        }

        // 方法2: 查找cell结构中的订单号 (来自ecSyncCheckout)
        const cells = document.querySelectorAll('.cell');
        for (const cell of cells) {
            const pOrder = Array.from(cell.querySelectorAll('p')).find(el => 
                el.textContent.startsWith('订单号:')
            );
            if (pOrder) {
                return pOrder.textContent.replace('订单号:', '').trim();
            }
        }

        // 方法3: 从输入框或表单中获取
        const inputs = document.querySelectorAll('input[value*="-"], input[placeholder*="订单"]');
        for (const input of inputs) {
            const value = input.value.trim();
            if (value && value.match(/^[A-Z0-9-]{10,}$/)) {
                return value;
            }
        }

        return '未找到订单号';
    }

    // 捕获页面上所有可能的反馈信息
    function capturePageFeedback() {
        const feedback = {
            alerts: [],
            dialogs: [],
            toasts: [],
            messages: [],
            errors: [],
            success: [],
            messageBox: [],  // 新增：系统提示弹窗
            general: []
        };
        
        // 捕获各种可能的弹窗和消息元素
        const selectors = {
            alerts: ['.el-alert', '.alert', '[role="alert"]'],
            dialogs: ['.el-dialog', '.modal', '.dialog'],
            toasts: ['.el-message', '.toast', '.notification', '.el-notification'],
            messages: ['.message', '.msg', '.feedback', '.result'],
            errors: ['.error', '.el-form-item__error', '.danger', '.text-danger'],
            success: ['.success', '.el-message--success', '.text-success'],
            messageBox: ['.el-message-box']  // 新增：Element UI 系统提示弹窗
        };

        // 遍历所有选择器类型
        Object.keys(selectors).forEach(type => {
            selectors[type].forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el.offsetParent !== null && el.textContent.trim()) { // 确保元素可见且有内容
                        const text = el.textContent.trim();
                        if (text.length > 0 && text.length < 1000) { // 避免过长的文本
                            feedback[type].push({
                                text: text,
                                className: el.className,
                                selector: selector
                            });
                        }
                    }
                });
            });
        });

        // 捕获页面上的其他重要信息
        const statusElements = document.querySelectorAll('.status, .state, .result, .response');
        statusElements.forEach(el => {
            const text = el.textContent.trim();
            if (text && text.length > 0 && text.length < 500) {
                feedback.general.push({
                    text: text,
                    className: el.className,
                    selector: '状态信息'
                });
            }
        });

        return feedback;
    }

    // 记录操作日志
    function logOperation(orderNumber, feedback) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            date: getTodayDateString(),
            time: getCurrentTimeString(),
            orderNumber: orderNumber,
            feedback: feedback,
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        // 添加到内存中的日志数组
        operationLogs.push(logEntry);
        
        // 同时存储到localStorage（作为备份）
        const todayKey = `rfid_logs_${getTodayDateString()}`;
        const existingLogs = JSON.parse(localStorage.getItem(todayKey) || '[]');
        existingLogs.push(logEntry);
        localStorage.setItem(todayKey, JSON.stringify(existingLogs));

        console.log('RFID操作已记录:', logEntry);
        
        // 如果消息队列存在，也推送一条消息
        if (window.msgQueue) {
            msgQueue.push(`📝 RFID操作已记录: ${orderNumber} (${getCurrentTimeString()})`);
        }
    }

    // 生成CSV内容
    function generateCSV(logs) {
        const headers = [
            '时间戳', '日期', '时间', '订单号', '反馈信息', 'URL'
        ];
        
        const csvRows = [headers.join(',')];
        
        logs.forEach(log => {
            const feedbackText = JSON.stringify(log.feedback).replace(/"/g, '""');
            const row = [
                log.timestamp,
                log.date,
                log.time,
                log.orderNumber,
                `"${feedbackText}"`,
                log.url
            ];
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }

    // 下载今日日志
    function downloadTodayLogs() {
        const todayKey = `rfid_logs_${getTodayDateString()}`;
        const todayLogs = JSON.parse(localStorage.getItem(todayKey) || '[]');
        
        if (todayLogs.length === 0) {
            alert('今日暂无RFID操作日志');
            return;
        }

        try {
            const csvContent = generateCSV(todayLogs);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `RFID操作日志_${getTodayDateString()}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                console.log(`下载了 ${todayLogs.length} 条RFID日志记录`);
                if (window.msgQueue) {
                    msgQueue.push(`📥 已下载 ${todayLogs.length} 条RFID日志记录`);
                }
            }
        } catch (error) {
            console.error('下载日志时出错:', error);
            alert('下载日志文件失败: ' + error.message);
        }
    }

    // 监听提交按钮点击
    function setupButtonListener() {
        // 使用事件委托监听按钮点击
        document.addEventListener('click', function(event) {
            if (!rfidLoggerEnabled) return;

            const button = event.target;
            
            // 检查是否为目标按钮
            const isTargetButton = (
                button.tagName === 'BUTTON' &&
                button.classList.contains('el-button') &&
                button.classList.contains('el-button--primary') &&
                button.querySelector('span') &&
                button.querySelector('span').textContent.includes('提交')
            ) || (
                // 也匹配span元素点击
                button.tagName === 'SPAN' &&
                button.textContent.includes('提交') &&
                button.closest('button.el-button--primary')
            );

            if (isTargetButton) {
                console.log('检测到RFID提交按钮点击');
                
                // 延迟捕获页面反馈，等待页面响应
                setTimeout(() => {
                    const orderNumber = extractOrderNumber();
                    const feedback = capturePageFeedback();
                    logOperation(orderNumber, feedback);
                }, 1000); // 1秒后捕获
                
                // 再次延迟捕获，以防页面响应较慢
                setTimeout(() => {
                    const orderNumber = extractOrderNumber();
                    const feedback = capturePageFeedback();
                    if (feedback.alerts.length > 0 || feedback.dialogs.length > 0 || 
                        feedback.toasts.length > 0 || feedback.messages.length > 0) {
                        logOperation(orderNumber + '_delayed', feedback);
                    }
                }, 3000); // 3秒后再次捕获
            }
        }, true); // 使用捕获阶段
    }

    // DOM准备后初始化
    function onDomReady(cb) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', cb);
        } else {
            cb();
        }
    }

    // 暴露到全局作用域
    window.rfidLogger = {
        isEnabled: () => rfidLoggerEnabled,
        downloadLogs: downloadTodayLogs,
        getLogs: () => {
            const todayKey = `rfid_logs_${getTodayDateString()}`;
            return JSON.parse(localStorage.getItem(todayKey) || '[]');
        }
    };

    // 初始化
    onDomReady(() => {
        console.log('RFID日志记录器初始化完成');
        setupButtonListener();
    });

    // 调试信息
    console.log('RFID日志记录模块已初始化', {
        enabled: rfidLoggerEnabled,
        currentUrl: window.location.href,
        date: getTodayDateString()
    });
})();