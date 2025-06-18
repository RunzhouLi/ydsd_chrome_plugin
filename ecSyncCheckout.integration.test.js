// Integration test – performs a REAL checkout request to EC server
// WARNING: This will hit the live endpoint.  Ensure you have network
// access and proper credentials.
// Provide your cookie via environment variable EC_COOKIE, e.g.
//   EC_COOKIE="PHPSESSID=...; __token=..." npx jest ecSyncCheckout.integration.test.js

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// 基础 Header，可根据需要再调整
const BASE_HEADERS = {
    accept: 'application/json, text/javascript, */*; q=0.01',
    'accept-language': 'zh-CN,zh;q=0.9',
    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'x-requested-with': 'XMLHttpRequest',
    // Referer 可保持不变
    referer: 'http://wms.hzyunduan.com:8080/shipment/close-report/list'
};

describe('EC real checkout – ATMDE-250616-0368', () => {
    const orderCode = 'ATMDE-250616-0368';

    const cookie = process.env.EC_COOKIE;
    if (!cookie) {
        console.warn('\n[SKIP] EC_COOKIE env variable not set, skipping real checkout test.');
        return;
    }

    it('should checkout order successfully (HTTP 200)', async () => {
        const headers = { ...BASE_HEADERS, cookie };
        const body = `orderCode%5B%5D=${encodeURIComponent(orderCode)}&force_checkout=0`;

        const res = await fetch(
            'http://wms.hzyunduan.com:8080/shipment/close-report/batch-order-checkout',
            {
                method: 'POST',
                headers,
                body,
                // node-fetch doesn\'t support `credentials: include` but we pass cookie manually
            }
        );

        expect(res.ok).toBe(true);
        const text = await res.text();
        console.log('\nServer response:', text);

        // 可按需要改成 JSON 解析并进一步断言业务字段
    }, 10000);
}); 