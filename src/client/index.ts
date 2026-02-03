import Anthropic from '@anthropic-ai/sdk';
import type { Config } from '../config/types.js';
import type { Message, Tool, MessageResponse, ChatOptions } from './types.js';

export class ClaudeClient {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(config: Config) {
    this.client = new Anthropic({
      apiKey: config.apiKey
    });
    this.model = config.model;
    this.maxTokens = config.maxTokens;
  }

  async chat(
    messages: Message[],
    options: ChatOptions = {}
  ): Promise<MessageResponse> {
    const { tools, stream = true, systemPrompt, onStreamStart } = options;

    if (stream) {
      return this.streamChat(messages, tools, systemPrompt, onStreamStart);
    }

    return this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemPrompt || this.getDefaultSystemPrompt(),
      messages,
      tools
    });
  }

  private async streamChat(
    messages: Message[],
    tools?: Tool[],
    systemPrompt?: string,
    onStreamStart?: () => void
  ): Promise<MessageResponse> {
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemPrompt || this.getDefaultSystemPrompt(),
      messages,
      tools
    });

    let streamStarted = false;

    // Handle streaming text events - print in real-time
    stream.on('text', (text) => {
      if (!streamStarted) {
        streamStarted = true;
        // Signal that streaming has started (so spinner can stop)
        onStreamStart?.();
      }
      process.stdout.write(text);
    });

    const finalMessage = await stream.finalMessage();

    // Add newline after streamed content if there was text
    const hasText = finalMessage.content.some(block => block.type === 'text');
    if (hasText && streamStarted) {
      process.stdout.write('\n');
    }

    return finalMessage;
  }

  private getDefaultSystemPrompt(): string {
    return `You are Claude, an AI assistant running in an interactive CLI. You have access to tools for file operations and command execution.

When helping users:
- Read files before editing to understand their content and context
- Use the bash tool for running shell commands
- Explain what you're doing before taking actions
- Handle errors gracefully and inform the user
- Be concise but helpful in your responses

You are working in the directory: ${process.cwd()}`;
  }
}

export type { Message, Tool, MessageResponse, ChatOptions } from './types.js';
