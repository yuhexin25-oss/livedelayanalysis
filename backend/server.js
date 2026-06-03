import express from 'express';
import cors from 'cors';
import statusRouter from './routes/status.js';
import { startStatusRefresh } from './services/statusService.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api/status', statusRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Hub Resilience Monitor backend is running.', statusEndpoint: '/api/status' });
});

await startStatusRefresh();

app.listen(PORT, () => {
  console.log(`Hub Resilience Monitor backend listening on port ${PORT}`);
});
