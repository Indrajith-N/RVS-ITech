const LeaveApplication = require('../models/LeaveApplication');
const { generateCode } = require('../utils/otp');

// @desc  Submit a new leave application
// @route POST /api/student/leave/apply
const User = require('../models/User');

const applyForLeave = async (req, res) => {
  try {
    const { reason, fromDate, toDate } = req.body;

    if (!reason || !fromDate || !toDate) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    // Always pull parent details from the student's own record - never trust client input for this
    const student = await User.findById(req.user._id);

    if (!student.parentName || !student.parentPhone) {
      return res.status(400).json({
        message: 'Your parent details are not on file. Please contact admin to update your profile before applying for leave.',
      });
    }

    const leave = await LeaveApplication.create({
      student: req.user._id,
      reason,
      fromDate,
      toDate,
      parentName: student.parentName,
      parentMobile: student.parentPhone,
      status: 'pending_verification',
      verificationCode: { code: generateCode(), verified: false, attempts: 0 },
    });

    res.status(201).json({
      message: 'Leave application submitted. Your class tutor will call your parent to verify.',
      leave: {
        _id: leave._id,
        reason: leave.reason,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        status: leave.status,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
// @desc  View all of student's own leave applications
// @route GET /api/student/leave/my-applications
const getMyLeaveApplications = async (req, res) => {
  try {
    const applications = await LeaveApplication.find({ student: req.user._id })
      .populate('tutor', 'name email')
      .populate('hod', 'name email')
      .select('-verificationCode.code') // never expose the raw code to the student
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { applyForLeave, getMyLeaveApplications };