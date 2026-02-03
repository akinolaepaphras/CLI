import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Tool, ToolDefinition, ToolResult } from './types.js';
import type { Config } from '../config/types.js';

export class FileEditTool implements Tool {
  private config: Config;

  definition: ToolDefinition = {
    name: 'edit_file',
    description: 'Edit a file by replacing a specific string with new content. The old_string must match exactly (including whitespace and indentation).',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to edit'
        },
        old_string: {
          type: 'string',
          description: 'The exact string to find and replace'
        },
        new_string: {
          type: 'string',
          description: 'The string to replace it with'
        }
      },
      required: ['path', 'old_string', 'new_string']
    }
  };

  constructor(config: Config) {
    this.config = config;
  }

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const { path: filePath, old_string, new_string } = input as {
      path: string;
      old_string: string;
      new_string: string;
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

      // Read existing content
      const content = await fs.readFile(resolvedPath, 'utf-8');

      // Check if old_string exists
      if (!content.includes(old_string)) {
        return {
          success: false,
          error: `String not found in file. Make sure old_string matches exactly including whitespace.`
        };
      }

      // Count occurrences
      const occurrences = content.split(old_string).length - 1;
      if (occurrences > 1) {
        return {
          success: false,
          error: `Found ${occurrences} occurrences of old_string. Please provide more context to make it unique.`
        };
      }

      // Perform replacement
      const newContent = content.replace(old_string, new_string);

      // Write back
      await fs.writeFile(resolvedPath, newContent, 'utf-8');

      return {
        success: true,
        output: `Successfully edited ${filePath}`
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
        error: `Failed to edit file: ${err.message}`
      };
    }
  }
}
