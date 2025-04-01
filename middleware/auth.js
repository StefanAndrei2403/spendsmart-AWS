// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User.js');

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Extrage tokenul din header-ul 'Authorization'

  if (!token) {
    return res.status(401).json({ message: 'Nu ești autentificat!' });
  }

  try {
    const decoded = jwt.verify(token, 'SECRET_KEY'); // Verifică token-ul
    req.userId = decoded.id; // Salvează id-ul utilizatorului pentru a-l folosi în rutele următoare
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token invalid sau expirat!' });
  }
};
