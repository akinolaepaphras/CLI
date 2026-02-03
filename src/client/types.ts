import Anthropic from '@anthropic-ai/sdk';

export type Message = Anthropic.MessageParam;
export type ContentBlock = Anthropic.ContentBlock;
export type TextBlock = Anthropic.TextBlock;
export type ToolUseBlock = Anthropic.ToolUseBlock;
export type ToolResultBlockParam = Anthropic.ToolResultBlockParam;
export type Tool = Anthropic.Tool;
export type MessageResponse = Anthropic.Message;

export interface ChatOptions {
  tools?: Tool[];
  stream?: boolean;
  systemPrompt?: string;
  onStreamStart?: () => void;  // Callback when streaming begins
}
