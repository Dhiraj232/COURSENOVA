const User = require('../models/User');

// @desc    Complete Onboarding
// @route   PUT /api/users/onboarding
// @access  Private
exports.completeOnboarding = async (req, res) => {
    try {
        const { collegeName, city, coordinates } = req.body;
        // The user ID should come from the authMiddleware which we will add next
        const userId = req.user.id;

        if (!collegeName || !city) {
            return res.status(400).json({ message: 'College and City are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.collegeName = collegeName;
        user.city = city;
        if (coordinates && coordinates.length === 2) {
            user.location = {
                type: 'Point',
                coordinates: coordinates
            };
        }
        user.isOnboarded = true;

        await user.save();

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Onboarding Error:', error);
        res.status(500).json({ message: 'Server error during onboarding' });
    }
};
