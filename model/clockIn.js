const mongoose = require('mongoose');
const { Schema } = mongoose;

const clockInSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    clockIn: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ClockIn', clockInSchema);
