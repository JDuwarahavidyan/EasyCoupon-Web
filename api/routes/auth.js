const router = require('express').Router();
const admin = require('firebase-admin');
const User = require('../models/User');
const { sendEmail } = require('../mail');
const crypto = require('crypto');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const verifyAdmin = require('../verifyToken');

const VALID_ROLES = ['student', 'canteena', 'canteenb', 'admin'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

${role === 'admin'
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

        if (userData.role !== 'admin') {
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



module.exports = router;
