import type { Tool, ToolDefinition, ToolResult } from './types.js';
import { FileReadTool } from './file-read.js';
import { FileWriteTool } from './file-write.js';
import { FileEditTool } from './file-edit.js';
import { BashTool } from './bash.js';
import { GlobTool } from './glob.js';
import type { Config } from '../config/types.js';
import chalk from 'chalk';

export class ToolExecutor {
  private tools: Map<string, Tool>;

  constructor(config: Config) {
    this.tools = new Map();

    // Register all tools
    this.register(new FileReadTool(config));
    this.register(new FileWriteTool(config));
    this.register(new FileEditTool(config));
    this.register(new BashTool(config));
    this.register(new GlobTool(config));
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

    console.log(chalk.magenta(`\n[Tool: ${name}]`));

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
