# Multiverse Chrome Extension

A Manifest V3 Chrome extension that organizes your browsing into workspaces with AI-powered features.

## Features

### Core Functionality

- **Workspaces**: Create, rename, delete, and switch between different browsing contexts
- **Tab Set Management**: Save and restore sets of tabs per workspace
- **Focus Mode**: Hide non-workspace tabs with one-click restore
- **Context Menu Integration**: Right-click to "Summarize in current workspace"
- **Highlight-to-Save**: Select text on any page to save it to the current workspace
- **Options Page**: Configure API keys (OpenAI) and integrations (Notion toggle)

### Technical Features

- Manifest V3 compliant with service worker background script
- TypeScript throughout with strict type checking
- React-based popup and options UI with Tailwind CSS
- Chrome storage abstraction (sync for config, local for larger data)
- Content script injection via chrome.scripting
- Secure API key storage (local only, never transmitted except to intended APIs)

## Project Structure

```
multiverse/
├── apps/
│   └── extension/          # Main Chrome extension
│       ├── src/
│       │   ├── popup/      # Extension popup (React)
│       │   ├── options/    # Options page (React)
│       │   ├── content/    # Content script
│       │   ├── background/ # Service worker
│       │   ├── components/ # Shared React components
│       │   ├── shared/     # Shared utilities and types
│       │   └── styles/     # Global styles
│       └── public/
│           └── icons/      # Extension icons
├── packages/
│   └── shared/            # Shared types and utilities (TypeScript)
│       └── src/
│           ├── types.ts   # TypeScript interfaces
│           ├── storage.ts # Chrome storage abstraction
│           └── utils.ts   # Utility functions
└── package.json          # Monorepo configuration
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm (comes with Node.js)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd multiverse
```

2. Install dependencies:

```bash
npm install
cd packages/shared && npm install
cd ../../apps/extension && npm install
cd ../..
```

3. Build the extension:

```bash
npm run build
```

4. Create distribution package:

```bash
npm run zip
```

The built extension will be in `apps/extension/dist/` and a zip file will be created at `apps/extension/extension.zip`.

## Development

### Available Scripts

From the root directory:

- `npm run build` - Build both shared package and extension
- `npm run dev` - Start development mode with file watching
- `npm run lint` - Run ESLint on all packages
- `npm run lint:fix` - Fix linting issues
- `npm run type-check` - Run TypeScript type checking
- `npm run zip` - Build and create extension zip

From the extension directory (`apps/extension/`):

- `npm run build` - Build the extension
- `npm run dev` - Development build with watching
- `npm run zip` - Build and zip extension

### Loading the Extension in Chrome

1. Build the extension: `npm run build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the `apps/extension/dist/` directory
6. The extension should now appear in your extensions list

### Development Workflow

1. Make changes to the source code
2. Run `npm run build` to rebuild
3. Reload the extension in Chrome (`chrome://extensions/` → reload button)
4. Test your changes

For active development, you can use `npm run dev` to watch for file changes, but you'll still need to reload the extension in Chrome after each rebuild.

## Architecture

### Storage System

The extension uses a thin storage abstraction (`packages/shared/src/storage.ts`) that automatically routes data:

- **chrome.storage.sync**: Small configuration data (API keys, settings)
- **chrome.storage.local**: Larger payloads (workspaces, tab sets, saved text)

### Component Structure

- **Popup**: Main interface for workspace management and quick actions
- **Options Page**: Configuration for API keys and integration settings
- **Content Script**: Handles text selection and page interaction
- **Service Worker**: Background processing, context menus, tab management

### Data Flow

1. User interactions in popup/options update storage via the storage abstraction
2. Content script listens for text selection and saves to current workspace
3. Service worker handles background tasks and context menu actions
4. All components communicate via Chrome messaging APIs

## Configuration

### API Keys

Configure API keys in the Options page (`chrome://extensions/` → Multiverse → Details → Extension options):

- **OpenAI API Key**: Required for AI summarization features
- **Notion API Key**: Required for Notion integration (when enabled)

API keys are stored locally in `chrome.storage.local` and never transmitted except to their intended endpoints.

### Features

- **Focus Mode**: Automatically hide non-workspace tabs
- **Auto-save Tab Sets**: Automatically save tab sets when switching workspaces
- **Notion Integration**: Enable Notion integration features

## Security

- API keys are stored locally and never transmitted to external servers except their intended APIs
- Content script only activates on user text selection
- All permissions follow the principle of least privilege
- No external dependencies in production build

## Browser Compatibility

- Chrome 88+ (Manifest V3 support)
- Chromium-based browsers (Edge, Brave, etc.) with Manifest V3 support

## Contributing

1. Follow the existing code style (enforced by ESLint/Prettier)
2. Add types for all new interfaces
3. Test in Chrome before submitting
4. Update documentation for new features

## License

[Add your license here]
