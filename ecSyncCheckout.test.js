// Jest unit test for ecSyncCheckout sendEcSyncCheckout function
// NOTE: This test assumes Jest is executed in the `jsdom` environment.
// Run with:  npx jest ecSyncCheckout.test.js

// Mock the global fetch implementation
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
    })
);

// Load the script under test – it attaches `ecSyncCheckout` onto the global `window` object
require('./ecSyncCheckout.js');

describe('ecSyncCheckout.checkout', () => {
    const orderCode = 'ATMDE-250616-0368';

    beforeEach(() => {
        fetch.mockClear();
        // Ensure localStorage is clean for each test run
        localStorage.clear();
    });

    it('should issue a POST to the batch-order-checkout endpoint with the correct order code', async () => {
        // Mock window.location.origin used inside the module
        Object.defineProperty(window, 'location', {
            writable: true,
            value: new URL('http://wms.hzyunduan.com:8080/')
        });

        // Act
        await window.ecSyncCheckout.checkout(orderCode);

        // Assert
        expect(fetch).toHaveBeenCalledTimes(1);
        const [url, options] = fetch.mock.calls[0];

        expect(url).toBe(
            'http://wms.hzyunduan.com:8080/shipment/close-report/batch-order-checkout'
        );
        expect(options.method).toBe('POST');
        expect(options.body).toContain(encodeURIComponent(orderCode));
    });
}); 