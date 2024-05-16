const redis = require('redis');
const { promisify } = require('util');

class RedisClient {
  constructor() {
    this.redisClient = redis.createClient();
    this.getAsync = promisify(this.redisClient.get).bind(this.redisClient);
    this.redisClient.on('error', (error) => {
      console.error(`Redis client not connected to the server: ${error}`);
    });
  }

  isAlive() {
    return this.redisClient.connected;
  }

  async get(key) {
    const value = await this.getAsync(key);
    return value;
  }

  async set(key, value, duration) {
    this.redisClient.set(key, value);
    this.redisClient.expire(key, duration);
  }

  async del(key) {
    this.redisClient.del(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
