import type { Tool as AnthropicTool } from '../client/types.js';

export type ToolDefinition = AnthropicTool;

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface Tool {
  definition: ToolDefinition;
  execute(input: Record<string, unknown>): Promise<ToolResult>;
}
