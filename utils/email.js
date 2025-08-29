const nodemailer = require('nodemailer');
const { logger } = require('./logger');

// Email configuration
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
};

// Create transporter
const createTransporter = () => {
  try {
    const transporter = nodemailer.createTransport(EMAIL_CONFIG);
    
    // Verify connection configuration
    transporter.verify((error, success) => {
      if (error) {
        logger.error('Email transporter verification failed:', error.message);
      } else {
        logger.info('✅ Email server is ready to send messages');
      }
    });
    
    return transporter;
  } catch (error) {
    logger.error('Failed to create email transporter:', error.message);
    return null;
  }
};

// Initialize transporter
let transporter = createTransporter();

/**
 * Send email
 * @param {Object} options - Email options
 * @returns {Promise<Object>} - Send result
 */
const sendEmail = async (options) => {
  try {
    if (!transporter) {
      throw new Error('Email transporter not configured');
    }

    const {
      to,
      subject,
      text,
      html,
      from = process.env.EMAIL_FROM || 'Pest Control Management <noreply@pestcontrol.com>',
      attachments = []
    } = options;

    if (!to || !subject || (!text && !html)) {
      throw new Error('Missing required email fields: to, subject, and content');
    }

    const mailOptions = {
      from,
      to,
      subject,
      text,
      html,
      attachments
    };

    const info = await transporter.sendMail(mailOptions);
    
    logger.info('Email sent successfully', {
      to,
      subject,
      messageId: info.messageId,
      response: info.response
    });

    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (error) {
    logger.error('Failed to send email:', {
      error: error.message,
      to: options.to,
      subject: options.subject
    });
    
    throw new Error('Failed to send email. Please try again later.');
  }
};

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {string} tempPassword - Temporary password
 * @returns {Promise<Object>} - Send result
 */
const sendPasswordResetEmail = async (email, name, tempPassword) => {
  const subject = 'Password Reset - Pest Control Management';
  
  const text = `
Hi ${name},

Your password has been reset for your Pest Control Management account.

Your temporary password is: ${tempPassword}

For security reasons, please log in and change your password immediately.

Login URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login

If you did not request this password reset, please contact our support team immediately.

Best regards,
Pest Control Management Team
  `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .password-box { background-color: #e0f2fe; border: 2px solid #0284c7; padding: 15px; margin: 20px 0; text-align: center; border-radius: 6px; }
        .password { font-size: 24px; font-weight: bold; color: #0284c7; letter-spacing: 2px; }
        .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🐛 Pest Control Management</h1>
        <p>Password Reset Notification</p>
      </div>
      
      <div class="content">
        <h2>Hi ${name},</h2>
        
        <p>Your password has been reset for your Pest Control Management account.</p>
        
        <div class="password-box">
          <p><strong>Your temporary password is:</strong></p>
          <div class="password">${tempPassword}</div>
        </div>
        
        <div class="warning">
          <strong>⚠️ Important Security Notice:</strong><br>
          For security reasons, please log in and change your password immediately after accessing your account.
        </div>
        
        <p style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">
            Login to Your Account
          </a>
        </p>
        
        <p><strong>Security Tips:</strong></p>
        <ul>
          <li>Never share your password with anyone</li>
          <li>Use a strong, unique password</li>
          <li>Log out when using shared computers</li>
          <li>Contact support if you notice any suspicious activity</li>
        </ul>
        
        <p>If you did not request this password reset, please contact our support team immediately at <a href="mailto:support@pestcontrol.com">support@pestcontrol.com</a>.</p>
      </div>
      
      <div class="footer">
        <p>Best regards,<br>Pest Control Management Team</p>
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject,
    text,
    html
  });
};

/**
 * Send welcome email for new staff registration
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {string} role - Staff role
 * @param {string} tempPassword - Temporary password
 * @returns {Promise<Object>} - Send result
 */
const sendWelcomeEmail = async (email, name, role, tempPassword) => {
  const subject = 'Welcome to Pest Control Management System';
  
  const text = `
Welcome ${name}!

Your account has been created successfully in the Pest Control Management System.

Account Details:
- Email: ${email}
- Role: ${role}
- Temporary Password: ${tempPassword}

Please log in and change your password immediately for security.

Login URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login

Best regards,
Pest Control Management Team
  `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Pest Control Management</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f0fdf4; padding: 30px; border-radius: 0 0 8px 8px; }
        .account-details { background-color: white; border: 1px solid #d1d5db; padding: 20px; margin: 20px 0; border-radius: 6px; }
        .password-box { background-color: #e0f2fe; border: 2px solid #0284c7; padding: 15px; margin: 20px 0; text-align: center; border-radius: 6px; }
        .password { font-size: 20px; font-weight: bold; color: #0284c7; letter-spacing: 1px; }
        .button { display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🐛 Pest Control Management</h1>
        <p>Welcome to the Team!</p>
      </div>
      
      <div class="content">
        <h2>Welcome ${name}! 🎉</h2>
        
        <p>Your account has been successfully created in the Pest Control Management System. We're excited to have you on board!</p>
        
        <div class="account-details">
          <h3>Your Account Details:</h3>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Role:</strong> ${role}</p>
          <p><strong>Status:</strong> Active</p>
        </div>
        
        <div class="password-box">
          <p><strong>Your temporary password:</strong></p>
          <div class="password">${tempPassword}</div>
          <p style="font-size: 14px; margin-top: 10px;">Please change this password after your first login</p>
        </div>
        
        <p style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">
            Login to Your Account
          </a>
        </p>
        
        <p><strong>Getting Started:</strong></p>
        <ol>
          <li>Click the login button above</li>
          <li>Enter your email and temporary password</li>
          <li>Change your password to something secure</li>
          <li>Complete your profile setup</li>
          <li>Start managing pest control operations!</li>
        </ol>
        
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
      </div>
      
      <div class="footer">
        <p>Best regards,<br>Pest Control Management Team</p>
        <p>Need help? Contact us at <a href="mailto:support@pestcontrol.com">support@pestcontrol.com</a></p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject,
    text,
    html
  });
};

/**
 * Send notification email for suspicious activity
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {Object} activityDetails - Details of suspicious activity
 * @returns {Promise<Object>} - Send result
 */
const sendSecurityAlertEmail = async (email, name, activityDetails) => {
  const { activity, ip, userAgent, timestamp } = activityDetails;
  const subject = 'Security Alert - Pest Control Management';
  
  const text = `
Security Alert for ${name}

We detected suspicious activity on your account:

Activity: ${activity}
IP Address: ${ip}
Device: ${userAgent}
Time: ${new Date(timestamp).toLocaleString()}

If this was you, you can ignore this email. If not, please secure your account immediately.

Best regards,
Pest Control Management Security Team
  `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Security Alert</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #fef2f2; padding: 30px; border-radius: 0 0 8px 8px; }
        .alert-box { background-color: #fee2e2; border: 2px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 6px; }
        .button { display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🚨 Security Alert</h1>
        <p>Suspicious Activity Detected</p>
      </div>
      
      <div class="content">
        <h2>Hi ${name},</h2>
        
        <p>We detected suspicious activity on your Pest Control Management account:</p>
        
        <div class="alert-box">
          <p><strong>Activity:</strong> ${activity}</p>
          <p><strong>IP Address:</strong> ${ip}</p>
          <p><strong>Device:</strong> ${userAgent}</p>
          <p><strong>Time:</strong> ${new Date(timestamp).toLocaleString()}</p>
        </div>
        
        <p>If this was you, you can safely ignore this email. If you don't recognize this activity, please secure your account immediately.</p>
        
        <p style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">
            Secure My Account
          </a>
        </p>
      </div>
      
      <div class="footer">
        <p>Best regards,<br>Pest Control Management Security Team</p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject,
    text,
    html
  });
};

/**
 * Test email configuration
 * @returns {Promise<boolean>} - Test result
 */
const testEmailConfig = async () => {
  try {
    if (!transporter) {
      return false;
    }

    await transporter.verify();
    logger.info('Email configuration test passed');
    return true;
  } catch (error) {
    logger.error('Email configuration test failed:', error.message);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendSecurityAlertEmail,
  testEmailConfig
};