# Project Handoff: Claude CLI

## High-Level Overview

### What Is This?

A command-line interface that lets you chat with Claude AI directly from your terminal. Think of it as a local version of Claude Code — you can have conversations, and Claude can read/write files and run shell commands on your behalf.

### Why Was It Built?

To create an interactive AI coding assistant that:
- Runs locally in your terminal
- Can manipulate files and execute commands
- Streams responses in real-time
- Maintains conversation context

### Core User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   User types message  ──►  Claude thinks  ──►  Response shown   │
│         │                       │                               │
│         │                       ▼                               │
│         │              Need to use a tool?                      │
│         │                 │         │                           │
│         │                Yes        No                          │
│         │                 │         │                           │
│         │                 ▼         └──► Stream text response   │
│         │           Execute tool                                │
│         │           (read file,                                 │
│         │            run command,                               │
│         │            etc.)                                      │
│         │                 │                                     │
│         │                 ▼                                     │
│         │           Send result back to Claude                  │
│         │                 │                                     │
│         │                 └──► Loop until done                  │
│         │                                                       │
│         └──► Wait for next message                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Language | TypeScript | Type safety, modern JS features |
| Runtime | Node.js 18+ | JavaScript execution |
| AI | Anthropic SDK | Claude API communication |
| CLI Framework | Commander | Argument parsing |
| UI | Chalk | Terminal colors |

---

## Low-Level Architecture

### File Structure & Responsibilities

```
src/
├── index.ts          # Entry point - CLI setup with Commander
├── repl.ts           # REPL loop - handles user input/output cycle
├── config/
│   ├── index.ts      # Loads config from ENV, files, CLI args
│   └── types.ts      # Config interface definitions
├── client/
│   ├── index.ts      # ClaudeClient class - wraps Anthropic SDK
│   └── types.ts      # API-related type definitions
├── tools/
│   ├── index.ts      # ToolExecutor - registry & execution
│   ├── types.ts      # Tool interface definitions
│   ├── file-read.ts  # FileReadTool - reads files with line numbers
│   ├── file-write.ts # FileWriteTool - creates/overwrites files
│   ├── file-edit.ts  # FileEditTool - find/replace in files
│   ├── bash.ts       # BashTool - executes shell commands
│   └── glob.ts       # GlobTool - finds files by pattern
├── messages/
│   └── index.ts      # MessageHistory - conversation state
└── ui/
    ├── index.ts      # Barrel export
    ├── colors.ts     # Color scheme constants
    ├── markdown.ts   # Simple markdown-to-terminal renderer
    └── spinner.ts    # Loading indicator (ora wrapper)
```

### Key Components Deep Dive

#### 1. Entry Point (`src/index.ts`)

```typescript
// Sets up CLI with Commander
program
  .option('-m, --model <model>', 'Claude model')
  .option('-k, --api-key <key>', 'API key')
  .argument('[prompt]', 'Initial prompt')
  .action(async (prompt, options) => {
    const config = await loadConfig(options);
    const client = new ClaudeClient(config);
    await startRepl(client, config, prompt);
  });
```

**Responsibility:** Parse CLI arguments, initialize config, start the REPL.

#### 2. REPL Loop (`src/repl.ts`)

The heart of the application. Uses Node's `readline/promises` for input.

```typescript
// Simplified flow
while (true) {
  const userInput = await rl.question('> ');

  if (userInput.startsWith('/')) {
    handleCommand(userInput);  // /help, /exit, etc.
    continue;
  }

  await processUserMessage(userInput);
}
```

**Key function:** `processUserMessage()` implements the agentic loop:

```typescript
async function processUserMessage(input) {
  history.addUserMessage(input);

  while (true) {
    const response = await client.chat(history.getMessages(), { tools });

    const toolCalls = response.content.filter(b => b.type === 'tool_use');

    if (toolCalls.length === 0) {
      // No tools needed - we're done
      break;
    }

    // Execute each tool, add results to history
    for (const call of toolCalls) {
      const result = await toolExecutor.execute(call.name, call.input);
      history.addToolResult(call.id, result);
    }
    // Loop continues - Claude will process tool results
  }
}
```

#### 3. Claude Client (`src/client/index.ts`)

Wraps the Anthropic SDK with streaming support.

```typescript
class ClaudeClient {
  async chat(messages, options) {
    if (options.stream) {
      return this.streamChat(messages, options);
    }
    return this.client.messages.create({ ... });
  }

  private async streamChat(messages, options) {
    const stream = this.client.messages.stream({ ... });

    stream.on('text', (text) => {
      options.onStreamStart?.();  // Clear "Thinking..." indicator
      process.stdout.write(text); // Real-time output
    });

    return await stream.finalMessage();
  }
}
```

**Key detail:** The `onStreamStart` callback lets the REPL clear the loading indicator before text starts streaming.

#### 4. Tool System (`src/tools/`)

Each tool implements the `Tool` interface:

```typescript
interface Tool {
  definition: ToolDefinition;  // JSON schema for Claude
  execute(input: Record<string, unknown>): Promise<ToolResult>;
}

interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
}
```

**Tool Registration:** The `ToolExecutor` maintains a map of tools:

```typescript
class ToolExecutor {
  private tools: Map<string, Tool>;

  constructor(config) {
    this.register(new FileReadTool(config));
    this.register(new FileWriteTool(config));
    this.register(new BashTool(config));
    // ...
  }

  getToolDefinitions() {
    // Returns array for Claude API
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  async execute(name, input) {
    const tool = this.tools.get(name);
    const result = await tool.execute(input);
    return JSON.stringify(result);
  }
}
```

#### 5. Message History (`src/messages/index.ts`)

Maintains the conversation state for multi-turn interactions:

```typescript
class MessageHistory {
  private messages: Message[] = [];

  addUserMessage(content: string) {
    this.messages.push({ role: 'user', content });
  }

  addAssistantMessage(content: ContentBlock[]) {
    this.messages.push({ role: 'assistant', content });
  }

  addToolResult(toolUseId: string, result: string) {
    this.messages.push({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: toolUseId, content: result }]
    });
  }
}
```

**Important:** Tool results are sent as `user` messages with `tool_result` content blocks — this is how the Anthropic API expects them.

### Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                           User Input                                  │
└──────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         REPL (repl.ts)                                │
│  ┌─────────────┐    ┌──────────────────┐    ┌───────────────────┐   │
│  │ readline    │───►│ processMessage() │───►│ handleCommand()   │   │
│  │ question()  │    │                  │    │ (/help, /exit)    │   │
│  └─────────────┘    └──────────────────┘    └───────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    MessageHistory (messages/)                         │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ messages: [ {role: 'user', ...}, {role: 'assistant', ...} ]    │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    ClaudeClient (client/)                             │
│  ┌─────────────────────┐    ┌─────────────────────────────────────┐  │
│  │ Anthropic SDK       │───►│ messages.stream()                   │  │
│  │ @anthropic-ai/sdk   │    │ Real-time text output               │  │
│  └─────────────────────┘    └─────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
                                   │
                          (if tool_use blocks)
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    ToolExecutor (tools/)                              │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────┐  ┌──────────┐  │
│  │ read_file│  │ write_file│  │ edit_file│  │ bash │  │   glob   │  │
│  └──────────┘  └───────────┘  └──────────┘  └──────┘  └──────────┘  │
└──────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                         (result back to Claude)
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        Terminal Output                                │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Streamed response with colors (chalk) and markdown formatting   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### Security Considerations

| Risk | Mitigation |
|------|------------|
| Path traversal | All file ops validate path is within `cwd` |
| Command injection | Commands run via `spawn`, not `exec` |
| API key exposure | Stored in `.env`, gitignored |
| Runaway commands | 2-minute timeout on bash tool |
| Large outputs | Tool outputs are JSON-stringified (natural limit) |

### Configuration Hierarchy

```
CLI flags (highest priority)
    │
    ▼
Environment variables (ANTHROPIC_API_KEY, CLAUDE_MODEL)
    │
    ▼
Config files (~/.claude/config.json, ./.claude/config.json)
    │
    ▼
Defaults (lowest priority)
```

---

## Extension Points

### Adding a New Tool

1. Create `src/tools/my-tool.ts`:

```typescript
import type { Tool, ToolDefinition, ToolResult } from './types.js';

export class MyTool implements Tool {
  definition: ToolDefinition = {
    name: 'my_tool',
    description: 'What this tool does',
    input_schema: {
      type: 'object',
      properties: {
        param1: { type: 'string', description: '...' }
      },
      required: ['param1']
    }
  };

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    // Implementation
    return { success: true, output: 'result' };
  }
}
```

2. Register in `src/tools/index.ts`:

```typescript
this.register(new MyTool(config));
```

### Adding a New Command

In `src/repl.ts`, add to the `handleCommand` switch:

```typescript
case '/mycommand':
  // Do something
  return true;
```

---

## Known Limitations

1. **No conversation persistence** — History is lost when CLI exits
2. **No context window management** — Long conversations may exceed limits
3. **Single-threaded tool execution** — Tools run sequentially, not in parallel
4. **Basic markdown rendering** — Simplified regex-based, not full parser

---

## Build & Run Commands

```bash
npm install      # Install dependencies
npm run build    # Compile TypeScript → dist/
npm start        # Run compiled version
npm run dev      # Run with tsx (no build needed)
npm run typecheck # Type-check without emitting
```

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @anthropic-ai/sdk | ^0.39.0 | Claude API client |
| commander | ^13.1.0 | CLI argument parsing |
| chalk | ^5.4.1 | Terminal colors |
| ora | ^8.1.1 | Loading spinners |
| glob | ^11.0.1 | File pattern matching |
| dotenv | ^16.4.7 | Environment variables |
| typescript | ^5.7.3 | TypeScript compiler |
| tsx | ^4.19.2 | TypeScript execution |
