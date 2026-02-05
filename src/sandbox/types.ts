/**
 * Sandbox configuration options
 */
export interface SandboxConfig {
  /** Sandbox lifetime in milliseconds (default: 5 minutes) */
  timeout?: number;
  /** Whether to initialize sandbox eagerly on startup */
  eager?: boolean;
}

/**
 * Result from executing a command in the sandbox
 */
export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Result from file operations in the sandbox
 */
export interface FileOperationResult {
  success: boolean;
  message?: string;
  error?: string;
}
