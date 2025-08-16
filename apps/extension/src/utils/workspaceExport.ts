import {
  storage,
  type Workspace,
  type TabSet,
  type Highlight,
} from '../shared';
import { downloadJSON, sanitizeFilename, getTimestampString } from './download';

/**
 * Complete workspace export data structure
 */
export interface WorkspaceExport {
  // Metadata
  exportedAt: string;
  exportVersion: string;
  workspaceId: string;

  // Core workspace data
  workspace: Workspace;

  // Associated data
  tabSets: TabSet[];
  highlights: Highlight[];
  quickNotes: string;

  // AI tasks (if any)
  tasks: Task[];

  // Statistics
  stats: {
    totalTabs: number;
    totalHighlights: number;
    totalTasks: number;
    lastActivity: string;
  };
}

/**
 * Task interface for export (matching background script)
 */
interface Task {
  id: string;
  type: 'summarize_selection' | 'summarize_page';
  workspaceId: string;
  content: string;
  url: string;
  title: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
  error?: string;
  result?: {
    summary: string;
    key_points: string[];
    actions: string[];
  };
}

/**
 * Export a complete workspace with all associated data
 */
export async function exportWorkspace(
  workspaceId: string
): Promise<WorkspaceExport> {
  try {
    // Get core workspace data
    const workspace = await storage.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Get associated data in parallel
    const [tabSets, highlights, tasks, quickNotes] = await Promise.all([
      storage.getWorkspaceTabSets(workspaceId),
      storage.getHighlights(workspaceId, 1000), // Get all highlights
      getWorkspaceTasks(workspaceId),
      getWorkspaceQuickNotes(workspaceId),
    ]);

    // Calculate statistics
    const totalTabs = tabSets.reduce(
      (sum, tabSet) => sum + tabSet.tabs.length,
      0
    );
    const lastActivity = Math.max(
      workspace.updatedAt,
      ...tabSets.map((ts) => ts.updatedAt),
      ...highlights.map((h) => h.createdAt),
      ...tasks.map((t) => t.updatedAt)
    );

    const exportData: WorkspaceExport = {
      // Metadata
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0.0',
      workspaceId,

      // Core data
      workspace,

      // Associated data
      tabSets,
      highlights,
      quickNotes,
      tasks,

      // Statistics
      stats: {
        totalTabs,
        totalHighlights: highlights.length,
        totalTasks: tasks.length,
        lastActivity: new Date(lastActivity).toISOString(),
      },
    };

    return exportData;
  } catch (error) {
    console.error('Failed to export workspace:', error);
    throw new Error(`Export failed: ${error.message}`);
  }
}

/**
 * Export workspace and trigger download
 */
export async function downloadWorkspaceExport(
  workspaceId: string
): Promise<void> {
  try {
    const exportData = await exportWorkspace(workspaceId);

    // Generate filename
    const safeName = sanitizeFilename(exportData.workspace.name);
    const timestamp = getTimestampString();
    const filename = `workspace_${safeName}_${timestamp}.json`;

    // Download the JSON file
    downloadJSON(exportData, filename, true);

    console.log('Workspace exported successfully:', filename);
  } catch (error) {
    console.error('Failed to download workspace export:', error);
    throw error;
  }
}

/**
 * Get workspace tasks from storage
 */
async function getWorkspaceTasks(workspaceId: string): Promise<Task[]> {
  try {
    // Send message to background script to get tasks
    const response = await chrome.runtime.sendMessage({
      action: 'getTasks',
      data: { workspaceId },
    });

    if (!response.success) {
      console.warn('Failed to get tasks for export:', response.error);
      return [];
    }

    return response.tasks || [];
  } catch (error) {
    console.warn('Failed to get workspace tasks:', error);
    return [];
  }
}

/**
 * Get workspace quick notes
 */
async function getWorkspaceQuickNotes(workspaceId: string): Promise<string> {
  try {
    const result = await chrome.storage.local.get([
      `quickNotes_${workspaceId}`,
    ]);
    return result[`quickNotes_${workspaceId}`] || '';
  } catch (error) {
    console.warn('Failed to get quick notes:', error);
    return '';
  }
}

/**
 * Validate export data structure
 */
export function validateExportData(data: unknown): data is WorkspaceExport {
  if (!data || typeof data !== 'object') return false;

  const exportData = data as Partial<WorkspaceExport>;

  return !!(
    exportData.exportedAt &&
    exportData.exportVersion &&
    exportData.workspaceId &&
    exportData.workspace &&
    Array.isArray(exportData.tabSets) &&
    Array.isArray(exportData.highlights) &&
    typeof exportData.quickNotes === 'string' &&
    Array.isArray(exportData.tasks) &&
    exportData.stats
  );
}

/**
 * Create a summary report of the export
 */
export function generateExportSummary(exportData: WorkspaceExport): string {
  const { workspace, stats } = exportData;

  return `# Workspace Export Summary

**Workspace:** ${workspace.name}
**Exported:** ${new Date(exportData.exportedAt).toLocaleString()}
**Export Version:** ${exportData.exportVersion}

## Contents
- **Tab Sets:** ${exportData.tabSets.length} sets with ${stats.totalTabs} total tabs
- **Highlights:** ${stats.totalHighlights} saved text highlights
- **Tasks:** ${stats.totalTasks} AI analysis tasks
- **Quick Notes:** ${exportData.quickNotes ? 'Included' : 'Empty'}
- **AI Primer:** ${workspace.contextPrimer ? 'Custom primer set' : 'Default analysis'}

## Activity
- **Created:** ${new Date(workspace.createdAt).toLocaleString()}
- **Last Updated:** ${new Date(workspace.updatedAt).toLocaleString()}
- **Last Activity:** ${new Date(stats.lastActivity).toLocaleString()}

---
*Generated by Multiverse Workspace Manager*`;
}

// ========================================
// NOTION INTEGRATION STUBS
// ========================================

/**
 * TODO: Implement Notion integration
 *
 * This section contains stubbed functions for exporting workspace data
 * to Notion. Implementation requires:
 *
 * 1. Notion API integration setup
 * 2. Database schema design for workspace data
 * 3. Authentication flow for Notion
 * 4. Data transformation for Notion format
 */

export interface NotionExportOptions {
  databaseId?: string;
  createNewPage?: boolean;
  updateExisting?: boolean;
  includeTabSets?: boolean;
  includeHighlights?: boolean;
  includeTasks?: boolean;
}

/**
 * TODO: Export workspace to Notion
 *
 * @param workspaceId - ID of workspace to export
 * @param options - Export configuration options
 *
 * Implementation plan:
 * 1. Get Notion API token from settings
 * 2. Transform workspace data to Notion blocks format
 * 3. Create or update Notion page/database entry
 * 4. Handle nested data (tab sets, highlights, tasks)
 * 5. Provide progress feedback and error handling
 */
export async function exportToNotion(
  workspaceId: string,
  options: NotionExportOptions = {}
): Promise<{ pageId: string; url: string }> {
  // TODO: Remove this stub and implement actual Notion integration
  throw new Error('Notion export not yet implemented');

  /*
  Implementation outline:
  
  try {
    // 1. Get settings and validate Notion integration
    const settings = await storage.getSettings();
    if (!settings.notionApiKey || !settings.notionIntegrationEnabled) {
      throw new Error('Notion integration not configured');
    }
    
    // 2. Export workspace data
    const exportData = await exportWorkspace(workspaceId);
    
    // 3. Transform to Notion format
    const notionBlocks = transformToNotionBlocks(exportData, options);
    
    // 4. Create/update Notion page
    const result = await notionApi.createPage({
      parent: { database_id: options.databaseId },
      properties: createNotionProperties(exportData),
      children: notionBlocks
    });
    
    return {
      pageId: result.id,
      url: result.url
    };
    
  } catch (error) {
    console.error('Notion export failed:', error);
    throw error;
  }
  */
}

/**
 * TODO: Transform export data to Notion blocks format
 *
 * @param exportData - Workspace export data
 * @param options - Export options
 *
 * Should create Notion blocks for:
 * - Workspace header with metadata
 * - Tab sets as toggle blocks or tables
 * - Highlights as quote blocks or callouts
 * - Tasks as todo items or database entries
 * - Quick notes as text blocks
 */
function transformToNotionBlocks(
  exportData: WorkspaceExport,
  options: NotionExportOptions
): unknown[] {
  // TODO: Implement Notion blocks transformation
  console.log('TODO: Transform to Notion blocks', { exportData, options });
  return [];

  /*
  Implementation outline:
  
  const blocks = [];
  
  // Header block
  blocks.push({
    type: 'heading_1',
    heading_1: {
      rich_text: [{ text: { content: exportData.workspace.name } }]
    }
  });
  
  // Workspace metadata
  blocks.push({
    type: 'callout',
    callout: {
      rich_text: [{ text: { content: generateExportSummary(exportData) } }],
      icon: { emoji: '🌌' }
    }
  });
  
  // AI Primer (if exists)
  if (exportData.workspace.contextPrimer) {
    blocks.push({
      type: 'quote',
      quote: {
        rich_text: [{ text: { content: exportData.workspace.contextPrimer } }]
      }
    });
  }
  
  // Tab sets
  if (options.includeTabSets && exportData.tabSets.length > 0) {
    blocks.push(...transformTabSetsToNotionBlocks(exportData.tabSets));
  }
  
  // Highlights
  if (options.includeHighlights && exportData.highlights.length > 0) {
    blocks.push(...transformHighlightsToNotionBlocks(exportData.highlights));
  }
  
  // Tasks
  if (options.includeTasks && exportData.tasks.length > 0) {
    blocks.push(...transformTasksToNotionBlocks(exportData.tasks));
  }
  
  // Quick notes
  if (exportData.quickNotes) {
    blocks.push({
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: exportData.quickNotes } }]
      }
    });
  }
  
  return blocks;
  */
}

/**
 * TODO: Create Notion page properties for workspace
 */
function createNotionProperties(
  exportData: WorkspaceExport
): Record<string, unknown> {
  // TODO: Implement Notion properties creation
  console.log('TODO: Create Notion properties', exportData);
  return {};

  /*
  return {
    Name: {
      title: [{ text: { content: exportData.workspace.name } }]
    },
    'Export Date': {
      date: { start: exportData.exportedAt }
    },
    'Tab Count': {
      number: exportData.stats.totalTabs
    },
    'Highlight Count': {
      number: exportData.stats.totalHighlights
    },
    'Task Count': {
      number: exportData.stats.totalTasks
    },
    'Has Primer': {
      checkbox: !!exportData.workspace.contextPrimer
    }
  };
  */
}

/**
 * TODO: Check Notion integration status
 */
export async function checkNotionIntegration(): Promise<{
  enabled: boolean;
  configured: boolean;
  error?: string;
}> {
  try {
    const settings = await storage.getSettings();

    return {
      enabled: settings.notionIntegrationEnabled || false,
      configured: !!(settings.notionApiKey && settings.notionApiKey.length > 0),
    };
  } catch (error) {
    return {
      enabled: false,
      configured: false,
      error: error.message,
    };
  }
}

/**
 * TODO: Get available Notion databases for export
 */
export async function getNotionDatabases(): Promise<
  Array<{
    id: string;
    name: string;
    url: string;
  }>
> {
  // TODO: Implement Notion database listing
  throw new Error('Notion database listing not yet implemented');

  /*
  try {
    const settings = await storage.getSettings();
    if (!settings.notionApiKey) {
      throw new Error('Notion API key not configured');
    }
    
    const databases = await notionApi.search({
      filter: { property: 'object', value: 'database' }
    });
    
    return databases.results.map(db => ({
      id: db.id,
      name: db.title[0]?.plain_text || 'Untitled Database',
      url: db.url
    }));
    
  } catch (error) {
    console.error('Failed to get Notion databases:', error);
    throw error;
  }
  */
}
