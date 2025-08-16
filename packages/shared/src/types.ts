export interface Workspace {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

export interface TabSet {
  id: string;
  workspaceId: string;
  name: string;
  tabs: SavedTab[];
  createdAt: number;
  updatedAt: number;
}

export interface SavedTab {
  id: string;
  url: string;
  title: string;
  favIconUrl?: string;
  pinned: boolean;
  index: number;
}

export interface SavedText {
  id: string;
  workspaceId: string;
  text: string;
  url: string;
  title: string;
  createdAt: number;
  tags?: string[];
}

export interface AppConfig {
  openaiApiKey?: string;
  notionIntegrationEnabled: boolean;
  notionApiKey?: string;
  focusModeEnabled: boolean;
  autoSaveTabSets: boolean;
}

export interface StorageData {
  workspaces: Workspace[];
  tabSets: TabSet[];
  savedTexts: SavedText[];
  config: AppConfig;
  activeWorkspaceId?: string;
}

export type StorageKey = keyof StorageData;

export interface ContextMenuData {
  selectionText: string;
  pageUrl: string;
  pageTitle: string;
}
