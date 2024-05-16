import DBClient from './utils/db';

const Bull = require('bull');
const { ObjectId } = require('mongodb');
const imageThumbnail = require('image-thumbnail');
const fs = require('fs');

const fileQueue = new Bull('fileQueue');

const createImageThumbnail = async (path, args) => {
  try {
    const thumbnail = await imageThumbnail(path, args);
    const pathNail = `${path}_${args.width}`;

    await fs.writeFileSync(pathNail, thumbnail);
  } catch (error) {
    console.log(error);
  }
};

fileQueue.process(async (task) => {
  const { fileId } = task.data;
  if (!fileId) throw Error('Missing fileId');
  const { userId } = task.data;
  if (!userId) throw Error('Missing userId');

  const fileDocument = await DBClient.db
    .collection('files')
    .findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });
  if (!fileDocument) throw Error('File not found');

  createImageThumbnail(fileDocument.localPath, { width: 500 });
  createImageThumbnail(fileDocument.localPath, { width: 250 });
  createImageThumbnail(fileDocument.localPath, { width: 100 });
});
