const router = require('express').Router();
const QRModel = require('../models/QR');
const verifyAdmin = require("../verifyToken");
const admin = require('firebase-admin');

router.get("/", verifyAdmin, async (req, res) => {
    try {
        const query = req.query.new;
        let qrcodeRef = admin.firestore().collection('qrcodes').orderBy('scannedAt', 'desc');

        // Limit to 7 qrcodes if the "new" query parameter is present
        if (query) {
            qrcodeRef = qrcodeRef.limit(7);
        }

        const snapshot = await qrcodeRef.get();
        const qrcodes = snapshot.docs.map(doc => doc.data());
        res.status(200).json(qrcodes);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch QR codes' });
    }
});

router.get("/summary", verifyAdmin, async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const allSnapshot = await admin.firestore().collection('qrcodes').get();

        let totalScans = 0;
        let todayScans = 0;
        let thisMonthScans = 0;
        let totalCouponsUsed = 0;

        allSnapshot.forEach(doc => {
            const data = doc.data();
            totalScans++;
            totalCouponsUsed += data.count || 0;

            if (data.scannedAt >= todayStart) {
                todayScans++;
            }
            if (data.scannedAt >= monthStart) {
                thisMonthScans++;
            }
        });

        res.status(200).json({ totalScans, todayScans, thisMonthScans, totalCouponsUsed });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch QR summary' });
    }
});

router.get("/find/:id", verifyAdmin, async (req, res) => {
    try {
        const qrcodeDoc = await admin.firestore().collection('qrcodes').doc(req.params.id).get();
        if (!qrcodeDoc.exists) {
            return res.status(404).json({ error: "QR code not found" });
        }
        const qrcode = qrcodeDoc.data();
        res.status(200).json(qrcode);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch QR code' });
    }
});

router.get("/stats", verifyAdmin, async (req, res) => {
    try {
      const lastYear = new Date();
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      const lastYearISO = lastYear.toISOString();

      const query = admin.firestore().collection('qrcodes')
        .where('scannedAt', '>=', lastYearISO);

      const snapshot = await query.get();

      const monthlyStats = {};

      snapshot.forEach(doc => {
        const scannedAt = new Date(doc.data().scannedAt);
        const month = scannedAt.getMonth() + 1;
        monthlyStats[month] = (monthlyStats[month] || 0) + 1;
      });

      const stats = Object.keys(monthlyStats).map(month => ({
        month: parseInt(month, 10),
        total: monthlyStats[month],
      }));

      res.status(200).json(stats);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch QR stats' });
    }
});


router.get('/count', verifyAdmin, async (req, res) => {
    try {
        const { role } = req.query;
        if (!role || (role !== 'canteena' && role !== 'canteenb')) {
            return res.status(400).json({ error: "Invalid or missing role. Please specify 'canteena' or 'canteenb'." });
        }

        const lastYear = new Date();
        lastYear.setFullYear(lastYear.getFullYear() - 1);
        const lastYearISO = lastYear.toISOString();

        const querySnapshot = await admin.firestore().collection('qrcodes')
            .where('canteenType', '==', role)
            .where('scannedAt', '>=', lastYearISO)
            .get();

        const monthlySums = {};

        querySnapshot.forEach(doc => {
            const data = doc.data();
            const scannedAt = new Date(data.scannedAt);
            const month = scannedAt.getMonth() + 1;

            if (!monthlySums[month]) {
                monthlySums[month] = 0;
            }
            monthlySums[month] += data.count;
        });

        const result = Object.keys(monthlySums).map(month => ({
            month: parseInt(month, 10),
            total: monthlySums[month],
        }));

        res.status(200).json(result);
    } catch (err) {
        console.error('QR count error:', err.message || err);
        res.status(500).json({ error: 'Failed to fetch QR count data' });
    }
});

module.exports = router;
