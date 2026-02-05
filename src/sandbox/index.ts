import { Sandbox } from '@e2b/code-interpreter';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';
import type { SandboxConfig, ExecutionResult, FileOperationResult } from './types.js';

/**
 * SandboxManager - Singleton class for managing E2B sandbox lifecycle
 *
 * Ensures only ONE sandbox instance exists per CLI session to:
 * - Persist state across commands
 * - Avoid creating multiple expensive sandbox instances
 * - Enable proper cleanup on exit
 */
export class SandboxManager {
  private static instance: SandboxManager | null = null;
  private sandbox: Sandbox | null = null;
  private config: SandboxConfig;
  private initialized: boolean = false;

  private constructor(config: SandboxConfig = {}) {
    this.config = {
      timeout: config.timeout ?? 5 * 60 * 1000, // 5 minutes default
      eager: config.eager ?? false
    };
  }

  /**
   * Get the singleton instance of SandboxManager
   */
  static getInstance(config?: SandboxConfig): SandboxManager {
    if (!SandboxManager.instance) {
      SandboxManager.instance = new SandboxManager(config);
    }
    return SandboxManager.instance;
  }

  /**
   * Initialize the sandbox (lazy by default, called on first use)
   */
  async initialize(): Promise<void> {
    if (this.initialized && this.sandbox) {
      return;
    }

    console.log(chalk.cyan('🔄 Initializing E2B sandbox...'));

    try {
      this.sandbox = await Sandbox.create({
        timeoutMs: this.config.timeout
      });
      this.initialized = true;
      console.log(chalk.green('✓ Sandbox ready'));
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red(`✗ Failed to create sandbox: ${err.message}`));
      throw error;
    }
  }

  /**
   * Ensure sandbox is initialized before use
   */
  private async ensureInitialized(): Promise<Sandbox> {
    if (!this.sandbox) {
      await this.initialize();
    }
    if (!this.sandbox) {
      throw new Error('Sandbox failed to initialize');
    }
    return this.sandbox;
  }

  /**
   * Execute a command in the sandbox
   */
  async execute(command: string, timeoutMs?: number): Promise<ExecutionResult> {
    const sandbox = await this.ensureInitialized();

    try {
      const result = await sandbox.commands.run(command, {
        timeoutMs: timeoutMs ?? 60000 // 1 minute default per command
      });

      return {
        success: result.exitCode === 0,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        stdout: '',
        stderr: err.message,
        exitCode: 1
      };
    }
  }

  /**
   * Upload a file from local machine to sandbox
   */
  async uploadFile(localPath: string, remotePath?: string): Promise<FileOperationResult> {
    const sandbox = await this.ensureInitialized();

    try {
      // Read local file as string (for text files) or base64 for binary
      const content = await fs.readFile(localPath, 'utf-8');

      // Determine remote path (use same basename if not specified)
      const targetPath = remotePath ?? `/home/user/${path.basename(localPath)}`;

      // Ensure parent directory exists in sandbox
      const parentDir = path.dirname(targetPath);
      await sandbox.commands.run(`mkdir -p ${parentDir}`);

      // Write file to sandbox using string content
      await sandbox.files.write(targetPath, content);

      return {
        success: true,
        message: `Uploaded ${localPath} → ${targetPath}`
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: `Failed to upload file: ${err.message}`
      };
    }
  }

  /**
   * Download a file from sandbox to local machine
   */
  async downloadFile(remotePath: string, localPath: string): Promise<FileOperationResult> {
    const sandbox = await this.ensureInitialized();

    try {
      // Read from sandbox
      const content = await sandbox.files.read(remotePath);

      // Ensure local directory exists
      await fs.mkdir(path.dirname(localPath), { recursive: true });

      // Write locally
      await fs.writeFile(localPath, content);

      return {
        success: true,
        message: `Downloaded ${remotePath} → ${localPath}`
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: `Failed to download file: ${err.message}`
      };
    }
  }

  /**
   * Check if sandbox is currently active
   */
  isActive(): boolean {
    return this.initialized && this.sandbox !== null;
  }

  /**
   * Cleanup and kill the sandbox
   */
  async cleanup(): Promise<void> {
    if (this.sandbox) {
      console.log(chalk.yellow('🧹 Cleaning up sandbox...'));
      try {
        await this.sandbox.kill();
        console.log(chalk.green('✓ Sandbox terminated'));
      } catch (error) {
        const err = error as Error;
        console.error(chalk.red(`✗ Error during cleanup: ${err.message}`));
      }
      this.sandbox = null;
      this.initialized = false;
    }
    SandboxManager.instance = null;
  }
}

export type { SandboxConfig, ExecutionResult, FileOperationResult } from './types.js';
