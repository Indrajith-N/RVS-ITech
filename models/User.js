const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['student', 'class_tutor', 'hod', 'admin'],
      required: true,
    },
    department: { type: String, required: true },
    regNo: {
      type: String,
      unique: true,
      sparse: true, // allows multiple non-student users to have no regNo
      trim: true,
    },
    className: { type: String },
    parentName: { type: String },   // students only
    parentPhone: { type: String },  // students only
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);