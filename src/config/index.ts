import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { config as loadEnv } from 'dotenv';
import type { Config, CLIOptions } from './types.js';

export async function loadConfig(cliOptions: CLIOptions): Promise<Config> {
  // Load .env file from current directory
  loadEnv();

  // Try loading config from file
  const configPaths = [
    path.join(process.cwd(), '.claude', 'config.json'),
    path.join(os.homedir(), '.claude', 'config.json')
  ];

  let fileConfig: Partial<Config> = {};

  for (const configPath of configPaths) {
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      fileConfig = { ...fileConfig, ...JSON.parse(content) };
    } catch {
      // Config file doesn't exist, that's ok
    }
  }

  // Merge configurations (CLI > ENV > File > Defaults)
  const config: Config = {
    apiKey: cliOptions.apiKey || process.env.ANTHROPIC_API_KEY || fileConfig.apiKey || '',
    model: cliOptions.model || process.env.CLAUDE_MODEL || fileConfig.model || 'claude-sonnet-4-20250514',
    stream: cliOptions.stream !== false,
    workingDirectory: process.cwd(),
    maxTokens: fileConfig.maxTokens || 8192
  };

  // Validate required config
  if (!config.apiKey) {
    throw new Error(
      'Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable or use --api-key flag.'
    );
  }

  return config;
}

export type { Config, CLIOptions } from './types.js';
