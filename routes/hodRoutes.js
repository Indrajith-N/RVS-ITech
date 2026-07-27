const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleCheck');

const {
  getPendingApplications,
  approveApplication,
  rejectApplication,
  getPendingProofs,
  confirmProof,
  rejectProof,
  getDashboardStats,
  getAllApplications,
} = require('../controllers/hodController');

router.use(protect, authorizeRoles('hod'));

router.get('/od/pending', getPendingApplications);
router.put('/od/:id/approve', approveApplication);
router.put('/od/:id/reject', rejectApplication);

router.get('/proof/pending', getPendingProofs);
router.put('/proof/:id/confirm', confirmProof);
router.put('/proof/:id/reject', rejectProof);
router.get('/dashboard/stats', getDashboardStats);
router.get('/od/all', getAllApplications);
const {
  // ...existing imports
  getAllLeaveApplications,
  approveLeave,
  rejectLeave,
} = require('../controllers/hodController');

router.get('/leave/all', getAllLeaveApplications);
router.put('/leave/:id/approve', approveLeave);
router.put('/leave/:id/reject', rejectLeave);

module.exports = router;