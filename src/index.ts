import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { connectToDb } from './utils/connectToDb';
import router from './routes/routes';
import { errorHandler } from './middlewares/error.middleware';
import { redisService } from './services/redis.service';

const app = express();
const port = config.port;

const initializeApp = async () => {
  try {
    await connectToDb();
    await redisService.init();

    app.use(helmet());
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.get('/', (req, res) => {
      res.json({ message: 'Добро пожаловать в API' });
    });

    app.use('/api', router);
    app.use(errorHandler);

    app.listen(port, () => {
      console.log(`Сервер запущен на порту ${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
};

initializeApp();
