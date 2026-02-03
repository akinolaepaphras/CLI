export interface Config {
  apiKey: string;
  model: string;
  stream: boolean;
  workingDirectory: string;
  maxTokens: number;
}

export interface CLIOptions {
  model?: string;
  apiKey?: string;
  stream?: boolean;
}
