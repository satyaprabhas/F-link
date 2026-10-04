const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

module.exports = (db) => {
  const router = express.Router();

  // POST /api/auth/login
  router.post('/login', (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = bcrypt.compareSync(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Audit log
      try {
        db.prepare("INSERT INTO audit_log (user, role, action, category, details, timestamp) VALUES (?, ?, ?, ?, ?, datetime('now'))")
          .run(user.username, user.role, 'LOGIN', 'Auth', `User ${user.username} logged in`);
      } catch(e) { /* non-critical */ }

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role
        }
      });
    } catch (err) {
      res.status(500).json({ error: 'Login failed: ' + err.message });
    }
  });

  // GET /api/auth/me
  router.get('/me', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare("SELECT id, username, full_name, role, last_login FROM users WHERE id = ?").get(decoded.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // PUT /api/auth/profile - Edit Name & Password for any logged in officer
  router.put('/profile', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(decoded.id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const { full_name, password } = req.body;

      if (!full_name && !password) {
        return res.status(400).json({ error: 'Name or password required to update profile' });
      }

      const updatedName = full_name?.trim() ? full_name.trim() : user.full_name;
      let newHash = user.password_hash;
      if (password && password.trim().length > 0) {
        newHash = bcrypt.hashSync(password.trim(), 10);
      }

      db.prepare("UPDATE users SET full_name = ?, password_hash = ? WHERE id = ?")
        .run(updatedName, newHash, user.id);

      const updatedUser = db.prepare("SELECT id, username, full_name, role, last_login FROM users WHERE id = ?").get(user.id);

      const newToken = jwt.sign(
        { id: updatedUser.id, username: updatedUser.username, role: updatedUser.role, full_name: updatedUser.full_name },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      try {
        db.prepare("INSERT INTO audit_log (user, role, action, category, details, timestamp) VALUES (?, ?, ?, ?, ?, datetime('now'))")
          .run(user.username, user.role, 'UPDATE_PROFILE', 'Auth', `User ${user.username} updated name to "${updatedName}" and updated password`);
      } catch(e) {}

      res.json({
        success: true,
        message: 'Profile updated successfully',
        token: newToken,
        user: updatedUser
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update profile: ' + err.message });
    }
  });

  return router;
};
