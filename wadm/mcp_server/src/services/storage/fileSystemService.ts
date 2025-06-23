/**
 * @fileoverview File System Service
 * @description Low-level file system operations with proper error handling
 * @module services/storage/fileSystemService
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { FileMetadata, StorageError } from '../../types/storage.js';
import { Logger } from '../../utils/logger.js';

/**
 * Service for handling file system operations
 */
export class FileSystemService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('FileSystemService');
  }

  /**
   * Ensure directory exists, create if not
   */
  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      if (!existsSync(dirPath)) {
        await fs.mkdir(dirPath, { recursive: true });
        this.logger.debug(`Created directory: ${dirPath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create directory ${dirPath}:`, error);
      throw this.createError('FILESYSTEM_ERROR', `Failed to create directory: ${error}`);
    }
  }

  /**
   * Write file with atomic operation
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const dir = path.dirname(filePath);
      await this.ensureDirectory(dir);
      
      // Write to temp file first, then rename (atomic operation)
      const tempPath = `${filePath}.tmp`;
      await fs.writeFile(tempPath, content, 'utf8');
      await fs.rename(tempPath, filePath);
      
      this.logger.debug(`Wrote file: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to write file ${filePath}:`, error);
      throw this.createError('WRITE_ERROR', `Failed to write file: ${error}`);
    }
  }

  /**
   * Read file content
   */
  async readFile(filePath: string): Promise<string | null> {
    try {
      if (!existsSync(filePath)) {
        return null;
      }
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      this.logger.error(`Failed to read file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      if (existsSync(filePath)) {
        await fs.unlink(filePath);
        this.logger.debug(`Deleted file: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file ${filePath}:`, error);
      throw this.createError('DELETE_ERROR', `Failed to delete file: ${error}`);
    }
  }

  /**
   * Get file metadata
   */
  async getFileStats(filePath: string): Promise<FileMetadata | null> {
    try {
      const stats = await fs.stat(filePath);
      return {
        path: filePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * List files in directory
   */
  async listFiles(dirPath: string): Promise<string[]> {
    try {
      if (!existsSync(dirPath)) {
        return [];
      }

      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isFile())
        .map(entry => path.join(dirPath, entry.name));
    } catch (error) {
      this.logger.error(`Failed to list directory ${dirPath}:`, error);
      return [];
    }
  }

  /**
   * Walk directory tree recursively
   */
  async walkDirectory(
    dirPath: string, 
    callback: (filePath: string, relativePath: string) => void | Promise<void>
  ): Promise<void> {
    const walk = async (currentPath: string): Promise<void> => {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          
          if (entry.isDirectory()) {
            await walk(fullPath);
          } else if (entry.isFile()) {
            const relativePath = path.relative(dirPath, fullPath);
            await callback(fullPath, relativePath);
          }
        }
      } catch (error) {
        this.logger.debug(`Cannot read directory ${currentPath}:`, error);
        // Continue walking other directories
      }
    };

    await walk(dirPath);
  }

  /**
   * Check if path exists
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create storage error
   */
  private createError(code: string, message: string): StorageError {
    const error = new Error(message) as StorageError;
    error.code = code as any;
    return error;
  }
}
