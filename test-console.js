// 简单的测试脚本，用于验证插件功能
// 在易仓页面的控制台中运行此脚本

console.log('=== 易仓插件调试测试 ===');

// 1. 检查当前页面URL
console.log('当前页面URL:', window.location.href);
console.log('是否匹配目标域名:', window.location.href.includes('wms.hzyunduan.com:8080'));

// 2. 检查ecSyncCheckout对象
console.log('ecSyncCheckout对象存在:', !!window.ecSyncCheckout);
if (window.ecSyncCheckout) {
    console.log('ecSyncCheckout对象内容:', window.ecSyncCheckout);
    console.log('可用方法:', Object.keys(window.ecSyncCheckout));
}

// 3. 检查chrome扩展API
console.log('chrome对象存在:', !!window.chrome);
if (window.chrome) {
    console.log('chrome.runtime存在:', !!window.chrome.runtime);
    console.log('chrome.storage存在:', !!window.chrome.storage);
}

// 4. 检查页面token
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('__token');
const storageToken = localStorage.getItem('ec_token');
console.log('URL中的token:', token ? token.substring(0, 20) + '...' : '未找到');
console.log('localStorage中的token:', storageToken ? storageToken.substring(0, 20) + '...' : '未找到');

// 5. 测试函数调用
if (window.ecSyncCheckout && window.ecSyncCheckout.updateEcRequestHeader) {
    console.log('测试updateEcRequestHeader函数...');
    try {
        const result = window.ecSyncCheckout.updateEcRequestHeader();
        console.log('函数调用结果:', result);
    } catch (error) {
        console.error('函数调用错误:', error);
    }
} else {
    console.log('updateEcRequestHeader函数不可用');
}

// 6. 检查存储状态
if (window.chrome && window.chrome.storage) {
    chrome.storage.sync.get(['ecSyncCheckoutEnabled'], function(result) {
        console.log('插件启用状态:', result);
    });
}

console.log('=== 测试完成 ===');
