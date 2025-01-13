export const rateLimit = {
  tokens: new Map<string, number>(),
  last: new Map<string, number>(),
  
  check(token: string, limit: number = 5, interval: number = 10000): boolean {
    const now = Date.now();
    const lastTime = this.last.get(token) || 0;
    
    // Reset counter if interval has passed
    if (now - lastTime > interval) {
      this.tokens.set(token, 1);
      this.last.set(token, now);
      return true;
    }
    
    const tokenCount = this.tokens.get(token) || 0;
    if (tokenCount >= limit) {
      return false;
    }
    
    this.tokens.set(token, tokenCount + 1);
    return true;
  }
}; 