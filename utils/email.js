// utils/email.js
// Email sending utility using Nodemailer
const nodemailer = require('nodemailer');

/**
 * Creates a Nodemailer transporter using SMTP configuration from environment variables.
 * For development, use Ethereal (https://ethereal.email/) for a fake SMTP server.
 * For production, use a real SMTP provider (Gmail, SendGrid, etc.).
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_PORT === '465', // true for port 465 (SSL), false for 587 (TLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

/**
 * Send a verification email to a newly registered alumnus.
 * Contains a link with a unique token to verify their email address.
 * @param {string} to - Recipient email address
 * @param {string} token - Verification token
 */
const sendVerificationEmail = async (to, token) => {
  const transporter = createTransporter();
  const verifyUrl = `${process.env.APP_URL}/auth/verify-email?token=${token}`;

  const mailOptions = {
    from: `"Alumni Influencers" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Verify Your Email - Alumni Influencers Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Welcome to Alumni Influencers!</h2>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" 
             style="background-color: #3498db; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; font-size: 16px;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #7f8c8d; font-size: 12px;">
          This link will expire in 24 hours. If you did not register, please ignore this email.
        </p>
        <p style="color: #7f8c8d; font-size: 12px;">
          Or copy and paste this URL into your browser: ${verifyUrl}
        </p>
      </div>
    `
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('Verification email sent:', info.messageId);

  // If using Ethereal, log the preview URL for testing
  if (process.env.SMTP_HOST === 'smtp.ethereal.email') {
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
  }

  return info;
};

/**
 * Send a password reset email with a secure token link.
 * @param {string} to - Recipient email address
 * @param {string} token - Password reset token
 */
const sendPasswordResetEmail = async (to, token) => {
  const transporter = createTransporter();
  const resetUrl = `${process.env.APP_URL}/auth/reset-password?token=${token}`;

  const mailOptions = {
    from: `"Alumni Influencers" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Password Reset - Alumni Influencers Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Password Reset Request</h2>
        <p>You requested a password reset. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #e74c3c; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #7f8c8d; font-size: 12px;">
          This link will expire in 1 hour. If you did not request a password reset, please ignore this email.
        </p>
        <p style="color: #7f8c8d; font-size: 12px;">
          Or copy and paste this URL into your browser: ${resetUrl}
        </p>
      </div>
    `
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('Password reset email sent:', info.messageId);

  if (process.env.SMTP_HOST === 'smtp.ethereal.email') {
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
  }

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
      ? '🎉 Congratulations! You are the Alumni of the Day!'
      : 'Bid Result - Alumni Influencers Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isWinner ? '#27ae60' : '#e74c3c'};">
          ${isWinner ? '🎉 You Won!' : 'Better Luck Next Time!'}
        </h2>
        <p>${isWinner
        ? `Congratulations! You have been selected as the <strong>Alumni of the Day</strong> for ${date}. Your profile will be featured on the platform for 24 hours.`
        : `Unfortunately, your bid for ${date} was not the highest. Don't give up — try again tomorrow!`
      }</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.APP_URL}/bids" 
             style="background-color: #3498db; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; font-size: 16px;">
            View Your Bids
          </a>
        </div>
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
