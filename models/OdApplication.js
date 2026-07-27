const mongoose = require('mongoose');

const odApplicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    eventName: {
      type: String,
      required: true,
    },
    eventVenue: {
      type: String,
    },
    fromDate: {
      type: Date,
      required: true,
    },
    toDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },

    // Approval workflow status
    status: {
      type: String,
      enum: ['pending_tutor', 'pending_hod', 'approved', 'rejected'],
      default: 'pending_tutor',
    },
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    tutorRemarks: String,
    tutorActionDate: Date,

    hod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    hodRemarks: String,
    hodActionDate: Date,

    // Proof upload + verification workflow
    proof: {
      fileUrl: String,
      uploadedAt: Date,
      verificationStatus: {
        type: String,
        enum: [
          'not_uploaded',
          'pending_tutor_verification',
          'pending_hod_verification',
          'completed',
          'rejected',
        ],
        default: 'not_uploaded',
      },
      tutorProofRemarks: String,
      hodProofRemarks: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OdApplication', odApplicationSchema);