const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

module.exports = (req, res, next) => {
  // Acceptă token din: 1) Header, 2) Cookies, 3) Body
  const token = 
    req.headers.authorization?.split(' ')[1] || 
    req.cookies?.token ||
    req.body?.token;
    

  if (!token) {
    console.log('❌ Token lipsă din toate sursele');
    return res.status(401).json({ 
      message: 'Token missing!',
      redirectToLogin: true
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token valid pentru user ID:', decoded.id);
    
    req.userId = decoded.id; // Adaugă userId în request
    req.user = decoded; // Adaugă întregul obiect user în request
    next();
  } catch (error) {
    console.error('❌ Token invalid:', error.message);
    return res.status(401).json({ 
      message: 'Token invalid or expired!',
      redirectToLogin: true
    });
    
  }
};
