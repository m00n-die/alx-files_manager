import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import DBClient from '../utils/db';
import RedisClient from '../utils/redis';

class AuthController {
  static async getConnection(request, result) {
    const authorization = request.header('Authorization') || null;
    if (!authorization) return result.status(401).send({ error: 'Unauthorized' });

    const buffer = Buffer.from(authorization.replace('Basic ', ''), 'base64');
    const credentials = {
      email: buffer.toString('utf-8').split(':')[0],
      password: buffer.toString('utf-8').split(':')[1],
    };

    if (!credentials.email || !credentials.password) return result.status(401).send({ error: 'Unauthorized' });
    credentials.password = sha1(credentials.password);

    const userExists = await DBClient.db
      .collection('users')
      .findOne(credentials);
    if (!userExists) return result.status(401).send({ error: 'Unauthorized' });

    const token = uuidv4();
    const key = `auth_${token}`;
    await RedisClient.set(key, userExists._id.toString(), 86400);

    return result.status(200).send({ token });
  }

  static async getDisconnect(request, result) {
    const token = request.header('X-Token') || null;
    if (!token) return result.status(401).send({ error: 'Unauthorized' });
    const redisToken = await RedisClient.get(`auth_${token}`);
    if (!redisToken) return result.status(401).send({ error: 'Unauthorized' });
    await RedisClient.del(`auth_${token}`);
    return result.status(204).send();
  }
}

module.exports = AuthController;
