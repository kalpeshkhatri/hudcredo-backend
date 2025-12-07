import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // jyare user  jwt token  tena authenticate header ma mokal se tyare aapne tre token ne varify kari ne next route ma mokal vanu nahi tar tene return kari devanu 6e.

  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <token>

  if (!token) return res.status(401).json({ message: 'Token missing' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    // aa jwt token jo varify  thai hayi to te ne normal ma convert kari ne user ma save karavse:user={email:  ,password:   }. means aa user aa token no decoded part 6e.aa user ma biju system generated iat pan hoy 6e.==>{ password: '123', email: 'test@example.com', iat: 1691052734 }. aa iat e computer sytem generate kare 6e.

    // jo token varify nahi thay to return 403 karse.
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });

    // jo error thi return na thay to aagal aavse and req.user=user bani hase.
    req.user = user;
    next();
  });
};
