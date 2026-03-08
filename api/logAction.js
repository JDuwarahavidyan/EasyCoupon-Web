const admin = require('firebase-admin');

const logAction = async (db, { adminId, adminName, action, details }) => {
    try {
        await db.collection('logs').add({
            adminId,
            adminName,
            action,
            details,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (err) {
        console.error('Audit log write failed:', err.message);
    }
};

module.exports = logAction;
