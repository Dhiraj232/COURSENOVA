const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// serialize user into session (id only)
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// deserialize user from session by id
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Google OAuth strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: '/auth/google/callback'
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const { id, displayName, emails, photos } = profile;
                    let user = await User.findOne({ googleId: id });
                    if (!user) {
                        user = await User.create({
                            googleId: id,
                            email: (emails && emails[0] && emails[0].value) || '',
                            name: displayName,
                            profilePicture: (photos && photos[0] && photos[0].value) || '',
                            role: 'user'
                        });
                    }
                    done(null, user);
                } catch (err) {
                    done(err, null);
                }
            }
        )
    );
} else {
    console.warn('Google OAuth credentials missing; skipping strategy initialization');
}
