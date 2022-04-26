const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: null,
    },
    DOB: {
      type: Date,
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
    gender: {
      type: String,
      enum: ['male', 'female'],
      default: 'male',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('user', userSchema);
