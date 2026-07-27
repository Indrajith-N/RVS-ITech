const OdApplication = require('../models/OdApplication');
const User = require('../models/User');

// @desc  View all OD applications pending this tutor's approval
// @route GET /api/tutor/od/pending
const getPendingApplications = async (req, res) => {
  try {
    // Find students in the same department + className as this tutor
    const students = await User.find({
      role: 'student',
      department: req.user.department,
      className: req.user.className,
    }).select('_id');

    const studentIds = students.map((s) => s._id);

    const applications = await OdApplication.find({
      student: { $in: studentIds },
      status: 'pending_tutor',
    })
      .populate('student', 'name regNo className email')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  Approve an OD application (forwards to HOD)
// @route PUT /api/tutor/od/:id/approve
const approveApplication = async (req, res) => {
  try {
    const application = await OdApplication.findById(req.params.id).populate('student');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== 'pending_tutor') {
      return res.status(400).json({ message: 'Application is not pending tutor approval' });
    }

    // Confirm this tutor is actually responsible for this student's class
    if (
      application.student.department !== req.user.department ||
      application.student.className !== req.user.className
    ) {
      return res.status(403).json({ message: 'You are not authorized for this student\'s class' });
    }

    application.status = 'pending_hod';
    application.tutor = req.user._id;
    application.tutorRemarks = req.body.remarks || 'Approved';
    application.tutorActionDate = new Date();

    await application.save();

    res.json({ message: 'Application approved and forwarded to HOD', application });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  Reject an OD application
// @route PUT /api/tutor/od/:id/reject
const rejectApplication = async (req, res) => {
  try {
    const application = await OdApplication.findById(req.params.id).populate('student');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== 'pending_tutor') {
      return res.status(400).json({ message: 'Application is not pending tutor approval' });
    }

    if (
      application.student.department !== req.user.department ||
      application.student.className !== req.user.className
    ) {
      return res.status(403).json({ message: 'You are not authorized for this student\'s class' });
    }

    if (!req.body.remarks) {
      return res.status(400).json({ message: 'Rejection reason (remarks) is required' });
    }

    application.status = 'rejected';
    application.tutor = req.user._id;
    application.tutorRemarks = req.body.remarks;
    application.tutorActionDate = new Date();

    await application.save();

    res.json({ message: 'Application rejected', application });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  View proofs pending this tutor's verification
// @route GET /api/tutor/proof/pending
const getPendingProofs = async (req, res) => {
  try {
    const students = await User.find({
      role: 'student',
      department: req.user.department,
      className: req.user.className,
    }).select('_id');

    const studentIds = students.map((s) => s._id);

    const applications = await OdApplication.find({
      student: { $in: studentIds },
      'proof.verificationStatus': 'pending_tutor_verification',
    })
      .populate('student', 'name regNo className email')
      .sort({ 'proof.uploadedAt': -1 });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  Verify uploaded proof (forwards to HOD for final verification)
// @route PUT /api/tutor/proof/:id/verify
const verifyProof = async (req, res) => {
  try {
    const application = await OdApplication.findById(req.params.id).populate('student');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.proof.verificationStatus !== 'pending_tutor_verification') {
      return res.status(400).json({ message: 'Proof is not pending tutor verification' });
    }

    application.proof.verificationStatus = 'pending_hod_verification';
    application.proof.tutorProofRemarks = req.body.remarks || 'Verified';

    await application.save();

    res.json({ message: 'Proof verified and forwarded to HOD', application });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  Reject uploaded proof (student must re-upload)
// @route PUT /api/tutor/proof/:id/reject
const rejectProof = async (req, res) => {
  try {
    const application = await OdApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.proof.verificationStatus !== 'pending_tutor_verification') {
      return res.status(400).json({ message: 'Proof is not pending tutor verification' });
    }

    if (!req.body.remarks) {
      return res.status(400).json({ message: 'Rejection reason (remarks) is required' });
    }

    application.proof.verificationStatus = 'rejected';
    application.proof.tutorProofRemarks = req.body.remarks;

    await application.save();

    res.json({ message: 'Proof rejected. Student must re-upload.', application });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


// @desc  Dashboard stats for tutor's class
// @route GET /api/tutor/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    const students = await User.find({
      role: 'student',
      department: req.user.department,
      className: req.user.className,
    }).select('_id');

    const studentIds = students.map((s) => s._id);

    const [pendingApproval, pendingProofVerification, completed, rejected] = await Promise.all([
      OdApplication.countDocuments({ student: { $in: studentIds }, status: 'pending_tutor' }),
      OdApplication.countDocuments({
        student: { $in: studentIds },
        'proof.verificationStatus': 'pending_tutor_verification',
      }),
      OdApplication.countDocuments({
        student: { $in: studentIds },
        'proof.verificationStatus': 'completed',
      }),
      OdApplication.countDocuments({ student: { $in: studentIds }, status: 'rejected' }),
    ]);

    res.json({ pendingApproval, pendingProofVerification, completed, rejected });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  View ALL OD applications for this tutor's class (persistent dashboard)
// @route GET /api/tutor/od/all
const getAllApplications = async (req, res) => {
  try {
    const students = await User.find({
      role: 'student',
      department: req.user.department,
      className: req.user.className,
    }).select('_id');

    const studentIds = students.map((s) => s._id);

    const applications = await OdApplication.find({ student: { $in: studentIds } })
      .populate('student', 'name regNo className email')
      .populate('tutor', 'name email')
      .populate('hod', 'name email')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


const LeaveApplication = require('../models/LeaveApplication');

// @desc  View ALL leave applications for tutor's class
// @route GET /api/tutor/leave/all
const getAllLeaveApplications = async (req, res) => {
  try {
    const students = await User.find({
      role: 'student',
      department: req.user.department,
      className: req.user.className,
    }).select('_id');

    const studentIds = students.map((s) => s._id);

    const applications = await LeaveApplication.find({ student: { $in: studentIds } })
      .populate('student', 'name regNo className email')
      .populate('hod', 'name email')
      .select('-verificationCode.code') // code only revealed via the dedicated endpoint below
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  Reveal the verification code so the tutor can read it to the parent on a call
// @route GET /api/tutor/leave/:id/reveal-code
const revealVerificationCode = async (req, res) => {
  try {
    const leave = await LeaveApplication.findById(req.params.id).populate('student');

    if (!leave) return res.status(404).json({ message: 'Leave application not found' });

    if (leave.status !== 'pending_verification') {
      return res.status(400).json({ message: 'This leave is not awaiting parent verification' });
    }

    if (
      leave.student.department !== req.user.department ||
      leave.student.className !== req.user.className
    ) {
      return res.status(403).json({ message: "You are not authorized for this student's class" });
    }

    res.json({
      code: leave.verificationCode.code,
      parentName: leave.parentName,
      parentMobile: leave.parentMobile,
      instructions: 'Call the parent, read this code aloud, then ask them to repeat it back to you.',
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  Tutor confirms the code the parent read back over the call
// @route PUT /api/tutor/leave/:id/confirm-verification
const confirmParentVerification = async (req, res) => {
  try {
    const { enteredCode, remarks } = req.body;

    if (!enteredCode) {
      return res.status(400).json({ message: 'Enter the code the parent read back' });
    }

    const leave = await LeaveApplication.findById(req.params.id).populate('student');

    if (!leave) return res.status(404).json({ message: 'Leave application not found' });

    if (leave.status !== 'pending_verification') {
      return res.status(400).json({ message: 'This leave is not awaiting parent verification' });
    }

    if (
      leave.student.department !== req.user.department ||
      leave.student.className !== req.user.className
    ) {
      return res.status(403).json({ message: "You are not authorized for this student's class" });
    }

    if (leave.verificationCode.attempts >= 5) {
      return res.status(400).json({ message: 'Too many failed attempts. Reject and ask the student to reapply.' });
    }

    if (leave.verificationCode.code !== enteredCode) {
      leave.verificationCode.attempts += 1;
      await leave.save();
      return res.status(400).json({ message: 'Code does not match what the parent should have read back. Try again.' });
    }

    leave.verificationCode.verified = true;
    leave.verificationCode.verifiedAt = new Date();
    leave.status = 'pending_hod';
    leave.tutor = req.user._id;
    leave.tutorRemarks = remarks || 'Parent verified by phone call';
    leave.tutorActionDate = new Date();
    await leave.save();

    res.json({ message: 'Parent verified successfully. Leave forwarded to HOD.', leave });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  Reject leave (e.g. couldn't reach parent, invalid details)
// @route PUT /api/tutor/leave/:id/reject
const rejectLeave = async (req, res) => {
  try {
    const leave = await LeaveApplication.findById(req.params.id).populate('student');

    if (!leave) return res.status(404).json({ message: 'Leave application not found' });
    if (leave.status !== 'pending_verification') {
      return res.status(400).json({ message: 'This leave cannot be rejected at its current stage' });
    }
    if (!req.body.remarks) {
      return res.status(400).json({ message: 'Rejection reason (remarks) is required' });
    }

    leave.status = 'rejected';
    leave.tutor = req.user._id;
    leave.tutorRemarks = req.body.remarks;
    leave.tutorActionDate = new Date();
    await leave.save();

    res.json({ message: 'Leave rejected', leave });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};





module.exports = {
  getAllLeaveApplications,
  revealVerificationCode,
  confirmParentVerification,
  rejectLeave,
  getPendingApplications,
  approveApplication,
  rejectApplication,
  getPendingProofs,
  verifyProof,
  rejectProof,
  getDashboardStats,
  getAllApplications, 
  getAllLeaveApplications,
  rejectLeave,
};


