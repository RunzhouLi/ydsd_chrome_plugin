// 易仓同步签出功能脚本

(function() {
    console.log('ecSyncCheckout.js脚本已加载');
    let ecSyncCheckoutEnabled = true;

    // 监听存储变化
    chrome.storage.sync.get({ ecSyncCheckoutEnabled: true }, data => {
        ecSyncCheckoutEnabled = data.ecSyncCheckoutEnabled;
    });    // 监听来自popup的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('ecSyncCheckout收到消息:', request);
        
        if (request.action === 'toggleEcSyncCheckout') {
            ecSyncCheckoutEnabled = request.enabled;
            console.log('易仓同步签出功能状态:', ecSyncCheckoutEnabled);
            sendResponse({ status: '易仓同步签出功能更新' });
        }
        return true; // 保持消息通道开放
    });    // 全新实现：最小、同源、凭证自动处理
    function sendEcSyncCheckout(orderCode, { force = 0, csrfToken = '' } = {}) {
        if (!orderCode) {
            console.warn('orderCode 不能为空');
            return Promise.reject(new Error('orderCode 不能为空'));
        }

        const bodyParams = new URLSearchParams();
        bodyParams.append('orderCode[]', orderCode);
        bodyParams.append('force_checkout', force);
        if (csrfToken) {
            bodyParams.append('__token', csrfToken);
        }

        const apiUrl = 'http://wms.hzyunduan.com:8080/shipment/close-report/batch-order-checkout';

        // 判断当前是否处于 WMS 同源环境
        const sameOrigin = window.location.origin.startsWith('http://wms.hzyunduan.com:8080');

        if (sameOrigin) {
            return fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: bodyParams.toString(),
                credentials: 'include'
            });
        }

        // 若非同源，改为让 background service worker 代发请求
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'ecCheckout',
                payload: {
                    url: apiUrl,
                    body: bodyParams.toString()
                }
            }, response => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                if (!response) {
                    return reject(new Error('No response from background'));
                }
                if (response.error) {
                    return reject(new Error(response.error));
                }
                resolve(response);
            });
        });
    }

    // 解析HTTP请求头信息
    function parseHttpHeaders(headerText) {
        console.log('解析HTTP请求头:', headerText);
        
        const headers = {};
        let cookie = '';
        let referer = '';
        
        try {
            const lines = headerText.split('\n');
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.startsWith('POST ') || trimmedLine.startsWith('HTTP/')) {
                    continue;
                }
                
                const colonIndex = trimmedLine.indexOf(':');
                if (colonIndex > 0) {
                    const headerName = trimmedLine.substring(0, colonIndex).trim().toLowerCase();
                    const headerValue = trimmedLine.substring(colonIndex + 1).trim();
                    
                    // 收集关键headers
                    if (headerName === 'cookie') {
                        cookie = headerValue;
                    } else if (headerName === 'referer') {
                        referer = headerValue;
                    } else if (['accept', 'accept-language', 'content-type', 'x-requested-with'].includes(headerName)) {
                        headers[headerName] = headerValue;
                    }
                }
            }
            
            return { headers, cookie, referer };
        } catch (error) {
            console.error('解析header时出错:', error);
            return null;
        }
    }

    // 更新请求header的逻辑
    function updateEcRequestHeader(headerData) {
        console.log('updateEcRequestHeader函数被调用，headerData:', headerData);
        
        if (!headerData) {
            alert('未提供header数据');
            return null;
        }
        
        try {
            const parsedData = parseHttpHeaders(headerData);
            
            if (!parsedData) {
                alert('解析header失败');
                return null;
            }
            
            console.log('解析后的数据:', parsedData);
            
            // 存储到localStorage
            localStorage.setItem('ec_headers', JSON.stringify(parsedData.headers));
            localStorage.setItem('ec_cookie', parsedData.cookie);
            localStorage.setItem('ec_referer', parsedData.referer);
            localStorage.setItem('ec_header_updated', new Date().toISOString());
            
            console.log('Header信息已更新并存储');
            alert(`请求Header已更新成功！\n更新时间: ${new Date().toLocaleString()}`);
            
            return parsedData;
        } catch (error) {
            console.error('更新header时出错:', error);
            alert('更新请求Header失败: ' + error.message);
            return null;
        }
    }    // 将函数暴露到全局作用域，供其他脚本调用
    window.ecSyncCheckout = {
        checkout: sendEcSyncCheckout,          // 单一入口
        isEnabled: () => ecSyncCheckoutEnabled
    };
    
    // 调试信息：确认脚本正确加载
    console.log('ecSyncCheckout模块已初始化', {
        enabled: ecSyncCheckoutEnabled,
        currentUrl: window.location.href,
        hasToken: !!new URLSearchParams(window.location.search).get('__token')
    });
    
    function onDomReady(cb) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', cb);
        } else {
            cb();
        }
    }

    onDomReady(() => {
        console.log('DOM已准备，初始化自动签出监听');
        tryAttachInputListener();
    });

    // 尝试反复寻找输入框并挂载回车监听
    function tryAttachInputListener() {
        const selector = 'input.el-input__inner[placeholder="请输入跟踪号"]';
        const inputEl = document.querySelector(selector);
        if (inputEl) {
            console.log('找到跟踪号输入框，绑定 Enter 事件');
            inputEl.addEventListener('keydown', handleEnterKey, false);
        } else {
            // 如果暂未找到，延迟再试
            setTimeout(tryAttachInputListener, 1000);
        }
    }

    async function handleEnterKey(e) {
        if (e.key !== 'Enter') return;
        const trackingNo = e.target.value.trim();
        if (!trackingNo) return;

        // 等待页面渲染出包含该跟踪号的订单信息
        for (let i = 0; i < 10; i++) { // 最多尝试 10 次 * 500ms = 5s
            const code = extractOrderCodeByTracking(trackingNo);
            if (code) {
                console.log('检测到订单号:', code);
                if (ecSyncCheckoutEnabled) {
                    try {
                        const res = await sendEcSyncCheckout(code);
                        const parsed = await parseCheckoutResponse(res);
                        const msg = parsed?.message || JSON.stringify(parsed);
                        console.log('签出结果:', parsed);
                        if (window.msgQueue) msgQueue.push(`✔️ ${msg}`);
                    } catch (err) {
                        console.error('签出失败:', err);
                        if (window.msgQueue) msgQueue.push(`❌ ${err.message || err}`);
                    }
                } else {
                    console.log('易仓签出功能已关闭，跳过自动签出');
                }
                return;
            }
            await new Promise(r => setTimeout(r, 500));
        }
        console.warn('未能匹配跟踪号对应的订单号，自动签出终止');
    }

    // 根据客户跟踪号反查订单号
    function extractOrderCodeByTracking(tracking) {
        const pTrack = Array.from(document.querySelectorAll('.cell p')).find(el => {
            const txt = el.textContent.trim();
            return txt.startsWith('客户跟踪号:') && txt.includes(tracking);
        });
        if (!pTrack) return null;
        const cell = pTrack.closest('.cell');
        if (!cell) return null;
        const pOrder = Array.from(cell.querySelectorAll('p')).find(el => el.textContent.startsWith('订单号:'));
        if (!pOrder) return null;
        return pOrder.textContent.replace('订单号:', '').trim();
    }

    // 工具：把 Cookie 字符串写入 document.cookie
    function applyEcCookies(cookieStr) {
        if (!cookieStr) return;
        cookieStr.split(';').forEach(segment => {
            const [rawKey, ...rest] = segment.trim().split('=');
            if (!rawKey || rest.length === 0) return;
            const key = rawKey.trim();
            const value = rest.join('=').trim();
            // 仅覆盖关键登录态 Cookie
            if (['PHPSESSID', '__token'].includes(key) || key.startsWith('sensorsdata')) {
                document.cookie = `${key}=${value}; path=/`;
            }
        });
    }

    // 工具：提取 __token 值
    function extractToken(cookieStr) {
        const match = /__token=([^;]+)/.exec(cookieStr || '');
        return match ? match[1] : null;
    }

    // 调整 referrer 里的 __token 参数
    function updateReferrerToken(ref, cookieStr) {
        try {
            const token = extractToken(cookieStr);
            if (!token) return ref;
            const url = new URL(ref);
            url.searchParams.set('__token', token);
            return url.toString();
        } catch (err) {
            console.warn('更新 referrer token 失败:', err);
            return ref;
        }
    }

    async function parseCheckoutResponse(resp) {
        try {
            // Response object (same-origin path)
            if (typeof Response !== 'undefined' && resp instanceof Response) {
                return await resp.json();
            }
            // Background 返回的对象 {body: '...'}
            if (resp && typeof resp.body === 'string') {
                return JSON.parse(resp.body);
            }
            return resp;
        } catch (err) {
            console.warn('解析 checkout 响应失败:', err);
            return resp;
        }
    }
})();
