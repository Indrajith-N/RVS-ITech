const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleCheck');

const {
  getPendingApplications,
  approveApplication,
  rejectApplication,
  getPendingProofs,
  verifyProof,
  rejectProof,
  getDashboardStats,
  getAllApplications,
} = require('../controllers/tutorController');

router.use(protect, authorizeRoles('class_tutor'));

router.get('/od/pending', getPendingApplications);
router.put('/od/:id/approve', approveApplication);
router.put('/od/:id/reject', rejectApplication);

router.get('/proof/pending', getPendingProofs);
router.put('/proof/:id/verify', verifyProof);
router.put('/proof/:id/reject', rejectProof);
router.get('/dashboard/stats', getDashboardStats);
router.get('/od/all', getAllApplications);



const {
  // ...existing imports...
  getAllLeaveApplications,
  revealVerificationCode,
  confirmParentVerification,
  rejectLeave,
} = require('../controllers/tutorController');

router.get('/leave/all', getAllLeaveApplications);
router.get('/leave/:id/reveal-code', revealVerificationCode);
router.put('/leave/:id/confirm-verification', confirmParentVerification);
router.put('/leave/:id/reject', rejectLeave);

module.exports = router;