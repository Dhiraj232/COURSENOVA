const User = require('../models/User');
const jwt = require('jsonwebtoken');

// @desc    Auth with Google
// @route   POST /api/auth/google
// @access  Public
exports.googleAuth = async (req, res) => {
    try {
        const { googleId, email, name, profilePicture } = req.body;

        if (!googleId || !email || !name) {
            return res.status(400).json({ message: 'Missing required Google Profile fields' });
        }

        let user = await User.findOne({ googleId });

        if (!user) {
            // First time login - Create user
            user = await User.create({
                googleId,
                email,
                name,
                profilePicture,
                isOnboarded: false // Needs to provide college and city later
            });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, role: user.role, isOnboarded: user.isOnboarded },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({
            success: true,
            token,
            user
        });

    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).json({ message: 'Server error during authentication' });
    }
};
