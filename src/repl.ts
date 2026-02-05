import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { ClaudeClient } from './client/index.js';
import { MessageHistory } from './messages/index.js';
import { ToolExecutor } from './tools/index.js';
import { SandboxManager } from './sandbox/index.js';
import { colors } from './ui/index.js';
import type { Config } from './config/types.js';
import type { ToolUseBlock } from './client/types.js';
import chalk from 'chalk';

export async function startRepl(
  client: ClaudeClient,
  config: Config,
  initialPrompt?: string
): Promise<void> {
  const history = new MessageHistory();

  // Get singleton SandboxManager instance (lazy initialization)
  const sandboxManager = SandboxManager.getInstance();

  // Create tool executor with sandbox manager
  const toolExecutor = new ToolExecutor(config, sandboxManager);

  const rl = readline.createInterface({ input, output });

  // Cleanup function for sandbox
  const cleanup = async () => {
    if (sandboxManager.isActive()) {
      await sandboxManager.cleanup();
    }
  };

  // Handle Ctrl+C gracefully
  process.on('SIGINT', async () => {
    console.log(colors.muted('\n'));
    await cleanup();
    console.log(colors.muted('Goodbye!'));
    rl.close();
    process.exit(0);
  });

  // Print welcome banner
  console.log();
  console.log(colors.logo('╭─────────────────────────────────────╮'));
  console.log(colors.logo('│       Claude CLI (Hybrid Mode)      │'));
  console.log(colors.logo('╰─────────────────────────────────────╯'));
  console.log();
  console.log(colors.muted('Type your message to chat with Claude.'));
  console.log(colors.muted('Commands: /help, /clear, /sandbox, /exit'));
  console.log();

  // Handle initial prompt if provided
  if (initialPrompt) {
    await processUserMessage(initialPrompt, client, history, toolExecutor, config);
  }

  // Main REPL loop
  while (true) {
    let userInput: string;

    try {
      userInput = await rl.question(colors.prompt('> '));
    } catch {
      // Handle Ctrl+C or closed input
      break;
    }

    if (!userInput.trim()) continue;

    // Handle special commands
    if (userInput.startsWith('/')) {
      const shouldContinue = await handleCommand(userInput, history, sandboxManager);
      if (!shouldContinue) break;
      continue;
    }

    await processUserMessage(userInput, client, history, toolExecutor, config);
  }

  // Cleanup before exit
  await cleanup();
  console.log(colors.muted('\nGoodbye!'));
  rl.close();
}

async function processUserMessage(
  userInput: string,
  client: ClaudeClient,
  history: MessageHistory,
  toolExecutor: ToolExecutor,
  config: Config
): Promise<void> {
  history.addUserMessage(userInput);

  // Agentic loop - keep processing until no more tool calls
  let continueLoop = true;

  while (continueLoop) {
    // Show simple "thinking" indicator (no spinner to avoid conflicts)
    process.stdout.write(colors.muted('Thinking... '));

    try {
      const response = await client.chat(history.getMessages(), {
        tools: toolExecutor.getToolDefinitions(),
        stream: config.stream,
        onStreamStart: () => {
          // Clear the "Thinking..." text when streaming starts
          process.stdout.write('\r' + ' '.repeat(20) + '\r');
        }
      });

      // Check for tool use
      const toolUseBlocks = response.content.filter(
        (block): block is ToolUseBlock => block.type === 'tool_use'
      );

      if (toolUseBlocks.length > 0) {
        // Clear thinking indicator if still there
        process.stdout.write('\r' + ' '.repeat(20) + '\r');

        // Add assistant message with tool calls
        history.addAssistantMessage(response.content);

        // Execute each tool and add results
        for (const toolUse of toolUseBlocks) {
          const result = await toolExecutor.execute(
            toolUse.name,
            toolUse.input as Record<string, unknown>
          );
          history.addToolResult(toolUse.id, result);
        }
        // Continue loop to let Claude process tool results
      } else {
        // No tool calls - we're done
        history.addAssistantMessage(response.content);
        continueLoop = false;
      }
    } catch (error) {
      // Clear thinking indicator
      process.stdout.write('\r' + ' '.repeat(20) + '\r');
      const err = error as Error;
      console.error(chalk.red(`Error: ${err.message}\n`));
      continueLoop = false;
    }
  }

  console.log(); // Add spacing after response
}

async function handleCommand(
  command: string,
  history: MessageHistory,
  sandboxManager: SandboxManager
): Promise<boolean> {
  const cmd = command.toLowerCase().trim();

  switch (cmd) {
    case '/exit':
    case '/quit':
    case '/q':
      return false;

    case '/clear':
      history.clear();
      console.clear();
      console.log(colors.success('Conversation cleared.\n'));
      return true;

    case '/help':
    case '/h':
      printHelp();
      return true;

    case '/history':
      console.log(colors.info(`Messages in history: ${history.getLength()}`));
      console.log(colors.info(`Estimated tokens: ${history.getTokenEstimate()}\n`));
      return true;

    case '/sandbox':
      if (sandboxManager.isActive()) {
        console.log(colors.success('Sandbox is active ✓\n'));
      } else {
        console.log(colors.warning('Sandbox not initialized (will start on first remote command)\n'));
      }
      return true;

    default:
      console.log(colors.warning(`Unknown command: ${command}`));
      console.log(colors.muted('Type /help for available commands.\n'));
      return true;
  }
}

function printHelp(): void {
  console.log();
  console.log(colors.highlight('Available Commands:'));
  console.log();
  console.log('  ' + colors.command('/help, /h') + '     - Show this help message');
  console.log('  ' + colors.command('/clear') + '       - Clear conversation history');
  console.log('  ' + colors.command('/history') + '     - Show conversation stats');
  console.log('  ' + colors.command('/sandbox') + '     - Check sandbox status');
  console.log('  ' + colors.command('/exit, /q') + '    - Exit the CLI');
  console.log();
  console.log(colors.highlight('Local Tools (your machine):'));
  console.log();
  console.log('  ' + colors.toolName('read_file') + '    - Read contents of a file');
  console.log('  ' + colors.toolName('write_file') + '   - Create or overwrite a file');
  console.log('  ' + colors.toolName('edit_file') + '    - Edit a file by string replacement');
  console.log('  ' + colors.toolName('glob') + '         - Find files by pattern');
  console.log('  ' + colors.toolName('local_bash') + '   - Run trusted local commands (git, npm)');
  console.log();
  console.log(colors.highlight('Remote Tools (E2B sandbox):'));
  console.log();
  console.log('  ' + colors.toolName('remote_bash') + '  - Execute code in isolated sandbox');
  console.log('  ' + colors.toolName('sync_file') + '    - Upload file to sandbox');
  console.log('  ' + colors.toolName('browser_fetch') + ' - Fetch web page content');
  console.log();
}
