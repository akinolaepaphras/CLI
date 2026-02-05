import * as path from 'node:path';
import type { Tool, ToolDefinition, ToolResult } from './types.js';
import type { Config } from '../config/types.js';
import type { SandboxManager } from '../sandbox/index.js';
import chalk from 'chalk';

/**
 * SyncFileTool - Upload local files to the E2B sandbox
 *
 * This is a critical tool for the hybrid architecture:
 * - Files exist on the user's LOCAL machine
 * - Code runs in the REMOTE sandbox
 * - This tool bridges the gap by syncing files to the sandbox
 *
 * Typical workflow:
 * 1. Read/edit files locally
 * 2. Sync files to sandbox
 * 3. Run code in sandbox using remote_bash
 */
export class SyncFileTool implements Tool {
  private config: Config;
  private sandboxManager: SandboxManager;

  definition: ToolDefinition = {
    name: 'sync_file',
    description: 'Upload a file from the LOCAL machine to the REMOTE E2B sandbox. Use this before running code that needs access to local files. The file will be available in the sandbox at the specified remote path.',
    input_schema: {
      type: 'object' as const,
      properties: {
        local_path: {
          type: 'string',
          description: 'Path to the file on the local machine (relative to working directory or absolute)'
        },
        remote_path: {
          type: 'string',
          description: 'Path in the sandbox where the file should be placed (default: /home/user/<filename>)'
        }
      },
      required: ['local_path']
    }
  };

  constructor(config: Config, sandboxManager: SandboxManager) {
    this.config = config;
    this.sandboxManager = sandboxManager;
  }

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const { local_path, remote_path } = input as {
      local_path: string;
      remote_path?: string;
    };

    // Resolve local path
    const resolvedLocalPath = path.resolve(this.config.workingDirectory, local_path);

    // Security check - ensure path is within working directory
    if (!resolvedLocalPath.startsWith(this.config.workingDirectory)) {
      return {
        success: false,
        error: 'Access denied: Path is outside working directory'
      };
    }

    // Determine remote path
    const targetRemotePath = remote_path ?? `/home/user/${path.basename(local_path)}`;

    console.log(chalk.cyan(`[sync] ${local_path} → ${targetRemotePath}`));

    try {
      const result = await this.sandboxManager.uploadFile(resolvedLocalPath, targetRemotePath);

      if (result.success) {
        console.log(chalk.green('✓ File synced'));
        return {
          success: true,
          output: result.message
        };
      } else {
        console.log(chalk.red(`✗ ${result.error}`));
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: `Failed to sync file: ${err.message}`
      };
    }
  }
}
