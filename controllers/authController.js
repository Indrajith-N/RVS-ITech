const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @desc  Login user (accepts email OR register number)
// @route POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Please provide your email/register number and password' });
    }

    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { regNo: identifier }],
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid login credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid login credentials' });
    }

    res.json({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  className: user.className,
  regNo: user.regNo,
  parentName: user.parentName,
  parentPhone: user.parentPhone,
  token: generateToken(user._id),
});
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc  Get logged-in user's own profile
// @route GET /api/auth/me
const getMe = async (req, res) => {
  res.json(req.user);
};

module.exports = { loginUser, getMe };