const mongoose = require('mongoose');

const leaveApplicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: { type: String, required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },

    parentName: { type: String, required: true },
    parentMobile: { type: String, required: true },

    verificationCode: {
      code: String,
      verified: { type: Boolean, default: false },
      attempts: { type: Number, default: 0 },
      verifiedAt: Date,
    },

    status: {
      type: String,
      enum: ['pending_verification', 'pending_hod', 'approved', 'rejected'],
      default: 'pending_verification',
    },

    tutor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tutorRemarks: String,
    tutorActionDate: Date,

    hod: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    hodRemarks: String,
    hodActionDate: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('LeaveApplication', leaveApplicationSchema);