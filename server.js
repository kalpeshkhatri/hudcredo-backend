
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth.js';
// import protectedRoutes from './routes/protected.js';

import { authenticateToken } from './middlewares/authMiddleware.js';



dotenv.config();

const app = express();
app.use(cors({
  origin: ["http://localhost:1234", "http://127.0.0.1:1234",'https://kalpeshkhatri.github.io'],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));


app.use(express.json());


app.use('/auth', authRoutes);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    // insertDefaultMaintopics(); // aa function ne call karvathi aapne maintopics database ma jata rahse
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });

  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
  });
