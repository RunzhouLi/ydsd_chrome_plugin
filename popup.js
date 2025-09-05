document.addEventListener('DOMContentLoaded', function () {
    // const toggleButton = document.getElementById('toggleButton'); // Removed
    const dpdCheckbox = document.getElementById('dpdCheckbox');
    const autoScanCheckbox = document.getElementById('autoScanCheckbox');
    const shortcutCheckbox = document.getElementById('shortcutCheckbox');
    const initInputCheckbox = document.getElementById('initInputCheckbox');
    const ecSyncCheckoutCheckbox = document.getElementById('ecSyncCheckoutCheckbox');
    const rfidLoggerCheckbox = document.getElementById('rfidLoggerCheckbox');
    const downloadLogsButton = document.getElementById('downloadLogsButton');

    // chrome.storage.sync.get('automationEnabled', function (data) { // Removed
    //     toggleButton.textContent = data.automationEnabled ? '停止自动化' : '启动自动化'; // Removed
    // }); // Removed

    chrome.storage.sync.get('dpdFeatureEnabled', function (data) {
        dpdCheckbox.checked = !!data.dpdFeatureEnabled;
    });

    chrome.storage.sync.get('autoScanEnabled', function (data) {
        autoScanCheckbox.checked = !!data.autoScanEnabled;
    });

    chrome.storage.sync.get('shortcutFeatureEnabled', function (data) {
        shortcutCheckbox.checked = !!data.shortcutFeatureEnabled;
    });
    chrome.storage.sync.get('initInputEnabled', function (data) {
        initInputCheckbox.checked = !!data.initInputEnabled;
    });
    chrome.storage.sync.get('ecSyncCheckoutEnabled', function (data) {
        ecSyncCheckoutCheckbox.checked = !!data.ecSyncCheckoutEnabled;
    });

    chrome.storage.sync.get('rfidLoggerEnabled', function (data) {
        rfidLoggerCheckbox.checked = !!data.rfidLoggerEnabled;
    });

    // toggleButton.addEventListener('click', function () { // Removed
    //     chrome.storage.sync.get('automationEnabled', function (data) { // Removed
    //         const newEnabledState = !data.automationEnabled; // Removed
    //         chrome.storage.sync.set({ automationEnabled: newEnabledState }, function () { // Removed
    //             toggleButton.textContent = newEnabledState ? '停止自动化' : '启动自动化'; // Removed
    //             chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) { // Removed
    //                 if (tabs[0] && tabs[0].id) { // Removed
    //                     chrome.tabs.sendMessage(tabs[0].id, { action: "toggleAutomation", enabled: newEnabledState }); // Removed
    //                 } // Removed
    //             }); // Removed
    //         }); // Removed
    //     }); // Removed
    // }); // Removed

    dpdCheckbox.addEventListener('change', function () {
        const isEnabled = dpdCheckbox.checked;
        chrome.storage.sync.set({ dpdFeatureEnabled: isEnabled }, function () {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: "toggleDpdFeature", enabled: isEnabled });
                }
            });
        });
    });

    autoScanCheckbox.addEventListener('change', function () {
        const isEnabled = autoScanCheckbox.checked;
        chrome.storage.sync.set({ autoScanEnabled: isEnabled }, function () {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleAutoScan', enabled: isEnabled });
                }
            });
        });
    });

    shortcutCheckbox.addEventListener('change', function () {
        const isEnabled = shortcutCheckbox.checked;
        chrome.storage.sync.set({ shortcutFeatureEnabled: isEnabled }, function () {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleShortcut', enabled: isEnabled });
                }
            });
        });
    });
    initInputCheckbox.addEventListener('change', function () {
        const isEnabled = initInputCheckbox.checked;
        chrome.storage.sync.set({ initInputEnabled: isEnabled }, function () {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleInitInput', enabled: isEnabled });
                }
            });
        });
    });

    ecSyncCheckoutCheckbox.addEventListener('change', function () {
        const isEnabled = ecSyncCheckoutCheckbox.checked;
        chrome.storage.sync.set({ ecSyncCheckoutEnabled: isEnabled }, function () {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleEcSyncCheckout', enabled: isEnabled });
                }
            });
        });
    });

    rfidLoggerCheckbox.addEventListener('change', function () {
        const isEnabled = rfidLoggerCheckbox.checked;
        chrome.storage.sync.set({ rfidLoggerEnabled: isEnabled }, function () {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleRfidLogger', enabled: isEnabled });
                }
            });
        });
    });

    downloadLogsButton.addEventListener('click', function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'downloadRfidLogs' });
            }
        });
    });
})();
