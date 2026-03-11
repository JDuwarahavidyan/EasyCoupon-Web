const router = require('express').Router();
const admin = require('firebase-admin');
const User = require('../models/User');
const { sendEmail } = require('../mail');
const crypto = require('crypto');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const verifyAdmin = require('../verifyToken');
const logAction = require('../logAction');

const VALID_ROLES = ['student', 'canteena', 'canteenb', 'admin', 'superadmin'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_LABELS = { student: 'Student', canteena: 'Canteen A', canteenb: 'Canteen B', admin: 'Admin', superadmin: 'Super Admin' };

const generateRandomPassword = (length = 8) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from(crypto.randomFillSync(new Uint8Array(length)))
        .map((x) => charset[x % charset.length])
        .join('');
};

// Register a new user
router.post('/register', verifyAdmin, async (req, res) => {
    const { email, userName, fullName, role } = req.body;
    const db = req.db;

    // Input validation
    if (!email || !userName || !fullName || !role) {
        return res.status(400).json({ error: 'All fields are required (email, userName, fullName, role)' });
    }
    if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    if (userName.length < 3 || userName.length > 30) {
        return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
    }
    if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
    }

    // Admin (non-superadmin) can only create student accounts
    if (req.user.role === 'admin' && role !== 'student') {
        return res.status(403).json({ error: 'Access denied. Admins can only create student accounts. Contact a Super Admin for other roles.' });
    }

    try {
        const existingUser = await db.collection('users')
            .where('userName', '==', userName)
            .limit(1)
            .get();

        if (!existingUser.empty) {
            return res.status(400).json({ error: 'Username is already taken' });
        }

        const password = generateRandomPassword();

        const userRecord = await admin.auth().createUser({
            email,
            password,
        });

        const newUser = new User({
            id: userRecord.uid,
            email,
            userName,
            fullName,
            role,
            isFirstTime: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            studentCount: 30,
            canteenCount: 0,
            profilePic: "https://www.pngkey.com/png/full/114-1149878_setting-user-avatar-in-specific-size-without-breaking.png",
            value: 0,
        });

        await db.collection('users').doc(userRecord.uid).set({
            id: newUser.id,
            email: newUser.email,
            userName: newUser.userName,
            fullName: newUser.fullName,
            isFirstTime: newUser.isFirstTime,
            createdAt: newUser.createdAt,
            updatedAt: newUser.updatedAt,
            role: newUser.role,
            studentCount: newUser.studentCount,
            canteenCount: newUser.canteenCount,
            profilePic: newUser.profilePic,
            value: newUser.value,
        });

        // Send a welcome email with username, password, and app download link
        await sendEmail(email, 'Welcome to Easy Coupon', fullName,
`<p style="margin:0 0 16px 0;">Your account has been successfully created. Below are your login credentials:</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
<tr><td style="background-color:#f2f8f2; border-radius:10px; padding:20px 24px; border-left:4px solid #3CB34A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:4px 0; font-size:14px; color:#888888; width:140px;">Username</td>
      <td style="padding:4px 0; font-size:15px; color:#2E5A3A; font-weight:600;">${userName}</td>
    </tr>
    <tr>
      <td style="padding:4px 0; font-size:14px; color:#888888; width:140px;">Temporary Password</td>
      <td style="padding:4px 0; font-size:15px; color:#2E5A3A; font-weight:600; font-family:monospace; letter-spacing:1px;">${password}</td>
    </tr>
  </table>
</td></tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
<tr><td style="background-color:#fff8f0; border-radius:10px; padding:16px 20px; border-left:4px solid #e8a020;">
  <p style="margin:0 0 6px 0; font-size:13px; font-weight:700; color:#b07810;">Important</p>
  <p style="margin:0; font-size:13px; color:#666666; line-height:1.6;">Do not share your credentials with anyone. Change your password immediately after your first login.</p>
</td></tr>
</table>

${(role === 'admin' || role === 'superadmin')
? `<p style="margin:0 0 16px 0;">Get started by logging into the Easy Coupon Admin Panel:</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
<tr><td align="center" style="border-radius:8px; background-color:#2E5A3A;">
  <a href="https://easycouponweb.onrender.com/"
     style="display:inline-block; padding:14px 36px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:8px;">
    Go to Admin Panel
  </a>
</td></tr>
</table>`
: `<p style="margin:0 0 16px 0;">Get started by downloading the Easy Coupon app:</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
<tr><td align="center" style="border-radius:8px; background-color:#2E5A3A;">
  <a href="https://drive.google.com/drive/folders/16UuWkCDu-atyW1CkSgx82H8Q8Wns6r1U?usp=sharing"
     style="display:inline-block; padding:14px 36px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:8px;">
    Download App
  </a>
</td></tr>
</table>`}`);

        // Audit log
        await logAction(db, {
            adminId: req.user.uid,
            adminName: req.user.fullName,
            action: 'CREATE_USER',
            details: `New ${ROLE_LABELS[role] || role} account created for ${fullName} (${userName})`,
        });

        res.status(201).json({
            message: 'User registered successfully and email sent',
            uid: userRecord.uid,
        });
    } catch (error) {
        res.status(400).json({ error: 'Registration failed. Please try again.' });
    }
});




router.post('/login', async (req, res) => {
    const { userName, password } = req.body;
    const db = req.db;

    if (!userName || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const userDoc = await db.collection('users')
            .where('userName', '==', userName)
            .limit(1)
            .get();

        if (userDoc.empty) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const userData = userDoc.docs[0].data();

        if (userData.role !== 'admin' && userData.role !== 'superadmin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const email = userData.email;

        // Use Firebase REST API to sign in with email and password
        const response = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`, {
            email,
            password,
            returnSecureToken: true
        });

        const userId = response.data.localId;

        // Generate a signed JWT token
        const customToken = jwt.sign(
            { uid: userId, role: userData.role },
            process.env.SECRET_KEY,
            { expiresIn: '24h' }
        );

        // Check if the user is logging in for the first time (isFirstTime)
        const isFirstTime = userData.isFirstTime || false;

        // Audit log
        await logAction(db, {
            adminId: userId,
            adminName: userData.fullName,
            action: 'LOGIN',
            details: `Signed in to the admin panel`,
        });

        res.status(200).json({
            customToken,
            uid: userId,
            isFirstTime,
            userName: userData.userName,
            fullName: userData.fullName,
            email: userData.email,
            profilePic: userData.profilePic,
            role: userData.role,
        });
    } catch (error) {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});


// Reset password route
router.post('/reset-password', async (req, res) => {
    const { uid, currentPassword, newPassword } = req.body;
    const db = req.db;

    if (!uid || !currentPassword || !newPassword) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // Fetch the user document by uid
        const userDoc = await db.collection('users')
            .where('id', '==', uid)
            .limit(1)
            .get();

        if (userDoc.empty) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.docs[0].data();
        const email = userData.email;

        // Check if newPassword has at least 6 characters
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }

        // Check if the new password is the same as the old password
        if (currentPassword === newPassword) {
            return res.status(400).json({ error: 'New password cannot be the same as the old password' });
        }

        // Use Firebase REST API to sign in with the old password to validate it
        await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`, {
            email,
            password: currentPassword,
            returnSecureToken: true
        });

        // Update the user's password using Firebase Admin SDK
        await admin.auth().updateUser(uid, {
            password: newPassword
        });
        await db.collection('users').doc(uid).update({
            isFirstTime: false
        });

        // Audit log
        await logAction(db, {
            adminId: uid,
            adminName: userData.fullName,
            action: 'RESET_PASSWORD',
            details: `Password changed successfully`,
        });

        res.status(200).json({
            message: 'Password updated successfully'
        });
    } catch (error) {
        if (error.response) {
            const errorCode = error.response.data?.error?.message;
            if (errorCode === 'INVALID_LOGIN_CREDENTIALS') {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }
            return res.status(400).json({ error: 'Password reset failed. Please try again.' });
        }
        res.status(400).json({ error: 'Password reset failed. Please try again.' });
    }
});


// In-memory OTP store: { email: { otp, expiresAt, attempts } }
const otpStore = new Map();
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_OTP_ATTEMPTS = 5;

const generateOtp = () => {
    return Array.from(crypto.randomFillSync(new Uint8Array(3)))
        .map((x) => x % 10)
        .join('') + Array.from(crypto.randomFillSync(new Uint8Array(3)))
        .map((x) => x % 10)
        .join('');
};

// Forgot password - Step 1: Send OTP to email
router.post('/forgot-password/send-otp', async (req, res) => {
    const { email } = req.body;
    const db = req.db;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    try {
        const userDoc = await db.collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (userDoc.empty) {
            return res.status(404).json({ error: 'No account found with this email address.' });
        }

        const userData = userDoc.docs[0].data();

        if (userData.role !== 'admin' && userData.role !== 'superadmin') {
            return res.status(403).json({ error: 'Password reset is only available for admin accounts.' });
        }

        const otp = generateOtp();
        otpStore.set(email, {
            otp,
            expiresAt: Date.now() + OTP_EXPIRY_MS,
            attempts: 0,
        });

        // Send OTP email
        await sendEmail(email, 'Password Reset OTP - Easy Coupon', userData.fullName,
`<p style="margin:0 0 16px 0;">We received a request to reset your password. Use the verification code below to proceed with the password reset.</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
<tr><td style="background-color:#f2f8f2; border-radius:10px; padding:24px; text-align:center; border-left:4px solid #3CB34A;">
  <p style="margin:0 0 8px 0; font-size:13px; color:#888888; text-transform:uppercase; letter-spacing:1px;">Verification Code</p>
  <p style="margin:0; font-size:32px; font-weight:700; color:#2E5A3A; letter-spacing:6px; font-family:monospace;">${otp}</p>
</td></tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
<tr><td style="background-color:#fff8f0; border-radius:10px; padding:16px 20px; border-left:4px solid #e8a020;">
  <p style="margin:0 0 6px 0; font-size:13px; font-weight:700; color:#b07810;">Important</p>
  <p style="margin:0; font-size:13px; color:#666666; line-height:1.6;">This code expires in 5 minutes. If you did not request this reset, please ignore this email and your password will remain unchanged.</p>
</td></tr>
</table>`);

        res.status(200).json({ message: 'An OTP has been sent to your email.' });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ error: 'Something went wrong. Please try again later.' });
    }
});

// Forgot password - Step 2: Verify OTP and reset password
router.post('/forgot-password/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    const db = req.db;

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const storedOtp = otpStore.get(email);

    if (!storedOtp) {
        return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
    }

    if (Date.now() > storedOtp.expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (storedOtp.attempts >= MAX_OTP_ATTEMPTS) {
        otpStore.delete(email);
        return res.status(429).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }

    if (storedOtp.otp !== otp) {
        storedOtp.attempts += 1;
        return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    // OTP is valid — delete it so it can't be reused
    otpStore.delete(email);

    try {
        const userDoc = await db.collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (userDoc.empty) {
            return res.status(400).json({ error: 'User not found.' });
        }

        const userData = userDoc.docs[0].data();
        const uid = userData.id;
        const newPassword = generateRandomPassword();

        // Update password in Firebase Auth
        await admin.auth().updateUser(uid, { password: newPassword });

        // Set isFirstTime to true so user must change password on next login
        await db.collection('users').doc(uid).update({
            isFirstTime: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Send password reset email with new temp credentials
        await sendEmail(email, 'Password Reset - Easy Coupon', userData.fullName,
`<p style="margin:0 0 16px 0;">Your password has been successfully reset. Please use the credentials below to log in and change your password immediately.</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
<tr><td style="background-color:#f2f8f2; border-radius:10px; padding:20px 24px; border-left:4px solid #3CB34A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:4px 0; font-size:14px; color:#888888; width:140px;">Username</td>
      <td style="padding:4px 0; font-size:15px; color:#2E5A3A; font-weight:600;">${userData.userName}</td>
    </tr>
    <tr>
      <td style="padding:4px 0; font-size:14px; color:#888888; width:140px;">Temporary Password</td>
      <td style="padding:4px 0; font-size:15px; color:#2E5A3A; font-weight:600; font-family:monospace; letter-spacing:1px;">${newPassword}</td>
    </tr>
  </table>
</td></tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
<tr><td style="background-color:#fff8f0; border-radius:10px; padding:16px 20px; border-left:4px solid #e8a020;">
  <p style="margin:0 0 6px 0; font-size:13px; font-weight:700; color:#b07810;">Important</p>
  <p style="margin:0; font-size:13px; color:#666666; line-height:1.6;">This temporary password will expire on your next login. Please log in and change your password immediately. If you did not request this reset, contact your administrator.</p>
</td></tr>
</table>

<p style="margin:0 0 16px 0;">Log in to the Easy Coupon Admin Panel to change your password:</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
<tr><td align="center" style="border-radius:8px; background-color:#2E5A3A;">
  <a href="https://easycouponweb.onrender.com/"
     style="display:inline-block; padding:14px 36px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:8px;">
    Go to Admin Panel
  </a>
</td></tr>
</table>`);

        // Audit log
        await logAction(db, {
            adminId: uid,
            adminName: userData.fullName,
            action: 'FORGOT_PASSWORD',
            details: `Password reset via OTP verification`,
        });

        res.status(200).json({ message: 'Password has been reset. Check your email for the new credentials.' });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Something went wrong. Please try again later.' });
    }
});


module.exports = router;
