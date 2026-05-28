/** Minimal logger stub for backend compatibility. */
const noop = () => {};
const logger = {
  debug: noop as (...args: unknown[]) => void,
  info: noop as (...args: unknown[]) => void,
  warn: noop as (...args: unknown[]) => void,
  error: noop as (...args: unknown[]) => void,
};

export { logger };
export default logger;
