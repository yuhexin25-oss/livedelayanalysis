import express from 'express';
import cors from 'cors';
import statusRouter from './routes/status.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.get('/api/status', statusRouter);

app.get('/', (req, res) => {
  res.send({ message: 'Hub Resilience Monitor backend is running.' });
});

app.listen(PORT, () => {
  console.log(`Hub Resilience Monitor backend listening on port ${PORT}`);
});
