import type { Tool, ToolDefinition, ToolResult } from './types.js';
import { FileReadTool } from './file-read.js';
import { FileWriteTool } from './file-write.js';
import { FileEditTool } from './file-edit.js';
import { GlobTool } from './glob.js';
import { LocalBashTool } from './local-bash.js';
import { RemoteBashTool } from './remote-bash.js';
import { SyncFileTool } from './sync.js';
import { BrowserTool } from './browser.js';
import type { Config } from '../config/types.js';
import type { SandboxManager } from '../sandbox/index.js';
import chalk from 'chalk';

/**
 * ToolExecutor - Registry and executor for all tools
 *
 * Tools are organized into two categories:
 * - LOCAL: Operate on the user's machine (file operations, git, npm)
 * - REMOTE: Operate in the E2B sandbox (code execution, testing)
 */
export class ToolExecutor {
  private tools: Map<string, Tool>;

  constructor(config: Config, sandboxManager: SandboxManager) {
    this.tools = new Map();

    // ============================================
    // LOCAL TOOLS (operate on user's machine)
    // ============================================
    this.register(new FileReadTool(config));
    this.register(new FileWriteTool(config));
    this.register(new FileEditTool(config));
    this.register(new GlobTool(config));
    this.register(new LocalBashTool(config));

    // ============================================
    // REMOTE TOOLS (operate in E2B sandbox)
    // ============================================
    this.register(new SyncFileTool(config, sandboxManager));
    this.register(new RemoteBashTool(sandboxManager));
    this.register(new BrowserTool(sandboxManager));
  }

  private register(tool: Tool): void {
    this.tools.set(tool.definition.name, tool);
  }

  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  async execute(name: string, input: Record<string, unknown>): Promise<string> {
    const tool = this.tools.get(name);

    if (!tool) {
      return JSON.stringify({ success: false, error: `Unknown tool: ${name}` });
    }

    // Determine if this is a local or remote tool
    const isRemote = ['remote_bash', 'sync_file', 'browser_fetch'].includes(name);
    const prefix = isRemote ? chalk.cyan('[remote]') : chalk.gray('[local]');

    console.log(chalk.magenta(`\n${prefix} Tool: ${name}`));

    try {
      const result = await tool.execute(input);

      if (result.success) {
        console.log(chalk.green('✓ Success'));
      } else {
        console.log(chalk.red(`✗ Error: ${result.error}`));
      }

      return JSON.stringify(result);
    } catch (error) {
      const err = error as Error;
      const errorResult: ToolResult = {
        success: false,
        error: err.message
      };
      console.log(chalk.red(`✗ Error: ${err.message}`));
      return JSON.stringify(errorResult);
    }
  }
}

export type { Tool, ToolDefinition, ToolResult } from './types.js';
