import type { Message, ContentBlock, ToolResultBlockParam } from '../client/types.js';

export class MessageHistory {
  private messages: Message[] = [];

  addUserMessage(content: string): void {
    this.messages.push({
      role: 'user',
      content
    });
  }

  addAssistantMessage(content: ContentBlock[]): void {
    this.messages.push({
      role: 'assistant',
      content
    });
  }

  addToolResult(toolUseId: string, result: string): void {
    const toolResult: ToolResultBlockParam = {
      type: 'tool_result',
      tool_use_id: toolUseId,
      content: result
    };

    this.messages.push({
      role: 'user',
      content: [toolResult]
    });
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  clear(): void {
    this.messages = [];
  }

  getLength(): number {
    return this.messages.length;
  }

  // Rough token estimation for context management
  getTokenEstimate(): number {
    const totalChars = JSON.stringify(this.messages).length;
    return Math.ceil(totalChars / 4);
  }
}
