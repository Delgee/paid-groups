/**
 * Utility function to add delays between operations.
 * Useful for rate limiting, respecting API limits, or adding deliberate pauses.
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after the specified delay
 *
 * @example
 * // Wait for 1 second
 * await delay(1000);
 *
 * @example
 * // Wait between API calls to respect rate limits
 * for (const item of items) {
 *   await processItem(item);
 *   await delay(100); // 100ms delay between items
 * }
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}