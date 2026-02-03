import chalk from 'chalk';

export const colors = {
  // Primary colors
  primary: chalk.cyan,
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,

  // Text colors
  muted: chalk.gray,
  highlight: chalk.white.bold,

  // UI elements
  prompt: chalk.green.bold,
  toolName: chalk.magenta,
  fileName: chalk.yellow,
  command: chalk.cyan,

  // Branding
  logo: chalk.cyan.bold
};
