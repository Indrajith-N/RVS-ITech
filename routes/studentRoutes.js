const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleCheck');
const upload = require('../middleware/upload');

const {
  applyForOd,
  getMyApplications,
  getMyApplicationById,
  uploadProof,
  getApplicationTimeline,
} = require('../controllers/studentController');

const {
  applyForLeave,
  getMyLeaveApplications,
} = require('../controllers/leaveController');

// All routes below this line require a logged-in student
router.use(protect, authorizeRoles('student'));

router.post('/od/apply', applyForOd);
router.get('/od/my-applications', getMyApplications);
router.get('/od/:id', getMyApplicationById);
router.post('/od/:id/upload-proof', upload.single('proof'), uploadProof);
router.get('/od/:id/timeline', getApplicationTimeline);

router.post('/leave/apply', applyForLeave);
router.get('/leave/my-applications', getMyLeaveApplications);

module.exports = router;