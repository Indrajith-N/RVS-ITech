const express = require('express');
const cors = require('cors');
const path = require('path');
const studentRoutes = require('./routes/studentRoutes');
// ...
const tutorRoutes = require('./routes/tutorRoutes');
const hodRoutes = require('./routes/hodRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.get('/', (req, res) => {
  res.redirect('/index.html');
});

app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);

// ...
app.use('/api/tutor', tutorRoutes);

// ...
app.use('/api/hod', hodRoutes);
app.use(express.static(path.join(__dirname, 'public')));

// ...
app.use('/api/admin', adminRoutes);

module.exports = app;
