# Claude CLI

An interactive command-line interface for Claude AI, built with TypeScript. Features real-time streaming responses, file operations, and shell command execution — similar to [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

- 🤖 **Interactive Chat** — Real-time streaming responses from Claude
- 📁 **File Operations** — Read, write, and edit files through natural language
- 💻 **Shell Commands** — Execute bash commands with live output
- 🔍 **File Search** — Find files using glob patterns
- 🔄 **Agentic Loop** — Claude can chain multiple tool calls to complete complex tasks
- 🎨 **Beautiful Output** — Colored terminal output with markdown rendering

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Key

```bash
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=your-api-key-here
```

Get your API key from [console.anthropic.com](https://console.anthropic.com)

### 3. Build & Run

```bash
npm run build
npm start
```

Or run in development mode (no build needed):

```bash
npm run dev
```

## Usage

### Interactive Mode

```bash
npm start
```

Then type your messages at the `>` prompt:

```
> Read package.json and tell me what dependencies we're using
> Create a file called hello.js that prints "Hello World"
> Run npm test
```

### With Initial Prompt

```bash
npm start "What files are in this directory?"
```

### CLI Options

```
Usage: claude-cli [options] [prompt]

Options:
  -V, --version        output the version number
  -m, --model <model>  Claude model to use (default: "claude-sonnet-4-20250514")
  -k, --api-key <key>  Anthropic API key (or set ANTHROPIC_API_KEY)
  --no-stream          Disable streaming responses
  -h, --help           display help for command
```

## Commands

| Command | Description |
|---------|-------------|
| `/help` | Show available commands and tools |
| `/clear` | Clear conversation history |
| `/history` | Show conversation statistics |
| `/exit` | Exit the CLI |

## Available Tools

Claude has access to these tools to help you:

| Tool | Description |
|------|-------------|
| `read_file` | Read contents of a file with line numbers |
| `write_file` | Create or overwrite a file |
| `edit_file` | Edit a file by finding and replacing text |
| `bash` | Execute shell commands |
| `glob` | Find files matching a pattern (e.g., `**/*.ts`) |

## Example Session

```
╭─────────────────────────────────────╮
│          Claude CLI                 │
╰─────────────────────────────────────╯

Type your message to chat with Claude.
Commands: /help, /clear, /exit

> What TypeScript files are in the src directory?

[Tool: glob]
✓ Success

Found 12 TypeScript files in the src directory:
- src/index.ts (entry point)
- src/repl.ts (interactive loop)
- src/client/index.ts (Claude API client)
...

> Read the main entry point

[Tool: read_file]
✓ Success

Here's what src/index.ts does:
1. Sets up the CLI using Commander
2. Loads configuration from environment/files
3. Creates the Claude client
4. Starts the interactive REPL loop
```

## Project Structure

```
claude-cli/
├── src/
│   ├── index.ts           # CLI entry point
│   ├── repl.ts            # Interactive chat loop
│   ├── client/
│   │   ├── index.ts       # Claude API wrapper
│   │   └── types.ts       # TypeScript types
│   ├── config/
│   │   ├── index.ts       # Configuration loader
│   │   └── types.ts       # Config types
│   ├── tools/
│   │   ├── index.ts       # Tool registry
│   │   ├── bash.ts        # Shell command tool
│   │   ├── file-read.ts   # File reading tool
│   │   ├── file-write.ts  # File writing tool
│   │   ├── file-edit.ts   # File editing tool
│   │   └── glob.ts        # File search tool
│   ├── messages/
│   │   └── index.ts       # Conversation history
│   └── ui/
│       ├── colors.ts      # Color scheme
│       ├── markdown.ts    # Markdown rendering
│       └── spinner.ts     # Loading indicators
├── bin/
│   └── claude.js          # Executable entry
├── package.json
├── tsconfig.json
└── .env.example
```

## How It Works

1. **REPL Loop**: The CLI runs an interactive Read-Eval-Print Loop that accepts user input
2. **Claude API**: Messages are sent to Claude via the Anthropic SDK with streaming enabled
3. **Tool System**: Claude can request to use tools (read files, run commands, etc.)
4. **Agentic Loop**: When Claude uses a tool, the result is sent back and Claude continues until the task is complete

```
User Input → Claude API → [Tool Call?] → Execute Tool → Back to Claude → Response
                              ↓
                         No tools → Stream response to terminal
```

## Configuration

The CLI loads configuration from multiple sources (in order of priority):

1. CLI flags (`--api-key`, `--model`)
2. Environment variables (`ANTHROPIC_API_KEY`, `CLAUDE_MODEL`)
3. Config file (`~/.claude/config.json`)

## Development

```bash
# Run in dev mode (auto-recompile)
npm run dev

# Type check without building
npm run typecheck

# Build for production
npm run build
```

## Security Notes

- File operations are restricted to the current working directory
- The `.env` file is gitignored to protect your API key
- Shell commands run with a 2-minute timeout by default

## License

MIT

## Credits

Built with:
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) — Claude API client
- [Commander](https://github.com/tj/commander.js) — CLI framework
- [Chalk](https://github.com/chalk/chalk) — Terminal styling
- [Ora](https://github.com/sindresorhus/ora) — Terminal spinners
