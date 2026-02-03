import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Tool, ToolDefinition, ToolResult } from './types.js';
import type { Config } from '../config/types.js';

export class FileReadTool implements Tool {
  private config: Config;

  definition: ToolDefinition = {
    name: 'read_file',
    description: 'Read the contents of a file from the filesystem. Returns the file content with line numbers.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to read (absolute or relative to working directory)'
        },
        offset: {
          type: 'number',
          description: 'Line number to start reading from (1-indexed, optional)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of lines to read (optional)'
        }
      },
      required: ['path']
    }
  };

  constructor(config: Config) {
    this.config = config;
  }

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const { path: filePath, offset, limit } = input as {
      path: string;
      offset?: number;
      limit?: number;
    };

    try {
      const resolvedPath = path.resolve(this.config.workingDirectory, filePath);

      // Security check - ensure path is within working directory
      if (!resolvedPath.startsWith(this.config.workingDirectory)) {
        return {
          success: false,
          error: 'Access denied: Path is outside working directory'
        };
      }

      const content = await fs.readFile(resolvedPath, 'utf-8');
      let lines = content.split('\n');

      const startLine = offset && offset > 0 ? offset : 1;

      // Apply offset
      if (offset && offset > 1) {
        lines = lines.slice(offset - 1);
      }

      // Apply limit
      if (limit && limit > 0) {
        lines = lines.slice(0, limit);
      }

      // Add line numbers
      const numberedLines = lines.map(
        (line, i) => `${String(startLine + i).padStart(6)}  ${line}`
      );

      return {
        success: true,
        output: numberedLines.join('\n')
      };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return {
          success: false,
          error: `File not found: ${filePath}`
        };
      }
      return {
        success: false,
        error: `Failed to read file: ${err.message}`
      };
    }
  }
}
