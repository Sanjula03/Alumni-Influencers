// utils/email.js
// Email sending utility using Nodemailer
const nodemailer = require('nodemailer');

/**
 * Creates a Nodemailer transporter using SMTP configuration from environment variables.
 * Uses Gmail SMTP in production, Ethereal for testing.
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

/**
 * Send a verification email to a newly registered alumnus.
 * Contains the verification token to use with the API.
 * @param {string} to - Recipient email address
 * @param {string} token - Verification token
 */
const sendVerificationEmail = async (to, token) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Alumni Influencers" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Verify Your Email - Alumni Influencers Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8ed; border-radius: 8px; padding: 20px;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #f4f4f4; padding-bottom: 10px;">Welcome to Alumni Influencers!</h2>
        <p>Thank you for registering. Please click the button below to verify your email address and activate your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.APP_URL}/auth/verify?token=${token}" 
             style="background-color: #000000; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="font-size: 13px; color: #7f8c8d;">If the button above doesn't work, copy and paste this link into your browser:</p>
        <p style="font-size: 12px; color: #3498db; word-break: break-all;">${process.env.APP_URL}/auth/verify?token=${token}</p>
        <p style="color: #95a5a6; font-size: 12px; margin-top: 30px; border-top: 1px solid #f4f4f4; padding-top: 10px;">
          This link will expire in 24 hours. If you did not register, please ignore this email.
        </p>
      </div>
    `
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('Verification email sent:', info.messageId);
  return info;
};

/**
 * Send a password reset email with a secure token.
 * @param {string} to - Recipient email address
 * @param {string} token - Password reset token
 */
const sendPasswordResetEmail = async (to, token) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Alumni Influencers" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Password Reset - Alumni Influencers Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8ed; border-radius: 8px; padding: 20px;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #f4f4f4; padding-bottom: 10px;">Password Reset Request</h2>
        <p>You requested a password reset. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.APP_URL}/auth/reset-password?token=${token}" 
             style="background-color: #000000; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 13px; color: #7f8c8d;">If the button above doesn't work, copy and paste this link into your browser:</p>
        <p style="font-size: 12px; color: #3498db; word-break: break-all;">${process.env.APP_URL}/auth/reset-password?token=${token}</p>
        <p style="color: #95a5a6; font-size: 12px; margin-top: 30px; border-top: 1px solid #f4f4f4; padding-top: 10px;">
          This link will expire in 1 hour. If you did not request a reset, please ignore this email.
        </p>
      </div>
    `
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('Password reset email sent:', info.messageId);
  return info;
};

/**
 * Send a bid status notification email.
 * @param {string} to - Recipient email address
 * @param {string} status - 'won' or 'lost'
 * @param {string} date - The featured date
 */
const sendBidNotificationEmail = async (to, status, date) => {
  const transporter = createTransporter();
  const isWinner = status === 'won';

  const mailOptions = {
    from: `"Alumni Influencers" <${process.env.SMTP_USER}>`,
    to,
    subject: isWinner
      ? 'Congratulations! You are the Alumni of the Day!'
      : 'Bid Result - Alumni Influencers Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isWinner ? '#27ae60' : '#e74c3c'};">
          ${isWinner ? 'You Won!' : 'Better Luck Next Time!'}
        </h2>
        <p>${isWinner
        ? `Congratulations! You have been selected as the <strong>Alumni of the Day</strong> for ${date}. Your profile will be featured on the platform for 24 hours.`
        : `Unfortunately, your bid for ${date} was not the highest. Don't give up - try again tomorrow!`
      }</p>
        <p style="font-size: 13px;">Check your bid status via: <code>GET /bids</code></p>
      </div>
    `
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`Bid notification (${status}) sent to ${to}:`, info.messageId);
  return info;
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendBidNotificationEmail
};
