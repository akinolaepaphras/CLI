import chalk from 'chalk';

/**
 * Simple terminal markdown renderer
 * Handles common markdown patterns for CLI output
 */
export function renderMarkdown(content: string): string {
  let result = content;

  // Headers
  result = result.replace(/^### (.+)$/gm, chalk.green.bold('### $1'));
  result = result.replace(/^## (.+)$/gm, chalk.green.bold('## $1'));
  result = result.replace(/^# (.+)$/gm, chalk.cyan.bold('# $1'));

  // Bold
  result = result.replace(/\*\*([^*]+)\*\*/g, chalk.bold('$1'));
  result = result.replace(/__([^_]+)__/g, chalk.bold('$1'));

  // Italic
  result = result.replace(/\*([^*]+)\*/g, chalk.italic('$1'));
  result = result.replace(/_([^_]+)_/g, chalk.italic('$1'));

  // Inline code
  result = result.replace(/`([^`]+)`/g, chalk.cyan('$1'));

  // Code blocks - highlight the content
  result = result.replace(/```[\w]*\n([\s\S]*?)```/g, (_, code) => {
    return chalk.yellow(code.trim());
  });

  // Bullet points
  result = result.replace(/^(\s*)[-*] (.+)$/gm, '$1• $2');

  // Numbered lists (keep as-is, just ensure proper formatting)
  result = result.replace(/^(\s*)(\d+)\. (.+)$/gm, '$1$2. $3');

  // Links [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, chalk.blue('$1') + chalk.gray(' ($2)'));

  // Blockquotes
  result = result.replace(/^> (.+)$/gm, chalk.gray.italic('│ $1'));

  // Horizontal rules
  result = result.replace(/^[-*_]{3,}$/gm, chalk.gray('─'.repeat(40)));

  return result;
}
