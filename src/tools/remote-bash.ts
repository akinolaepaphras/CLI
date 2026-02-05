import type { Tool, ToolDefinition, ToolResult } from './types.js';
import type { SandboxManager } from '../sandbox/index.js';
import chalk from 'chalk';

/**
 * RemoteBashTool - Execute commands in the isolated E2B sandbox
 *
 * Use for:
 * - Running generated code (Python, Node.js, etc.)
 * - Installing packages in isolated environment
 * - Any potentially unsafe or untrusted operations
 *
 * The sandbox is isolated from the user's machine, so it's safe to run
 * arbitrary code without risking system damage.
 */
export class RemoteBashTool implements Tool {
  private sandboxManager: SandboxManager;

  definition: ToolDefinition = {
    name: 'remote_bash',
    description: 'Execute a shell command in the REMOTE E2B sandbox (isolated environment). Use for running code, testing scripts, or any potentially unsafe operations. Files must be synced first using sync_file.',
    input_schema: {
      type: 'object' as const,
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to execute in the sandbox'
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 60000 = 1 minute)'
        }
      },
      required: ['command']
    }
  };

  constructor(sandboxManager: SandboxManager) {
    this.sandboxManager = sandboxManager;
  }

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const { command, timeout = 60000 } = input as {
      command: string;
      timeout?: number;
    };

    console.log(chalk.cyan(`[sandbox] $ ${command}`));

    try {
      const result = await this.sandboxManager.execute(command, timeout);

      // Print output in real-time style
      if (result.stdout) {
        process.stdout.write(chalk.gray(result.stdout));
        if (!result.stdout.endsWith('\n')) {
          process.stdout.write('\n');
        }
      }
      if (result.stderr) {
        process.stderr.write(chalk.yellow(result.stderr));
        if (!result.stderr.endsWith('\n')) {
          process.stderr.write('\n');
        }
      }

      if (result.success) {
        return {
          success: true,
          output: result.stdout || '(no output)'
        };
      } else {
        return {
          success: false,
          error: result.stderr || `Command exited with code ${result.exitCode}`,
          output: result.stdout
        };
      }
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: `Sandbox execution failed: ${err.message}`
      };
    }
  }
}
