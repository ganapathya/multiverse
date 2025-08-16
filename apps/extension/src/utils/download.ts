/**
 * Utility functions for file downloads in browser extensions
 */

export interface DownloadOptions {
  filename: string;
  mimeType?: string;
}

/**
 * Create a blob URL from data and trigger download
 */
export function downloadAsBlob(
  data: string | ArrayBuffer | Blob,
  options: DownloadOptions
): void {
  try {
    let blob: Blob;

    if (data instanceof Blob) {
      blob = data;
    } else if (typeof data === 'string') {
      blob = new Blob([data], {
        type: options.mimeType || 'application/json;charset=utf-8',
      });
    } else {
      blob = new Blob([data], {
        type: options.mimeType || 'application/octet-stream',
      });
    }

    const url = URL.createObjectURL(blob);

    // Create temporary anchor element for download
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = options.filename;
    anchor.style.display = 'none';

    // Append to body, click, and remove
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // Clean up the blob URL
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Failed to download file:', error);
    throw new Error(`Download failed: ${error.message}`);
  }
}

/**
 * Download JSON data with proper formatting
 */
export function downloadJSON(
  data: unknown,
  filename: string,
  prettyPrint: boolean = true
): void {
  try {
    const jsonString = prettyPrint
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);

    downloadAsBlob(jsonString, {
      filename: filename.endsWith('.json') ? filename : `${filename}.json`,
      mimeType: 'application/json;charset=utf-8',
    });
  } catch (error) {
    console.error('Failed to serialize JSON for download:', error);
    throw new Error(`JSON download failed: ${error.message}`);
  }
}

/**
 * Download text content as a file
 */
export function downloadText(
  content: string,
  filename: string,
  mimeType: string = 'text/plain;charset=utf-8'
): void {
  downloadAsBlob(content, {
    filename,
    mimeType,
  });
}

/**
 * Generate a safe filename from a string
 */
export function sanitizeFilename(
  name: string,
  maxLength: number = 100
): string {
  // Remove invalid filename characters
  const sanitized = name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  // Truncate if too long
  if (sanitized.length > maxLength) {
    return sanitized.substring(0, maxLength - 3) + '...';
  }

  return sanitized || 'untitled';
}

/**
 * Get current timestamp for filename
 */
export function getTimestampString(): string {
  const now = new Date();
  return now
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .split('.')[0]; // Remove milliseconds
}

/**
 * Generate filename with timestamp
 */
export function generateTimestampedFilename(
  baseName: string,
  extension: string = 'json'
): string {
  const sanitized = sanitizeFilename(baseName);
  const timestamp = getTimestampString();
  return `${sanitized}_${timestamp}.${extension}`;
}

/**
 * Estimate file size for large exports
 */
export function estimateJSONSize(data: unknown): number {
  try {
    return new Blob([JSON.stringify(data)]).size;
  } catch (error) {
    console.warn('Failed to estimate JSON size:', error);
    return 0;
  }
}

/**
 * Check if download is supported in current environment
 */
export function isDownloadSupported(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof URL !== 'undefined' &&
    typeof Blob !== 'undefined' &&
    'createObjectURL' in URL
  );
}

/**
 * Batch download multiple files (creates zip-like structure)
 */
export interface BatchDownloadFile {
  filename: string;
  content: string | Blob;
  mimeType?: string;
}

export function downloadBatch(
  files: BatchDownloadFile[],
  batchName: string = 'batch_download'
): void {
  // For browser extensions, we'll download each file separately
  // In a full application, you might want to create a ZIP file

  files.forEach((file, index) => {
    setTimeout(() => {
      if (file.content instanceof Blob) {
        downloadAsBlob(file.content, {
          filename: file.filename,
          mimeType: file.mimeType,
        });
      } else {
        downloadAsBlob(file.content, {
          filename: file.filename,
          mimeType: file.mimeType || 'text/plain;charset=utf-8',
        });
      }
    }, index * 500); // Stagger downloads to avoid browser blocking
  });
}
