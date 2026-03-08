const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

const verifyAdmin = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(403).json({ error: "Token is missing" });
    }

    try {
        // Verify token signature with SECRET_KEY
        const decodedToken = jwt.verify(token, process.env.SECRET_KEY);

        if (!decodedToken || !decodedToken.uid) {
            return res.status(403).json({ error: "Invalid token" });
        }

        // Fetch user data from Firestore using the uid
        const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();

        if (!userDoc.exists || (userDoc.data().role !== 'admin' && userDoc.data().role !== 'superadmin')) {
            return res.status(403).json({ error: "Access denied. Admins only." });
        }

        const userData = userDoc.data();
        req.user = {
            uid: decodedToken.uid,
            role: userData.role,
            fullName: userData.fullName,
            userName: userData.userName,
        };
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Token has expired" });
        }
        res.status(403).json({ error: "Invalid token" });
    }
};

module.exports = verifyAdmin;
