const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleCheck');
const {
  createUser,
  getAllUsers,
  deleteUser,
  bulkCreateUsers,
  bulkDeleteUsers,
} = require('../controllers/adminController');

router.use(protect, authorizeRoles('admin'));

router.post('/users', createUser);
router.get('/users', getAllUsers);

// IMPORTANT: bulk routes must come BEFORE /users/:id
router.post('/users/bulk', bulkCreateUsers);
router.delete('/users/bulk', bulkDeleteUsers);

// This must come LAST since :id will otherwise catch "bulk" as a param
router.delete('/users/:id', deleteUser);

module.exports = router;