const { auth } = require('express-oauth2-jwt-bearer');

function createStaffAuth(pool, env = process.env) {
    const configured = Boolean(env.AUTH0_ISSUER_BASE_URL && env.AUTH0_AUDIENCE);
    const verify = configured ? auth({ issuerBaseURL: env.AUTH0_ISSUER_BASE_URL, audience: env.AUTH0_AUDIENCE, tokenSigningAlg: 'RS256' }) : (req, res) => res.status(503).json({ error: 'Staff sign-in is not configured.' });
    const requireRoles = (...roles) => [verify, async (req, res, next) => {
        try {
            const { rows } = await pool.query(
                'SELECT auth_subject, display_name, role, employee_id FROM staff_accounts WHERE auth_subject = $1 AND active = TRUE;',
                [req.auth.payload.sub]
            );
            const staff = rows[0];
            if (!staff || !roles.includes(staff.role)) return res.status(403).json({ error: 'Your account does not have access to this area.' });
            req.staff = staff;
            next();
        } catch (error) {
            console.error('Staff authorization failed:', error);
            res.status(503).json({ error: 'Unable to verify staff access. Please try again.' });
        }
    }];
    return { requireRoles };
}
module.exports = { createStaffAuth };
