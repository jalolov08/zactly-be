import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
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

    app.use(
      helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
      })
    );
    app.use(
      cors({
        origin: '*',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      })
    );
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.get('/', (req, res) => {
      res.json({ message: 'Добро пожаловать в API' });
    });

    app.use('/api', router);
    app.use(errorHandler);

    app.use(
      '/api/uploads',
      (req, res, next) => {
        res.header('Cross-Origin-Resource-Policy', 'cross-origin');
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        next();
      },
      express.static('uploads')
    );

    app.listen(port, () => {
      console.log(`Сервер запущен на порту ${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
};

initializeApp();
