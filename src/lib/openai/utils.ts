
/**
 * Helper function to create a promise that rejects after a timeout
 */
export function timeoutPromise<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Request timed out after ${ms}ms`));
    }, ms);
  });
  
  return Promise.race([
    promise,
    timeoutPromise
  ]).then(
    result => {
      clearTimeout(timeoutId);
      return result as T;
    },
    error => {
      clearTimeout(timeoutId);
      throw error;
    }
  );
}
