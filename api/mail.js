const axios = require('axios');
require('dotenv').config();

// Function to send an email via Brevo HTTP API (works on Render free tier)
const sendEmail = async (to, subject, fullName, customMessage) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f2f5f0; font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f5f0; padding:30px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr>
    <td style="background: linear-gradient(135deg, #2E5A3A 0%, #3CB34A 100%); padding:40px 40px 30px 40px; text-align:center;">
      <div style="font-size:36px; font-weight:700; color:#ffffff; letter-spacing:0.5px;">Easy Coupon</div>
      <div style="font-size:13px; color:rgba(255,255,255,0.8); margin-top:6px; letter-spacing:1px; text-transform:uppercase;">Meal Coupon Management</div>
    </td>
  </tr>

  <!-- Greeting -->
  <tr>
    <td style="background-color:#ffffff; padding:36px 40px 0 40px;">
      <p style="margin:0; font-size:18px; color:#2E5A3A; font-weight:600;">Hi ${fullName},</p>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="background-color:#ffffff; padding:20px 40px 36px 40px; font-size:15px; line-height:1.7; color:#444444;">
      ${customMessage}
    </td>
  </tr>

  <!-- Divider -->
  <tr>
    <td style="background-color:#ffffff; padding:0 40px;">
      <div style="border-top:1px solid #e4ebe4;"></div>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background-color:#ffffff; padding:24px 40px 16px 40px; text-align:center;">
      <p style="margin:0; font-size:14px; font-weight:600; color:#2E5A3A;">Easy Coupon Team</p>
      <p style="margin:4px 0 0 0; font-size:12px; color:#999999;">A Project By DEIE 22nd Batch</p>
    </td>
  </tr>

  <!-- Bottom Bar -->
  <tr>
    <td style="background-color:#f8faf8; padding:16px 40px; text-align:center; border-top:1px solid #e4ebe4;">
      <p style="margin:0; font-size:11px; color:#aaaaaa; line-height:1.6;">
        This is an automated message. Please do not reply to this email.<br>
        &copy; ${new Date().getFullYear()} Easy Coupon. All rights reserved.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  try {
    await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: {
        name: 'Easy Coupon',
        email: process.env.EMAIL_FROM,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html
    }, {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  sendEmail
};
