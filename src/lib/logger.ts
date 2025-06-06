export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelOrder: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return levelOrder[level] >= levelOrder[currentLevel];
}

function log(level: LogLevel, ...args: unknown[]): void {
  if (!shouldLog(level)) return;
  const prefix = `[${level.toUpperCase()}]`;
  // eslint-disable-next-line no-console
  (console[level === 'debug' ? 'log' : level] as (...a: unknown[]) => void)(prefix, ...args);
}

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args)
};
