require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('An admin account already exists:', existingAdmin.email);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@college.edu',
      password: hashedPassword,
      role: 'admin',
      department: 'Administration',
    });

    console.log('Admin account created successfully:');
    console.log('Email:', admin.email);
    console.log('Password: admin123');
    console.log('IMPORTANT: Log in and change this password immediately.');

    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin:', err.message);
    process.exit(1);
  }
};

seedAdmin();