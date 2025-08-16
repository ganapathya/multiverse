# Multiverse - Context Switchboard

A powerful Chrome extension for organizing browsing into AI-enhanced workspaces with intelligent content analysis, highlighting, and task management.

## 🚀 Features

- **🌌 Workspace Management**: Organize tabs into themed workspaces
- **🤖 AI-Powered Analysis**: OpenAI integration with customizable workspace primers
- **📝 Smart Highlighting**: Save and analyze text selections across websites
- **📋 Task Automation**: AI summarization with context-aware prompts
- **🎯 Focus Mode**: Hide non-workspace tabs for distraction-free browsing
- **📤 Data Export**: Complete workspace backups with JSON export
- **⚡ Quick Notes**: Workspace-scoped note-taking with auto-save

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Chrome/Chromium browser for testing

### Installation

```bash
# Clone repository
git clone <repository-url>
cd multiverse

# Install pnpm (if not already installed)
npm install -g pnpm

# Install dependencies
pnpm install
```

### Development Commands

#### Using pnpm (recommended)

```bash
# Development mode (watch rebuilds)
pnpm -w dev

# Production build
pnpm -w build

# Create extension zip for publishing
pnpm -w zip

# Code quality
pnpm -w lint
pnpm -w type-check

# Clean and reset
pnpm clean && pnpm install
```

#### Using npm (fallback)

```bash
# Development mode (watch rebuilds)
npm run dev

# Production build
npm run build

# Create extension zip for publishing
npm run zip

# Code quality
npm run lint
npm run type-check

# Clean and reset
npm run clean
npm run reset
```

### Loading the Extension

1. **Build the extension:**

   ```bash
   pnpm -w build
   ```

2. **Open Chrome Extensions:**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (top-right toggle)

3. **Load unpacked extension:**
   - Click "Load unpacked"
   - Select the `apps/extension/dist` folder
   - The extension should appear in your extensions list

4. **Pin the extension:**
   - Click the puzzle piece icon in Chrome toolbar
   - Pin "Multiverse" for easy access

### Development Workflow

```bash
# Start development servers
pnpm -w dev

# In another terminal, watch for changes and reload extension
# (You'll need to manually reload in chrome://extensions/ for now)
```

**Note:** During development, you'll need to click the refresh button in `chrome://extensions/` after making changes to the background script or manifest. Popup and options page changes reload automatically.

## 🔒 Security & Privacy

### API Key Storage

- **Local Storage Only**: API keys stored in `chrome.storage.local`, never transmitted except to authorized APIs
- **No Key Bundling**: API keys never included in extension package
- **User Control**: Users configure their own OpenAI API keys in Options page

### Content Security Policy

- **Strict CSP**: No inline scripts, eval(), or unsafe code execution
- **Trusted Sources**: Only allows specific domains for external resources
- **Remote Code**: No remote code execution or dynamic script loading

### Data Privacy

- **Local Data**: All workspace data stored locally in browser
- **No Analytics**: No tracking, telemetry, or usage analytics
- **Minimal Permissions**: Follows least-privilege principle (see permissions rationale below)

### Network Requests

- **OpenAI Only**: Network requests limited to OpenAI API endpoints
- **User Initiated**: API calls only triggered by explicit user actions
- **No Background Sync**: No automatic data synchronization or uploads

## 📋 Permissions Rationale

The extension requests the following permissions with specific justifications:

### Core Permissions

- **`tabs`**: Query current window tabs to save/restore tab sets and implement workspace switching
  - _Least-privilege_: Queries limited to active window when possible
  - _Alternative_: No viable alternative for tab management features

- **`storage`**: Persist workspaces, highlights, and user preferences
  - _Data_: Uses `chrome.storage.local` for large data, `chrome.storage.sync` for small config
  - _Scope_: Only stores user-generated content and preferences

- **`activeTab`**: Access current tab content when user explicitly invokes actions
  - _Trigger_: Only activated by user gestures (popup clicks, context menu)
  - _Alternative_: Preferred over broad host permissions for one-time access

### Feature Permissions

- **`contextMenus`**: Create right-click "Summarize in current workspace" option
  - _Scope_: Limited to text selection and page contexts
  - _Removal_: Can be disabled in future updates if not used

- **`scripting`**: Inject content scripts for text highlighting functionality
  - _Usage_: On-demand injection for highlight capture
  - _Alternative_: Declarative content scripts would require broader permissions

- **`tabGroups`**: Future feature for grouping tabs by workspace (currently minimal usage)
  - _Future_: Will enable visual tab organization
  - _Current_: Minimal usage, feature-gated

### Host Permissions

- **`<all_urls>`**: Required for content script injection and highlight capture across all websites
  - _Future_: Will make this configurable with user-defined allowlists
  - _Current_: Necessary for universal highlighting functionality

## 🔧 Troubleshooting

### Extension Won't Load

1. **Check manifest errors:**

   ```bash
   # Rebuild and check for syntax errors
   npm run build
   ```

2. **Verify file structure:**

   ```
   apps/extension/dist/
   ├── manifest.json
   ├── popup.html
   ├── options.html
   ├── popup.js
   ├── background.js
   ├── content.js
   └── icons/
   ```

3. **Check Chrome console:**
   - Open `chrome://extensions/`
   - Find Multiverse extension
   - Click "Errors" to see any loading issues

### Service Worker Issues

1. **Check service worker status:**
   - Go to `chrome://extensions/`
   - Find Multiverse extension
   - Click "service worker" link to open DevTools

2. **Common service worker errors:**

   ```javascript
   // Check console for these errors:
   // - Import errors (missing files)
   // - Syntax errors in background.js
   // - Permission errors for storage/tabs APIs
   ```

3. **Restart service worker:**
   - In extension details, click "Reload" button
   - Or disable/enable the extension

### Content Script Injection Fails

1. **Check host permissions:**
   - Ensure `<all_urls>` permission is granted
   - Check if site blocks content scripts (some do)

2. **Debug content script:**

   ```javascript
   // Open page console and check for:
   console.log('Content script loaded'); // Should appear
   // Check for CSP violations or script errors
   ```

3. **Test highlighting:**
   - Select text on any webpage
   - Should see "Save highlight" pill appear
   - Check content script console for errors

### OpenAI Integration Issues

1. **API Key Problems:**
   - Go to Options page
   - Verify API key format: starts with `sk-`
   - Test with simple prompt in popup

2. **Network Errors:**

   ```javascript
   // Check for CORS or network issues
   // OpenAI API should be accessible from extension context
   ```

3. **Rate Limiting:**
   - OpenAI API has rate limits
   - Check API usage in OpenAI dashboard
   - Reduce request frequency if needed

### Storage Issues

1. **Storage quota:**

   ```javascript
   // Check storage usage
   chrome.storage.local.getBytesInUse(null, (bytes) => {
     console.log('Storage used:', bytes, 'bytes');
   });
   ```

2. **Clear storage:**
   ```bash
   # In extension console
   chrome.storage.local.clear();
   chrome.storage.sync.clear();
   ```

### Export/Download Problems

1. **Browser download blocks:**
   - Check Chrome's download settings
   - Ensure downloads aren't blocked for extensions

2. **Large export files:**
   - Browser may block very large downloads
   - Consider splitting large workspaces

### Development Issues

1. **Build failures:**

   ```bash
   # Clean and rebuild
   npm run clean
   npm run install:all
   npm run build
   ```

2. **TypeScript errors:**

   ```bash
   # Check type errors
   npm run type-check
   ```

3. **Hot reload not working:**
   - Currently manual reload required
   - Use `npm run dev` and reload extension in Chrome

## 📦 Publishing

1. **Create production build:**

   ```bash
   npm run zip
   ```

2. **Verify zip contents:**

   ```bash
   unzip -l apps/extension/context-switchboard.zip
   ```

3. **Test thoroughly:**
   - Load the built extension
   - Test all core features
   - Verify in incognito mode
   - Test on various websites

4. **Submit to Chrome Web Store:**
   - Upload `context-switchboard.zip`
   - Complete store listing information
   - Submit for review

## 🏗️ Architecture

```
multiverse/
├── apps/extension/          # Chrome extension
│   ├── src/
│   │   ├── popup/          # Extension popup UI
│   │   ├── options/        # Options page
│   │   ├── background/     # Service worker
│   │   ├── content/        # Content scripts
│   │   ├── components/     # Shared React components
│   │   ├── hooks/          # React hooks
│   │   ├── utils/          # Utility functions
│   │   └── shared/         # Shared types/storage
│   └── dist/               # Built extension
├── packages/shared/         # Shared utilities
│   ├── src/
│   │   ├── storage.ts      # Storage management
│   │   ├── utils.ts        # Common utilities
│   │   └── __tests__/      # Unit tests
│   └── dist/               # Built package
└── README.md               # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Ensure linting passes: `npm run lint`
6. Test the extension thoroughly
7. Submit a pull request

## 📄 License

[Add your license here]

---

**Note**: This extension is designed with privacy and security as top priorities. All data remains local to your browser, and API keys are stored securely using Chrome's built-in storage APIs.
