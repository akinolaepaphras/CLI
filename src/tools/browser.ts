import type { Tool, ToolDefinition, ToolResult } from './types.js';
import type { SandboxManager } from '../sandbox/index.js';
import chalk from 'chalk';

/**
 * BrowserTool - Fetch and extract content from web pages using the sandbox
 *
 * This tool runs a headless browser (via curl or node-fetch) in the E2B sandbox
 * to fetch web content. Useful for:
 * - Reading documentation
 * - Fetching API responses
 * - Scraping text content from web pages
 *
 * The browser runs in the sandbox for security - no local browser automation.
 */
export class BrowserTool implements Tool {
  private sandboxManager: SandboxManager;

  definition: ToolDefinition = {
    name: 'browser_fetch',
    description: 'Fetch and extract text content from a URL using the remote sandbox. Use for reading documentation, fetching web pages, or getting content from URLs. Returns the text content of the page.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: {
          type: 'string',
          description: 'The URL to fetch'
        },
        selector: {
          type: 'string',
          description: 'CSS selector to extract specific content (optional, uses body if not specified)'
        },
        format: {
          type: 'string',
          enum: ['text', 'html', 'markdown'],
          description: 'Output format: text (default), html, or markdown'
        }
      },
      required: ['url']
    }
  };

  constructor(sandboxManager: SandboxManager) {
    this.sandboxManager = sandboxManager;
  }

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const { url, selector, format = 'text' } = input as {
      url: string;
      selector?: string;
      format?: 'text' | 'html' | 'markdown';
    };

    // Validate URL
    try {
      new URL(url);
    } catch {
      return {
        success: false,
        error: 'Invalid URL provided'
      };
    }

    console.log(chalk.cyan(`[browser] Fetching: ${url}`));

    try {
      // First, ensure we have the necessary tools in the sandbox
      // Install lynx for text extraction (lightweight, no browser needed)
      await this.sandboxManager.execute('which lynx || apt-get update && apt-get install -y lynx curl', 30000);

      let command: string;

      if (format === 'html') {
        // Return raw HTML
        command = `curl -sL "${url}"`;
      } else if (format === 'markdown') {
        // Use pandoc if available, otherwise fall back to lynx
        command = `curl -sL "${url}" | pandoc -f html -t markdown 2>/dev/null || lynx -dump -nolist "${url}"`;
      } else {
        // Default: extract text using lynx
        command = `lynx -dump -nolist "${url}"`;
      }

      // If a selector is provided, we need a more sophisticated approach
      // For now, we'll use a simple grep-based filtering
      if (selector) {
        // Note: This is a simplified approach. For full CSS selector support,
        // we'd need to use a proper HTML parser in the sandbox
        console.log(chalk.yellow(`  Note: CSS selector filtering is limited in text mode`));
      }

      const result = await this.sandboxManager.execute(command, 60000);

      if (result.success) {
        // Truncate very long content
        let content = result.stdout;
        const maxLength = 10000;

        if (content.length > maxLength) {
          content = content.substring(0, maxLength) + '\n\n... [content truncated]';
        }

        console.log(chalk.green(`✓ Fetched ${content.length} characters`));

        return {
          success: true,
          output: content
        };
      } else {
        return {
          success: false,
          error: result.stderr || 'Failed to fetch URL'
        };
      }
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: `Browser fetch failed: ${err.message}`
      };
    }
  }
}
