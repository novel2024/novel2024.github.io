/**
 * Middleware to check if a user is authenticated.
 * If req.session.user exists, the user is considered authenticated.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        // User is authenticated, proceed to the next middleware or route handler
        return next();
    } else {
        // User is not authenticated, redirect to the login page
        // Optional: Store the intended URL in session to redirect back after login
        // req.session.returnTo = req.originalUrl;
        res.redirect('/login');
    }
}

module.exports = {
    isAuthenticated
};
