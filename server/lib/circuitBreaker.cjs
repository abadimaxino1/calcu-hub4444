const cache = new Map();

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeout = options.resetTimeout || 30000; // 30s
    this.cacheTTL = options.cacheTTL || 60000; // 60s
    
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        // Return cached result if available
        const cached = cache.get(this.name);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
          return cached.data;
        }
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess(result);
      return result;
    } catch (error) {
      this.onFailure(error);
      // Return cached result if available even on failure
      const cached = cache.get(this.name);
      if (cached) return cached.data;
      throw error;
    }
  }

  onSuccess(result) {
    this.failures = 0;
    this.state = 'CLOSED';
    cache.set(this.name, { data: result, timestamp: Date.now() });
  }

  onFailure(error) {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

const breakers = {};

function getBreaker(name, options) {
  if (!breakers[name]) {
    breakers[name] = new CircuitBreaker(name, options);
  }
  return breakers[name];
}

module.exports = { getBreaker };
