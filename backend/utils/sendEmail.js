// utils/sendEmail.js - Nodemailer email sender
const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    host   : process.env.EMAIL_HOST,
    port   : parseInt(process.env.EMAIL_PORT) || 587,
    secure : false, // TLS
    auth   : {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from   : process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;