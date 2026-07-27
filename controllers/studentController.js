const OdApplication = require('../models/OdApplication');

// @desc  Submit a new OD application
// @route POST /api/student/od/apply
const applyForOd = async (req, res) => {
  try {
    const { eventName, eventVenue, fromDate, toDate, reason } = req.body;

    if (!eventName || !fromDate || !toDate || !reason) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    const application = await OdApplication.create({
      student: req.user._id,
      eventName,
      eventVenue,
      fromDate,
      toDate,
      reason,
      status: 'pending_tutor',
    });

    res.status(201).json({
      message: 'OD application submitted successfully',
      application,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  View all of the logged-in student's own OD applications
// @route GET /api/student/od/my-applications
const getMyApplications = async (req, res) => {
  try {
    const applications = await OdApplication.find({ student: req.user._id })
      .populate('tutor', 'name email')
      .populate('hod', 'name email')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  Get a single application's full detail (for the student)
// @route GET /api/student/od/:id
const getMyApplicationById = async (req, res) => {
  try {
    const application = await OdApplication.findOne({
      _id: req.params.id,
      student: req.user._id,
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json(application);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  Upload proof document (only allowed once application is approved)
// @route POST /api/student/od/:id/upload-proof
const uploadProof = async (req, res) => {
  try {
    const application = await OdApplication.findOne({
      _id: req.params.id,
      student: req.user._id,
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== 'approved') {
      return res.status(400).json({
        message: 'Proof can only be uploaded after the OD application is fully approved',
      });
    }

    // Block re-upload unless the previous proof was rejected (or none uploaded yet)
    const allowedStates = ['not_uploaded', 'rejected'];
    if (!allowedStates.includes(application.proof.verificationStatus)) {
      return res.status(400).json({
        message: 'Proof has already been submitted and is under verification',
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    application.proof.fileUrl = `/uploads/${req.file.filename}`;
    application.proof.uploadedAt = new Date();
    application.proof.verificationStatus = 'pending_tutor_verification';
    application.proof.tutorProofRemarks = undefined;
    application.proof.hodProofRemarks = undefined;

    await application.save();

    res.json({ message: 'Proof uploaded successfully', application });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};




// @desc  Get full status timeline for one application
// @route GET /api/student/od/:id/timeline
const getApplicationTimeline = async (req, res) => {
  try {
    const application = await OdApplication.findOne({
      _id: req.params.id,
      student: req.user._id,
    })
      .populate('tutor', 'name email')
      .populate('hod', 'name email');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const timeline = [
      {
        stage: 'Submitted',
        status: 'completed',
        date: application.createdAt,
      },
      {
        stage: 'Class tutor review',
        status:
          application.status === 'pending_tutor'
            ? 'pending'
            : application.status === 'rejected' && !application.tutorActionDate
            ? 'pending'
            : 'completed',
        date: application.tutorActionDate || null,
        remarks: application.tutorRemarks || null,
      },
      {
        stage: 'HOD review',
        status:
          application.status === 'pending_hod'
            ? 'pending'
            : application.status === 'approved' || application.status === 'rejected'
            ? application.hodActionDate
              ? 'completed'
              : 'not_reached'
            : 'not_reached',
        date: application.hodActionDate || null,
        remarks: application.hodRemarks || null,
      },
      {
        stage: 'Event attendance',
        status: application.status === 'approved' ? 'completed' : 'not_reached',
      },
      {
        stage: 'Proof upload',
        status:
          application.proof.verificationStatus === 'not_uploaded'
            ? 'pending'
            : 'completed',
        date: application.proof.uploadedAt || null,
      },
      {
        stage: 'Tutor proof verification',
        status:
          application.proof.verificationStatus === 'pending_tutor_verification'
            ? 'pending'
            : ['pending_hod_verification', 'completed'].includes(application.proof.verificationStatus)
            ? 'completed'
            : 'not_reached',
        remarks: application.proof.tutorProofRemarks || null,
      },
      {
        stage: 'HOD final verification',
        status:
          application.proof.verificationStatus === 'pending_hod_verification'
            ? 'pending'
            : application.proof.verificationStatus === 'completed'
            ? 'completed'
            : 'not_reached',
        remarks: application.proof.hodProofRemarks || null,
      },
      {
        stage: 'OD completed',
        status: application.proof.verificationStatus === 'completed' ? 'completed' : 'not_reached',
      },
    ];

    res.json({
      application,
      timeline,
      overallStatus:
        application.status === 'rejected'
          ? 'Rejected at application stage'
          : application.proof.verificationStatus === 'rejected'
          ? 'Proof rejected — re-upload required'
          : application.proof.verificationStatus === 'completed'
          ? 'Completed'
          : application.status === 'approved'
          ? 'Approved — awaiting proof / verification'
          : 'In progress',
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  applyForOd,
  getMyApplications,
  getMyApplicationById,
  uploadProof,
  getApplicationTimeline, // add this
};