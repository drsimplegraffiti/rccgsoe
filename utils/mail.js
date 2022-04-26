const nodemailer = require('nodemailer');

const path = require('path');
const fs = require('fs');

const sendEmail = async (options, attachment = false) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
  try {
    const message = {
      from: process.env.EMAIL_USER,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.message,
    };

    const m = await transporter.sendMail(message);
    console.log(m);
  } catch (error) {
    console.log(error);
    return error;
  }
};

module.exports = sendEmail;
