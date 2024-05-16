/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
// import AuthController from '../controllers/AuthController';
// import FilesController from '../controllers/FilesController';

const express = require('express');

const router = (filesApp) => {
  const routes = express.Router();
  filesApp.use(express.json());
  filesApp.use('/', routes);

  routes.get('/status', (request, response) => AppController.getStatus(request, response));
  routes.get('/stats', (request, response) => AppController.getStats(request, response));
  routes.post('/users', (request, response) => UsersController.createNew(request, response));
  // routes.get('/connect', (request, response) => AuthController.getConnect(request, response));
  // routes.get('/disconnect', (request, response) =>
  // AuthController.getDisconnect(request, response));
  // routes.get('/users/me', (request, response) => UsersController.getMe(request, response));
  // routes.post('/files', (request, response) => FilesController.postUpload(request, response));
  // routes.get('/files/:id', (request, response) => FilesController.getShow(request, response));
  // routes.get('/files', (request, response) => FilesController.getIndex(request, response));
  // routes.put('/files/:id/publish', (request, response) =>
  // FilesController.putPublish(request, response));
  // routes.put('/files/:id/unpublish', (request, response) =>
  // FilesController.putUnpublish(request, response));
  // routes.get('/files/:id/data', (request, response) =>
  // FilesController.getFile(request, response));
};

export default router;
