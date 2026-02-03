import { glob } from 'glob';
import type { Tool, ToolDefinition, ToolResult } from './types.js';
import type { Config } from '../config/types.js';

export class GlobTool implements Tool {
  private config: Config;

  definition: ToolDefinition = {
    name: 'glob',
    description: 'Find files matching a glob pattern. Returns a list of file paths. Use patterns like "**/*.ts" for TypeScript files or "src/**/*" for all files in src.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: {
          type: 'string',
          description: 'The glob pattern to match files (e.g., "**/*.js", "src/**/*.ts")'
        },
        ignore: {
          type: 'array',
          items: { type: 'string' },
          description: 'Patterns to ignore (e.g., ["node_modules/**", "dist/**"])'
        }
      },
      required: ['pattern']
    }
  };

  constructor(config: Config) {
    this.config = config;
  }

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const { pattern, ignore = ['node_modules/**', 'dist/**', '.git/**'] } = input as {
      pattern: string;
      ignore?: string[];
    };

    try {
      const files = await glob(pattern, {
        cwd: this.config.workingDirectory,
        ignore: ignore,
        nodir: true
      });

      if (files.length === 0) {
        return {
          success: true,
          output: 'No files found matching the pattern'
        };
      }

      // Sort files and limit output
      const sortedFiles = files.sort();
      const maxFiles = 100;
      const displayFiles = sortedFiles.slice(0, maxFiles);

      let output = displayFiles.join('\n');
      if (sortedFiles.length > maxFiles) {
        output += `\n... and ${sortedFiles.length - maxFiles} more files`;
      }

      return {
        success: true,
        output: `Found ${files.length} files:\n${output}`
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: `Failed to search files: ${err.message}`
      };
    }
  }
}
