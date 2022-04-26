const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  first_name: {
    type: String,
    default: null,
  },
  last_name: {
    type: String,
    default: null,
  },
  email: {
    type: String,
    unique: true,
    lowercase: [true, 'please ensure your email address is in lowercase'],
  },
  password: {
    type: String,
  },
  phone_number: {
    type: String,
  },
});

module.exports = mongoose.model('user', userSchema);
