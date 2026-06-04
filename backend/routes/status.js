import express from 'express';
import { getFlightRiskAssessment, getLatestStatus } from '../services/statusService.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(getLatestStatus());
});

router.get('/flight/:flightNumber', async (req, res, next) => {
  try {
    res.json(await getFlightRiskAssessment(req.params.flightNumber));
  } catch (error) {
    next(error);
  }
});

export default router;
