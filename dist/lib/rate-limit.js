"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = void 0;
exports.rateLimit = {
    tokens: new Map(),
    last: new Map(),
    check(token, limit = 5, interval = 10000) {
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
