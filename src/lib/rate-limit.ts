const requests = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { success: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = requests.get(key) ?? [];

  // Remove expired timestamps
  const valid = timestamps.filter((t) => now - t < windowMs);

  if (valid.length >= limit) {
    requests.set(key, valid);
    return { success: false, remaining: 0 };
  }

  valid.push(now);
  requests.set(key, valid);

  return { success: true, remaining: limit - valid.length };
}

export function resetRateLimits(): void {
  requests.clear();
}
