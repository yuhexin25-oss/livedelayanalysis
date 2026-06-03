import express from 'express';
import { getLatestStatus } from '../services/statusService.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(getLatestStatus());
});

export default router;
