/** Generates a random 6-digit jobId for new operations when no existing job group exists */
export function generateRandomJobId(): string {
  const min = 100000;
  const max = 999999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}
