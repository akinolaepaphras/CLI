import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Tool, ToolDefinition, ToolResult } from './types.js';
import type { Config } from '../config/types.js';

export class FileWriteTool implements Tool {
  private config: Config;

  definition: ToolDefinition = {
    name: 'write_file',
    description: 'Write content to a file. Creates the file if it does not exist, or overwrites if it does. Creates parent directories as needed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to write'
        },
        content: {
          type: 'string',
          description: 'The content to write to the file'
        }
      },
      required: ['path', 'content']
    }
  };

  constructor(config: Config) {
    this.config = config;
  }

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const { path: filePath, content } = input as {
      path: string;
      content: string;
    };

    try {
      const resolvedPath = path.resolve(this.config.workingDirectory, filePath);

      // Security check
      if (!resolvedPath.startsWith(this.config.workingDirectory)) {
        return {
          success: false,
          error: 'Access denied: Path is outside working directory'
        };
      }

      // Ensure directory exists
      await fs.mkdir(path.dirname(resolvedPath), { recursive: true });

      // Write file
      await fs.writeFile(resolvedPath, content, 'utf-8');

      const lines = content.split('\n').length;
      return {
        success: true,
        output: `Successfully wrote ${content.length} characters (${lines} lines) to ${filePath}`
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: `Failed to write file: ${err.message}`
      };
    }
  }
}
