const router = require('express').Router();
const User = require('../models/User');
const verifyAdmin = require("../verifyToken");
const admin = require('firebase-admin');
const { sendEmail } = require('../mail');



// Allowed fields for user update (prevent privilege escalation)
const ALLOWED_UPDATE_FIELDS = ['email', 'userName', 'fullName', 'profilePic'];

// UPDATE
router.put("/:id", verifyAdmin, async (req, res) => {
  const userId = req.params.id;
  const db = admin.firestore();

  // Only pick allowed fields from request body
  const updates = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const { email, userName } = updates;

  try {
      // Check if the username is taken by another user
      if (userName) {
          const existingUser = await db.collection('users')
              .where('userName', '==', userName)
              .where(admin.firestore.FieldPath.documentId(), '!=', userId)
              .limit(1)
              .get();

          if (!existingUser.empty) {
              return res.status(400).json({ error: 'Username is already taken' });
          }
      }

      // Check if the email is taken by another user
      if (email) {
          const existingEmailUser = await admin.auth().getUserByEmail(email).catch(() => null);

          if (existingEmailUser && existingEmailUser.uid !== userId) {
              return res.status(400).json({ error: 'Email is already taken' });
          }
      }

      // Update Firebase Auth user (only email if provided)
      if (email) {
          await admin.auth().updateUser(userId, { email });
      }

      // Update Firestore user document
      const userRef = db.collection('users').doc(userId);
      await userRef.update({
          ...updates,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const updatedUser = await userRef.get();
      res.status(200).json(updatedUser.data());
  } catch (err) {
      res.status(500).json({ error: 'Failed to update user' });
  }
});


// DELETE
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
      // Only admins can delete users
      await admin.auth().deleteUser(req.params.id);
      await admin.firestore().collection('users').doc(req.params.id).delete();
      res.status(200).json("User has been deleted...");
  } catch (err) {
      res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET USER SUMMARY (for dashboard)
router.get("/summary", verifyAdmin, async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('users').get();
    const summary = {
      totalUsers: 0,
      totalStudents: 0,
      totalCanteenA: 0,
      totalCanteenB: 0,
      totalAdmins: 0,
      disabledUsers: 0,
      activeUsers: 0,
    };

    snapshot.forEach(doc => {
      const data = doc.data();
      summary.totalUsers++;
      if (data.disabled) {
        summary.disabledUsers++;
      } else {
        summary.activeUsers++;
      }
      switch (data.role) {
        case 'student': summary.totalStudents++; break;
        case 'canteena': summary.totalCanteenA++; break;
        case 'canteenb': summary.totalCanteenB++; break;
        case 'admin': summary.totalAdmins++; break;
      }
    });

    res.status(200).json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user summary' });
  }
});

// GET USER BY ID
router.get("/find/:id", verifyAdmin, async (req, res) => {
  try {
      const userDoc = await admin.firestore().collection('users').doc(req.params.id).get();
      if (!userDoc.exists) {
          return res.status(404).json({ error: "User not found" });
      }

      const user = userDoc.data();
      res.status(200).json(user);
  } catch (err) {
      res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET ALL USERS
router.get("/", verifyAdmin, async (req, res) => {
  try {
      const query = req.query.new;
      let usersRef = admin.firestore().collection('users').orderBy('createdAt', 'desc');

      // Limit to 7 users if the "new" query parameter is present
      if (query) {
          usersRef = usersRef.limit(7);
      }

      const snapshot = await usersRef.get();
      const users = snapshot.docs.map(doc => doc.data());
      res.status(200).json(users);
  } catch (err) {
      res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET USER STATS - MONTHLY USERS REGISTERED
router.get("/stats", verifyAdmin, async (req, res) => {
  try {
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);

    const query = admin.firestore().collection('users')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(lastYear));

    const snapshot = await query.get();

    const monthlyStats = {};

    snapshot.forEach(doc => {
      const createdAt = doc.data().createdAt.toDate();
      const month = createdAt.getMonth() + 1;
      monthlyStats[month] = (monthlyStats[month] || 0) + 1;
    });

    const stats = Object.keys(monthlyStats).map(month => ({
      month: parseInt(month, 10),
      total: monthlyStats[month],
    }));

    res.status(200).json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});


router.put("/disable/:id", verifyAdmin, async (req, res) => {
  try {
    const uid = req.params.id;

    // Disable the user account in Firebase Authentication
    await admin.auth().updateUser(uid, {
      disabled: true
    });

    // Update the Firestore document to reflect the disabled status
    await admin.firestore().collection('users').doc(uid).update({
      disabled: true
    });

    // Fetch user details from Firestore
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    const userEmail = userDoc.data().email;
    const fullName = userDoc.data().fullName;

    // Send notification email
    await sendEmail(userEmail, 'Account Suspended', fullName,
`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
<tr><td style="background-color:#fef2f2; border-radius:10px; padding:20px 24px; border-left:4px solid #dc3545; text-align:center;">
  <div style="font-size:28px; margin-bottom:8px;">&#9888;</div>
  <p style="margin:0; font-size:16px; font-weight:700; color:#dc3545;">Account Suspended</p>
</td></tr>
</table>

<p style="margin:0 0 14px 0;">We regret to inform you that your account has been <strong>suspended</strong>. If you believe this is a mistake, please contact the Administration at your earliest convenience.</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
<tr><td style="background-color:#fff8f0; border-radius:10px; padding:16px 20px; border-left:4px solid #e8a020;">
  <p style="margin:0 0 6px 0; font-size:13px; font-weight:700; color:#b07810;">Important</p>
  <p style="margin:0; font-size:13px; color:#666666; line-height:1.6;">Do not attempt to access your account until this issue is resolved.</p>
</td></tr>
</table>

<p style="margin:0; color:#666666;">Thank you for your understanding.</p>`);
      
    res.status(200).json({ message: "User account has been disabled" });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disable user' });
  }
});


// ENABLE USER ACCOUNT
router.put("/enable/:id", verifyAdmin, async (req, res) => {
  try {
    const uid = req.params.id;

    // Enable the user account in Firebase Authentication
    await admin.auth().updateUser(uid, {
      disabled: false
    });

    // Update the Firestore document to reflect the enabled status
    await admin.firestore().collection('users').doc(uid).update({
      disabled: false
    });

    // Fetch user details from Firestore
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    const userEmail = userDoc.data().email;
    const fullName = userDoc.data().fullName;

    // Send notification email
    await sendEmail(userEmail, 'Account Re-enabled', fullName,
`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
<tr><td style="background-color:#f2f8f2; border-radius:10px; padding:20px 24px; border-left:4px solid #3CB34A; text-align:center;">
  <div style="font-size:28px; margin-bottom:8px;">&#10003;</div>
  <p style="margin:0; font-size:16px; font-weight:700; color:#2E5A3A;">Account Re-enabled</p>
</td></tr>
</table>

<p style="margin:0 0 14px 0;">We are pleased to inform you that your account has been <strong>re-enabled</strong>. You may now log in and continue using Easy Coupon.</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
<tr><td style="background-color:#fff8f0; border-radius:10px; padding:16px 20px; border-left:4px solid #e8a020;">
  <p style="margin:0 0 6px 0; font-size:13px; font-weight:700; color:#b07810;">Important</p>
  <p style="margin:0; font-size:13px; color:#666666; line-height:1.6;">If you did not request this action, please contact the Administration immediately to secure your account.</p>
</td></tr>
</table>

<p style="margin:0; color:#666666;">Thank you for your attention to this matter.</p>`);
      
      

    res.status(200).json({ message: "User account has been enabled" });
  } catch (err) {
    res.status(500).json({ error: 'Failed to enable user' });
  }
});




  
module.exports = router;