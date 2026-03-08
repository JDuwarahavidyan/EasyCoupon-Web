const router = require('express').Router();
const verifyAdmin = require('../verifyToken');
const logAction = require('../logAction');

// GET /api/logs - Fetch paginated audit logs
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const db = req.db;
        const pageSize = parseInt(req.query.pageSize) || 15;
        const startAfterId = req.query.startAfter || null;

        let query = db.collection('logs')
            .orderBy('timestamp', 'desc')
            .limit(pageSize);

        if (startAfterId) {
            const startAfterDoc = await db.collection('logs').doc(startAfterId).get();
            if (startAfterDoc.exists) {
                query = query.startAfter(startAfterDoc);
            }
        }

        const snapshot = await query.get();
        const logs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate?.()
                ? doc.data().timestamp.toDate().toISOString()
                : doc.data().timestamp,
        }));

        const lastDoc = snapshot.docs[snapshot.docs.length - 1];

        res.status(200).json({
            logs,
            nextCursor: lastDoc ? lastDoc.id : null,
            hasMore: snapshot.docs.length === pageSize,
        });
    } catch (err) {
        console.error('Logs fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// POST /api/logs - Log a client-side action (e.g., report download)
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const { action, details } = req.body;

        if (!action || !details) {
            return res.status(400).json({ error: 'action and details are required' });
        }

        await logAction(req.db, {
            adminId: req.user.uid,
            adminName: req.user.fullName,
            action,
            details,
        });

        res.status(201).json({ message: 'Log entry created' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create log entry' });
    }
});

module.exports = router;
