import express from 'express';
import { getFlightRiskAssessment, getLatestStatus, getProviderDiagnostics } from '../services/statusService.js';

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

router.get('/provider-test', (req, res) => {
  res.json(getProviderDiagnostics());
});

export default router;
