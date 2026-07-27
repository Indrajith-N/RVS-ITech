const OdApplication = require('../models/OdApplication');
const User = require('../models/User');

// @desc  View all OD applications pending HOD approval (dept-wide)
// @route GET /api/hod/od/pending
const getPendingApplications = async (req, res) => {
  try {
    const students = await User.find({
      role: 'student',
      department: req.user.department,
    }).select('_id');

    const studentIds = students.map((s) => s._id);

    const applications = await OdApplication.find({
      student: { $in: studentIds },
      status: 'pending_hod',
    })
      .populate('student', 'name regNo className email')
      .populate('tutor', 'name email')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  Final approval of OD application
// @route PUT /api/hod/od/:id/approve
const approveApplication = async (req, res) => {
  try {
    const application = await OdApplication.findById(req.params.id).populate('student');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== 'pending_hod') {
      return res.status(400).json({ message: 'Application is not pending HOD approval' });
    }

    if (application.student.department !== req.user.department) {
      return res.status(403).json({ message: 'You are not authorized for this department' });
    }

    application.status = 'approved';
    application.hod = req.user._id;
    application.hodRemarks = req.body.remarks || 'Approved';
    application.hodActionDate = new Date();

    await application.save();

    res.json({ message: 'Application fully approved. Student may now attend the event.', application });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  Reject OD application at HOD stage
// @route PUT /api/hod/od/:id/reject
const rejectApplication = async (req, res) => {
  try {
    const application = await OdApplication.findById(req.params.id).populate('student');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== 'pending_hod') {
      return res.status(400).json({ message: 'Application is not pending HOD approval' });
    }

    if (application.student.department !== req.user.department) {
      return res.status(403).json({ message: 'You are not authorized for this department' });
    }

    if (!req.body.remarks) {
      return res.status(400).json({ message: 'Rejection reason (remarks) is required' });
    }

    application.status = 'rejected';
    application.hod = req.user._id;
    application.hodRemarks = req.body.remarks;
    application.hodActionDate = new Date();

    await application.save();

    res.json({ message: 'Application rejected', application });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  View proofs pending HOD's final verification
// @route GET /api/hod/proof/pending
const getPendingProofs = async (req, res) => {
  try {
    const students = await User.find({
      role: 'student',
      department: req.user.department,
    }).select('_id');

    const studentIds = students.map((s) => s._id);

    const applications = await OdApplication.find({
      student: { $in: studentIds },
      'proof.verificationStatus': 'pending_hod_verification',
    })
      .populate('student', 'name regNo className email')
      .sort({ 'proof.uploadedAt': -1 });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  Final confirmation of proof — marks OD as Completed
// @route PUT /api/hod/proof/:id/confirm
const confirmProof = async (req, res) => {
  try {
    const application = await OdApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.proof.verificationStatus !== 'pending_hod_verification') {
      return res.status(400).json({ message: 'Proof is not pending HOD verification' });
    }

    application.proof.verificationStatus = 'completed';
    application.proof.hodProofRemarks = req.body.remarks || 'Confirmed valid';

    await application.save();

    res.json({ message: 'Proof confirmed. OD marked as Completed.', application });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  Reject proof at final stage — student must re-upload
// @route PUT /api/hod/proof/:id/reject
const rejectProof = async (req, res) => {
  try {
    const application = await OdApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.proof.verificationStatus !== 'pending_hod_verification') {
      return res.status(400).json({ message: 'Proof is not pending HOD verification' });
    }

    if (!req.body.remarks) {
      return res.status(400).json({ message: 'Rejection reason (remarks) is required' });
    }

    application.proof.verificationStatus = 'rejected';
    application.proof.hodProofRemarks = req.body.remarks;

    await application.save();

    res.json({ message: 'Proof rejected. Student must upload a valid document.', application });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



// @desc  Dashboard stats for HOD's department
// @route GET /api/hod/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    const students = await User.find({
      role: 'student',
      department: req.user.department,
    }).select('_id');

    const studentIds = students.map((s) => s._id);

    const [pendingApproval, pendingProofVerification, completed, rejected] = await Promise.all([
      OdApplication.countDocuments({ student: { $in: studentIds }, status: 'pending_hod' }),
      OdApplication.countDocuments({
        student: { $in: studentIds },
        'proof.verificationStatus': 'pending_hod_verification',
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
// @desc  View ALL OD applications for this HOD's department (persistent dashboard)
// @route GET /api/hod/od/all
const getAllApplications = async (req, res) => {
  try {
    const students = await User.find({
      role: 'student',
      department: req.user.department,
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

// @desc  View ALL leave applications for HOD's department (persistent)
// @route GET /api/hod/leave/all
const getAllLeaveApplications = async (req, res) => {
  try {
    const students = await User.find({
      role: 'student',
      department: req.user.department,
    }).select('_id');

    const studentIds = students.map((s) => s._id);

    const applications = await LeaveApplication.find({ student: { $in: studentIds } })
      .populate('student', 'name regNo className email')
      .populate('tutor', 'name email')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  Final approval of leave — leave is now permitted
// @route PUT /api/hod/leave/:id/approve
const approveLeave = async (req, res) => {
  try {
    const leave = await LeaveApplication.findById(req.params.id).populate('student');

    if (!leave) return res.status(404).json({ message: 'Leave application not found' });
    if (leave.status !== 'pending_hod') {
      return res.status(400).json({ message: 'Leave is not pending HOD approval' });
    }
    if (leave.student.department !== req.user.department) {
      return res.status(403).json({ message: 'You are not authorized for this department' });
    }

    leave.status = 'approved';
    leave.hod = req.user._id;
    leave.hodRemarks = req.body.remarks || 'Approved';
    leave.hodActionDate = new Date();
    await leave.save();

    res.json({ message: 'Leave fully approved. Student is permitted to take leave.', leave });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  Reject leave at HOD stage
// @route PUT /api/hod/leave/:id/reject
const rejectLeave = async (req, res) => {
  try {
    const leave = await LeaveApplication.findById(req.params.id).populate('student');

    if (!leave) return res.status(404).json({ message: 'Leave application not found' });
    if (leave.status !== 'pending_hod') {
      return res.status(400).json({ message: 'Leave is not pending HOD approval' });
    }
    if (!req.body.remarks) {
      return res.status(400).json({ message: 'Rejection reason (remarks) is required' });
    }

    leave.status = 'rejected';
    leave.hod = req.user._id;
    leave.hodRemarks = req.body.remarks;
    leave.hodActionDate = new Date();
    await leave.save();

    res.json({ message: 'Leave rejected', leave });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


module.exports = {
  getPendingApplications,
  approveApplication,
  rejectApplication,
  getPendingProofs,
  confirmProof,
  rejectProof,
  getDashboardStats,
  getAllApplications, // add this
  getAllLeaveApplications,
  approveLeave,
  rejectLeave,
};

