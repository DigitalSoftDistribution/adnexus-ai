// ============================================================================
// Temporary File Manager
// Handles creation, tracking, and cleanup of temp files during report generation
// ============================================================================

import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

/** Tracks temporary files created during a job for later cleanup */
export class TempFileManager {
  private files: Set<string> = new Set();
  private directories: Set<string> = new Set();
  private baseDir: string;

  constructor(baseDir: string = '/tmp/report-worker') {
    this.baseDir = baseDir;
  }

  /** Initialize the temp directory */
  async initialize(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
    const jobDir = path.join(this.baseDir, uuidv4());
    await fs.mkdir(jobDir, { recursive: true });
    this.directories.add(jobDir);
  }

  /** Create a temporary file path (file not yet created) */
  createTempPath(prefix: string, extension: string): string {
    const jobDir = Array.from(this.directories).pop() || this.baseDir;
    const fileName = `${prefix}-${uuidv4()}${extension}`;
    const filePath = path.join(jobDir, fileName);
    this.files.add(filePath);
    return filePath;
  }

  /** Track an externally created file for cleanup */
  trackFile(filePath: string): void {
    this.files.add(filePath);
  }

  /** Check if a file exists */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /** Get file size in bytes */
  async getFileSize(filePath: string): Promise<number> {
    const stat = await fs.stat(filePath);
    return stat.size;
  }

  /** Remove a single tracked file */
  async removeFile(filePath: string): Promise<void> {
    try {
      if (await this.exists(filePath)) {
        await fs.unlink(filePath);
      }
    } catch (error) {
      console.warn(`[TempFileManager] Failed to remove file ${filePath}:`, error);
    } finally {
      this.files.delete(filePath);
    }
  }

  /** Clean up all tracked files and directories */
  async cleanup(): Promise<void> {
    const errors: string[] = [];

    // Remove all tracked files
    for (const filePath of Array.from(this.files)) {
      try {
        if (await this.exists(filePath)) {
          await fs.unlink(filePath);
        }
      } catch (error) {
        errors.push(`Failed to remove file ${filePath}: ${(error as Error).message}`);
      }
    }
    this.files.clear();

    // Remove all tracked directories
    for (const dirPath of Array.from(this.directories)) {
      try {
        if (await this.exists(dirPath)) {
          await fs.rmdir(dirPath, { recursive: true });
        }
      } catch (error) {
        errors.push(`Failed to remove directory ${dirPath}: ${(error as Error).message}`);
      }
    }
    this.directories.clear();

    if (errors.length > 0) {
      console.warn('[TempFileManager] Cleanup completed with errors:', errors);
    }
  }

  /** Get count of tracked files */
  get trackedFileCount(): number {
    return this.files.size;
  }

  /** Get count of tracked directories */
  get trackedDirectoryCount(): number {
    return this.directories.size;
  }
}
