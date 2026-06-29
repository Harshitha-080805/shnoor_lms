require('dotenv').config();
const nodemailer = require('nodemailer');

console.log("Testing SMTP connection with the following settings:");
console.log("Host:", process.env.EMAIL_HOST);
console.log("Port:", process.env.EMAIL_PORT);
console.log("User:", process.env.EMAIL_USER ? "Loaded (hidden)" : "MISSING!");
console.log("Pass:", process.env.EMAIL_PASS ? "Loaded (hidden)" : "MISSING!");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify(function (error, success) {
  if (error) {
    console.error("\n❌ Connection Failed!");
    console.error(error);
  } else {
    console.log("\n✅ Server is ready to take our messages. Credentials are perfectly correct!");
  }
});
