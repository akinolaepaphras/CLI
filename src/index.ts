#!/usr/bin/env node
import { config as loadEnv } from 'dotenv';

// Load .env FIRST before any other imports that might need env vars
loadEnv();

import { program } from 'commander';
import { loadConfig } from './config/index.js';
import { startRepl } from './repl.js';
import { ClaudeClient } from './client/index.js';
import chalk from 'chalk';

async function main(): Promise<void> {
  program
    .name('claude-cli')
    .description('Interactive CLI for Claude AI with file and command capabilities')
    .version('1.0.0')
    .option('-m, --model <model>', 'Claude model to use', 'claude-sonnet-4-20250514')
    .option('-k, --api-key <key>', 'Anthropic API key (or set ANTHROPIC_API_KEY)')
    .option('--no-stream', 'Disable streaming responses')
    .argument('[prompt]', 'Initial prompt to send (optional)')
    .action(async (prompt: string | undefined, options) => {
      try {
        const config = await loadConfig({
          model: options.model,
          apiKey: options.apiKey,
          stream: options.stream
        });

        const client = new ClaudeClient(config);
        await startRepl(client, config, prompt);
      } catch (error) {
        const err = error as Error;
        console.error(chalk.red('Error: ' + err.message));
        process.exit(1);
      }
    });

  await program.parseAsync();
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
