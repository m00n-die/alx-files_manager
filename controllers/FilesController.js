import { v4 as uuidv4 } from 'uuid';
import RedisClient from '../utils/redis';
import DBClient from '../utils/db';

const { ObjectId } = require('mongodb');
const fs = require('fs');
const mime = require('mime-types');
const Bull = require('bull');

class FilesController {
  static async uploadFile(request, result) {
    const fileQueue = new Bull('fileQueue');
    const token = request.header('X-Token') || null;
    if (!token) return result.status(401).send({ error: 'Unauthorized' });
    const redisToken = await RedisClient.get(`auth_${token}`);
    if (!redisToken) return result.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return result.status(401).send({ error: 'Unauthorized' });

    const fileName = request.body.name;
    if (!fileName) return result.status(400).send({ error: 'Missing name' });

    const fileType = request.body.type;
    if (!fileType || !['folder', 'file', 'image'].includes(fileType)) return result.status(400).send({ error: 'Missing type' });

    const fileData = request.body.data;
    if (!fileData && ['file', 'image'].includes(fileType)) return result.status(400).send({ error: 'Missing data' });

    const fileIsPublic = request.body.isPublic || false;
    let idParent = request.body.parentId || 0;
    idParent = idParent === '0' ? 0 : idParent;
    if (idParent !== 0) {
      const parentFile = await DBClient.db
        .collection('files')
        .findOne({ _id: ObjectId(idParent) });
      if (!parentFile) return result.status(400).send({ error: 'Parent not found' });
      if (!['folder'].includes(parentFile.type)) return result.status(400).send({ error: 'Parent is not a folder' });
    }

    const dbFile = {
      userId: user._id,
      name: fileName,
      type: fileType,
      isPublic: fileIsPublic,
      parentId: idParent,
    };

    if (['folder'].includes(fileType)) {
      await DBClient.db.collection('files').insertOne(dbFile);
      return result.status(201).send({
        id: dbFile._id,
        userId: dbFile.userId,
        name: dbFile.name,
        type: dbFile.type,
        isPublic: dbFile.isPublic,
        parentId: dbFile.parentId,
      });
    }

    const pathDir = process.env.FOLDER_PATH || '/tmp/files_manager';
    const uuidFile = uuidv4();

    const buff = Buffer.from(fileData, 'base64');
    const pathFile = `${pathDir}/${uuidFile}`;

    await fs.mkdir(pathDir, { recursive: true }, (error) => {
      if (error) return result.status(400).send({ error: error.message });
      return true;
    });

    await fs.writeFile(pathFile, buff, (error) => {
      if (error) return result.status(400).send({ error: error.message });
      return true;
    });

    dbFile.localPath = pathFile;
    await DBClient.db.collection('files').insertOne(dbFile);

    fileQueue.add({
      userId: dbFile.userId,
      fileId: dbFile._id,
    });

    return result.status(201).send({
      id: dbFile._id,
      userId: dbFile.userId,
      name: dbFile.name,
      type: dbFile.type,
      isPublic: dbFile.isPublic,
      parentId: dbFile.parentId,
    });
  }

  static async getList(request, result) {
    const token = request.header('X-Token') || null;
    if (!token) return result.status(401).send({ error: 'Unauthorized' });
    const redisToken = await RedisClient.get(`auth_${token}`);
    if (!redisToken) return result.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return result.status(401).send({ error: 'Unauthorized' });

    const idFile = request.params.id || '';
    const fileDocument = await DBClient.db
      .collection('files')
      .findOne({ _id: ObjectId(idFile), userId: user._id });
    if (!fileDocument) return result.status(404).send({ error: 'Not found' });

    return result.send({
      id: fileDocument._id,
      userId: fileDocument.userId,
      name: fileDocument.name,
      type: fileDocument.type,
      isPublic: fileDocument.isPublic,
      parentId: fileDocument.parentId,
    });
  }

  static async getIDX(request, result) {
    const token = request.header('X-Token') || null;
    if (!token) return result.status(401).send({ error: 'Unauthorized' });
    const redisToken = await RedisClient.get(`auth_${token}`);
    if (!redisToken) return result.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return result.status(401).send({ error: 'Unauthorized' });

    const parentId = request.query.parentId || 0;
    const pagination = request.query.page || 0;
    const aggregationMatch = { $and: [{ parentId }] };
    let aggregateData = [
      { $match: aggregationMatch },
      { $skip: pagination * 20 },
      { $limit: 20 },
    ];
    if (parentId === 0) aggregateData = [{ $skip: pagination * 20 }, { $limit: 20 }];

    const files = await DBClient.db
      .collection('files')
      .aggregate(aggregateData);
    const filesArray = [];
    await files.forEach((item) => {
      const fileItem = {
        id: item._id,
        userId: item.userId,
        name: item.name,
        type: item.type,
        isPublic: item.isPublic,
        parentId: item.parentId,
      };
      filesArray.push(fileItem);
    });

    return result.send(filesArray);
  }

  static async putPublish(request, result) {
    const token = request.header('X-Token') || null;
    if (!token) return result.status(401).send({ error: 'Unauthorized' });

    const redisToken = await RedisClient.get(`auth_${token}`);
    if (!redisToken) return result.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return result.status(401).send({ error: 'Unauthorized' });

    const idFile = request.params.id || '';

    let fileDocument = await DBClient.db
      .collection('files')
      .findOne({ _id: ObjectId(idFile), userId: user._id });
    if (!fileDocument) return result.status(404).send({ error: 'Not found' });

    await DBClient.db
      .collection('files')
      .update({ _id: ObjectId(idFile) }, { $set: { isPublic: true } });
    fileDocument = await DBClient.db
      .collection('files')
      .findOne({ _id: ObjectId(idFile), userId: user._id });

    return result.send({
      id: fileDocument._id,
      userId: fileDocument.userId,
      name: fileDocument.name,
      type: fileDocument.type,
      isPublic: fileDocument.isPublic,
      parentId: fileDocument.parentId,
    });
  }

  static async putUnpublish(request, result) {
    const token = request.header('X-Token') || null;
    if (!token) return result.status(401).send({ error: 'Unauthorized' });
    const redisToken = await RedisClient.get(`auth_${token}`);
    if (!redisToken) return result.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return result.status(401).send({ error: 'Unauthorized' });

    const idFile = request.params.id || '';

    let fileDocument = await DBClient.db
      .collection('files')
      .findOne({ _id: ObjectId(idFile), userId: user._id });
    if (!fileDocument) return result.status(404).send({ error: 'Not found' });

    await DBClient.db
      .collection('files')
      .update(
        { _id: ObjectId(idFile), userId: user._id },
        { $set: { isPublic: false } },
      );
    fileDocument = await DBClient.db
      .collection('files')
      .findOne({ _id: ObjectId(idFile), userId: user._id });

    return result.send({
      id: fileDocument._id,
      userId: fileDocument.userId,
      name: fileDocument.name,
      type: fileDocument.type,
      isPublic: fileDocument.isPublic,
      parentId: fileDocument.parentId,
    });
  }

  static async getFile(request, result) {
    const idFile = request.params.id || '';
    const size = request.query.size || 0;

    const fileDocument = await DBClient.db
      .collection('files')
      .findOne({ _id: ObjectId(idFile) });
    if (!fileDocument) return result.status(404).send({ error: 'Not found' });

    const { isPublic } = fileDocument;
    const { userId } = fileDocument;
    const { type } = fileDocument;

    let user = null;
    let owner = false;

    const token = request.header('X-Token') || null;
    if (token) {
      const redisToken = await RedisClient.get(`auth_${token}`);
      if (redisToken) {
        user = await DBClient.db
          .collection('users')
          .findOne({ _id: ObjectId(redisToken) });
        if (user) owner = user._id.toString() === userId.toString();
      }
    }

    if (!isPublic && !owner) return result.status(404).send({ error: 'Not found' });
    if (['folder'].includes(type)) return result.status(400).send({ error: "A folder doesn't have content" });

    const realPath = size === 0 ? fileDocument.localPath : `${fileDocument.localPath}_${size}`;

    try {
      const dataFile = fs.readFileSync(realPath);
      const mimeType = mime.contentType(fileDocument.name);
      result.setHeader('Content-Type', mimeType);
      return result.send(dataFile);
    } catch (error) {
      return result.status(404).send({ error: 'Not found' });
    }
  }
}

module.exports = FilesController;
