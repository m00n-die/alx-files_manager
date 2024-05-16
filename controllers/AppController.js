import RedisClient from '../utils/redis';
import DBClient from '../utils/db';

class AppController {
  static getStatus(request, result) {
    const data = {
      redis: RedisClient.isAlive(),
      db: DBClient.isAlive(),
    };
    return result.status(200).send(data);
  }

  static async getStats(request, result) {
    const data = {
      users: await DBClient.nbUsers(),
      files: await DBClient.nbFiles(),
    };
    return result.status(200).send(data);
  }
}

module.exports = AppController;
