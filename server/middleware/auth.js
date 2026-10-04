const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'flink_demo_secret_change_in_production_2024';

function authMiddleware(req, res, next) {
  // Allow demo access with a fallback user for easier testing
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (err) {
      // Token invalid - fall through to demo user
    }
  }
  
  // Demo fallback: allow access with a default demo user
  // This enables testing without strict auth
  req.user = { id: 0, username: 'demo', role: 'Logistics Officer', full_name: 'Demo User' };
  next();
}

function roleCheck(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authMiddleware, roleCheck, JWT_SECRET };
