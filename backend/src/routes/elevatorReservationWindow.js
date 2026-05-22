const express = require('express');
const router = express.Router();

let rows = [
  { id: 1, job: 'JOB-2207', building: 'Hudson Tower', window: '08:00-10:00', elevator: 'Service 2', certificate: 'COI received', status: 'confirmed' },
  { id: 2, job: 'JOB-2211', building: 'Park Lofts', window: '13:00-15:00', elevator: 'Freight A', certificate: 'pending COI', status: 'blocked' },
  { id: 3, job: 'JOB-2215', building: 'Harbor View', window: '10:00-12:00', elevator: 'Service 1', certificate: 'COI received', status: 'confirmed' }
];

router.get('/', (_req, res) => {
  const summary = rows.reduce((acc, r) => {
    acc.total += 1;
    acc.blocked += r.status === 'blocked' ? 1 : 0;
    return acc;
  }, { total: 0, blocked: 0 });
  res.json({ rows, summary });
});

router.post('/', (req, res) => {
  const item = {
    id: Date.now(),
    job: req.body.job || 'JOB-pending',
    building: req.body.building || 'Building TBD',
    window: req.body.window || 'TBD',
    elevator: req.body.elevator || 'Service elevator',
    certificate: req.body.certificate || 'pending COI',
    status: req.body.status || 'blocked'
  };
  rows = [item, ...rows];
  res.status(201).json(item);
});

module.exports = router;
