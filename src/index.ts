import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';

const app = express();
const port = config.port;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'Добро пожаловать в API' });
});

app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});
