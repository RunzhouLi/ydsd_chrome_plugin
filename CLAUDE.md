# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension (云端时代自开发系统插件) that provides automation features for specific Chinese e-commerce and warehouse management systems. The extension operates on `http://z.zjydsd.com:233/*` and `http://wms.hzyunduan.com:8080/*` domains.

## Architecture

### Core Components

- **manifest.json**: Chrome extension manifest (v3) defining permissions, content scripts, and keyboard shortcuts
- **background.js**: Service worker handling cross-origin requests and storage initialization
- **popup.html/popup.js**: Extension popup UI with toggle controls for each feature
- **Content Scripts** (loaded in order):
  - `messageQueue.js`: Message queuing system
  - `dpd.js`: DPD tracking number extraction (27-digit to 14-digit conversion)
  - `autoscan.js`: Auto-clicks scan buttons in dialogs
  - `shortcut.js`: Keyboard shortcuts functionality  
  - `initInput.js`: Input field initialization
  - `ecSyncCheckout.js`: E-commerce sync checkout with cross-origin request handling

### Key Features

1. **DPD Number Extraction**: Extracts 14-digit codes from 27-digit DPD tracking numbers
2. **Auto Scan**: Automatically clicks "start scan" buttons in dialog boxes
3. **Keyboard Shortcuts**: Ctrl+Shift+F to open extension popup
4. **Input Initialization**: Pre-fills input fields
5. **EC Sync Checkout**: Handles order checkout via API with cross-origin support and automatic clipboard copy
6. **RFID Operation Logging**: Records RFID submission operations with comprehensive page feedback capture

### Cross-Origin Architecture

The extension uses a sophisticated cross-origin request system:
- Same-origin requests (within `wms.hzyunduan.com:8080`) use direct fetch
- Cross-origin requests are proxied through the background service worker
- Automatic cookie and credential management

## Development Commands

### Testing
```bash
# Run unit tests
npx jest ecSyncCheckout.test.js

# Run integration tests  
npx jest ecSyncCheckout.integration.test.js

# Run RFID logger tests
npx jest rfidLogger.test.js

# Run all tests
npx jest
```

### Chrome Extension Development
- Load unpacked extension from this directory in Chrome developer mode
- Use Chrome DevTools to debug content scripts and background worker
- Monitor console logs in both page context and extension context

## File Structure

- Content scripts are executed in order as defined in manifest.json
- Each content script is wrapped in an IIFE to avoid global namespace pollution
- Feature toggles are managed via Chrome storage API
- All scripts communicate via Chrome runtime messaging

### RFID Logging Feature

The RFID logger (`rfidLogger.js`) provides comprehensive operation tracking:

#### Functionality
- Monitors clicks on RFID submit buttons (with "提交" text)
- Captures page feedback after submission with configurable delays (1s and 3s)
- Extracts order numbers using multiple fallback methods
- Generates daily log files in CSV format for local download

#### Log Data Structure
Each log entry includes:
- Timestamp and local time
- Order number (extracted from page elements)
- Comprehensive page feedback (alerts, dialogs, toasts, messages, errors)
- Current URL and user agent
- Structured feedback categorization

#### Usage
- Toggle via popup checkbox: "RFID操作日志"
- Download daily logs via "下载今日日志" button
- Logs are stored in localStorage with daily partitioning
- Files are named: `RFID操作日志_YYYY-MM-DD.csv`

## Testing Strategy

- Unit tests use Jest with jsdom environment
- Integration tests simulate browser interactions
- Tests mock Chrome APIs and fetch requests
- Focus on the ecSyncCheckout module which handles complex API interactions