import { spawn } from 'node:child_process';
import type { Tool, ToolDefinition, ToolResult } from './types.js';
import type { Config } from '../config/types.js';
import chalk from 'chalk';

/**
 * LocalBashTool - Execute trusted commands on the user's local machine
 *
 * Use for:
 * - Git operations (git commit, git push, etc.)
 * - Package management (npm install, pip install)
 * - Local file operations that need shell features
 *
 * For running untrusted or generated code, use RemoteBashTool instead.
 */
export class LocalBashTool implements Tool {
  private config: Config;

  definition: ToolDefinition = {
    name: 'local_bash',
    description: 'Execute trusted shell commands on the LOCAL machine (not sandboxed). Use for git operations, npm/pip install, and other trusted operations. For running code or untrusted commands, use remote_bash instead.',
    input_schema: {
      type: 'object' as const,
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to execute locally'
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 120000 = 2 minutes)'
        }
      },
      required: ['command']
    }
  };

  constructor(config: Config) {
    this.config = config;
  }

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const { command, timeout = 120000 } = input as {
      command: string;
      timeout?: number;
    };

    console.log(chalk.dim(`[local] $ ${command}`));

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let killed = false;

      const proc = spawn('bash', ['-c', command], {
        cwd: this.config.workingDirectory,
        env: { ...process.env }
      });

      // Set up timeout
      const timeoutId = setTimeout(() => {
        killed = true;
        proc.kill('SIGTERM');
      }, timeout);

      proc.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        process.stdout.write(chalk.gray(text));
      });

      proc.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        process.stderr.write(chalk.yellow(text));
      });

      proc.on('close', (code) => {
        clearTimeout(timeoutId);

        if (killed) {
          resolve({
            success: false,
            error: `Command timed out after ${timeout}ms`,
            output: stdout
          });
          return;
        }

        if (code === 0) {
          resolve({
            success: true,
            output: stdout || '(no output)'
          });
        } else {
          resolve({
            success: false,
            error: stderr || `Command exited with code ${code}`,
            output: stdout
          });
        }
      });

      proc.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: `Failed to execute command: ${error.message}`
        });
      });
    });
  }
}
