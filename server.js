// eslint-disable-next-line import/no-unresolved
import router from './routes/index';

const express = require('express');

const filesApp = express();
const port = process.env.PORT || 5000;

router(filesApp);

filesApp.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
