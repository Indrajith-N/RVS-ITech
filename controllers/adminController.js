const bcrypt = require('bcryptjs');
const User = require('../models/User');

// @desc  Admin creates a tutor, HOD, admin, or student account
// @route POST /api/admin/users
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, department, className, regNo, parentName, parentPhone } = req.body;

    if (!name || !email || !password || !role || !department) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    if (!['student', 'class_tutor', 'hod', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if ((role === 'class_tutor' || role === 'student') && !className) {
      return res.status(400).json({ message: 'Class name is required for students and tutors' });
    }

    if (role === 'student' && !regNo) {
      return res.status(400).json({ message: 'Register number is required for students' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      name,
      email,
      password: hashedPassword,
      role,
      department,
      className,
    };

    // Only students get a regNo / parent info - never an empty string for staff
    if (role === 'student') {
      userData.regNo = regNo;
      userData.parentName = parentName;
      userData.parentPhone = parentPhone;
    }

    const user = await User.create(userData);

    res.status(201).json({
      message: `${role} account created successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        className: user.className,
        regNo: user.regNo,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  View all users (optionally filter by role)
// @route GET /api/admin/users?role=class_tutor
const getAllUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  Delete a user account
// @route DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own admin account' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  Bulk create students (e.g. 30 at once)
// @route POST /api/admin/users/bulk
const bulkCreateUsers = async (req, res) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ message: 'Provide an array of users under "users"' });
    }

    const results = { created: [], skipped: [] };

    for (const u of users) {
      try {
        const { name, regNo, email, parentName, parentPhone, department, className } = u;

        if (!name || !regNo || !email || !department || !className) {
          results.skipped.push({ regNo: regNo || '(missing)', reason: 'Missing required fields' });
          continue;
        }

        const existing = await User.findOne({ $or: [{ email }, { regNo: String(regNo) }] });
        if (existing) {
          results.skipped.push({ regNo, reason: 'Email or register number already exists' });
          continue;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(String(regNo), salt);

        const user = await User.create({
          name,
          email,
          password: hashedPassword,
          role: 'student',
          department,
          className,
          regNo: String(regNo),
          parentName,
          parentPhone: parentPhone ? String(parentPhone) : undefined,
        });

        results.created.push({ name: user.name, regNo: user.regNo, email: user.email });
      } catch (innerErr) {
        // Catch per-student errors so one bad row doesn't kill the whole batch
        results.skipped.push({ regNo: u.regNo || '(unknown)', reason: innerErr.message });
      }
    }

    res.status(201).json({
      message: `${results.created.length} student(s) created (password = their register number), ${results.skipped.length} skipped`,
      ...results,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
// @desc  Delete multiple users at once
// @route DELETE /api/admin/users/bulk
const bulkDeleteUsers = async (req, res) => {
  try {
    const { ids } = req.body; // array of user IDs

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Provide an array of user IDs under "ids"' });
    }

    // Never allow the logged-in admin to delete themselves in a bulk action
    const filteredIds = ids.filter((id) => id !== req.user._id.toString());
    const blockedSelfDelete = filteredIds.length !== ids.length;

    const result = await User.deleteMany({ _id: { $in: filteredIds } });

    res.json({
      message: `${result.deletedCount} user(s) deleted`,
      deletedCount: result.deletedCount,
      selfDeleteBlocked: blockedSelfDelete,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { createUser, getAllUsers, deleteUser, bulkCreateUsers, bulkDeleteUsers };