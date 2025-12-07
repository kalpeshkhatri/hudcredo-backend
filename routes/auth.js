import express from 'express';
import bcrypt from 'bcrypt';
import User from '../models/user.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
// import nodemailer from 'nodemailer';
import crypto from 'crypto';
import SibApiV3Sdk from "sib-api-v3-sdk";
dotenv.config();



// import User from '../backend/models/User.js';

const router = express.Router();


//----------------------------
router.post("/signup", async (req, res) => {
  const { email, password, username } = req.body;

  
  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  const apiKey = defaultClient.authentications["api-key"];
  apiKey.apiKey = process.env.BREVO_API_KEY;

  // console.log("BREVO KEY:", apiKey.apiKey);

  const sendVerificationEmail = async (email, username, verifyUrl) => {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    try {
      await apiInstance.sendTransacEmail({
        sender: { email: "kalpquiz@gmail.com", name: "Hudcredo" },
        to: [{ email }],
        subject: "Verify your Hudcredo email",
       
        htmlContent: `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2 style="color: #4CAF50;">Welcome to Hudcredo, ${username}!</h2>

    <p>Thank you for creating an account with <strong>Hudcredo</strong>.</p>

    <p>To complete your registration and activate your account, please verify your email address by clicking the button below:</p>

    <div style="margin: 25px 0;">
      <a href="${verifyUrl}" target="_blank" 
         style="
           background-color: #4CAF50;
           color: white;
           padding: 12px 20px;
           text-decoration: none;
           border-radius: 6px;
           font-size: 16px;
         ">
        Verify Email Address
      </a>
    </div>

    <p>If the button above doesn’t work, copy and paste the link below into your browser:</p>
    <p style="word-break: break-all;">
      <a href="${verifyUrl}" target="_blank">${verifyUrl}</a>
    </p>

    <p>If you did not create this account, you can safely ignore this email.</p>

    <br>
    <p>Best regards,<br><strong>The Hudcredo Team</strong></p>
  </div>`
      });

      console.log("📩 Email sent to:", email);
    } catch (err) {
      console.error("❌ Brevo Error:", err.message);
      throw err;
    }
  };

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const newUser = new User({
      email,
      password: hashedPassword,
      isVerified: false,
      verificationToken,
      username,
    });

    await newUser.save();

    const verifyUrl = `http://localhost:5000/auth/verify?token=${verificationToken}`;
    console.log("Verify URL:", verifyUrl);

    await sendVerificationEmail(email, username, verifyUrl);

    res.status(201).json({ message: "Signup successful! Check your email." });

  } catch (err) {
    console.error("❌ Signup Error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});







// Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
   

    if (!user){ 
      // alert('invalid email or password');
      return res.status(401).json({ message: 'Invalid email or password' })}

    if (!user.isVerified) {
    return res.status(401).json({ message: 'Please verify your email before logging in.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid email or password' });

    
    // Generate JWT
    const token = jwt.sign(
      { name: user.username,id:user.id},
      process.env.JWT_SECRET,
      { expiresIn: user.isAdmin ? '20m' : '30d' } // token valid for user is 30days and for admin only 20minute
    );

    res.status(200).json({ token});
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});








router.get('/verify', async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({ verificationToken: token });

    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.send('<h3>Email verified! You can now log in.</h3>');
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ----------------------------------------------------------------------
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "No account found with that email." });

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications["api-key"];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    const resetLink = `https://kalpeshkhatri.github.io/hudcredo-frontend/reset.html?token=${token}`;

    await apiInstance.sendTransacEmail({
      sender: { email: "kalpquiz@gmail.com", name: "Hudcredo" },
      to: [{ email }],
      subject: "Reset your Hudcredo password",

      htmlContent: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Password Reset Request</h2>
        <p>You requested to reset your Hudcredo password.</p>

        <p>Click the button below to set a new password:</p>

        <a href="${resetLink}" style="
            display: inline-block;
            background: #4CAF50;
            color: white;
            padding: 10px 18px;
            text-decoration: none;
            border-radius: 5px;
            font-size: 16px;">
          Reset Password
        </a>

        <p>If the button doesn’t work, copy this link:</p>
        <p>${resetLink}</p>

        <p>This link will expire in <b>15 minutes</b>.</p>
      </div>
      `,
    });

    res.status(200).json({ message: "Password reset link sent to your email." });
  } catch (err) {
    console.error("❌ Forgot password error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token." });

    const hashed = await bcrypt.hash(newPassword, 10);

    user.password = hashed;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful. Please log in." });
  } catch (err) {
    console.error("❌ Reset password error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});













// ------------------------------------------------------------------

// router.post('/forgot-password', async (req, res) => {
//   const { email } = req.body;

//   try {
//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ message: 'No account found with that email.' });

//     const token = crypto.randomBytes(32).toString('hex');
//     user.resetPasswordToken = token;
//     user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // valid for 15 minutes
//     await user.save();

//     // ✅ DEFINE transporter
//     const transporter = nodemailer.createTransport({
//       service: 'Gmail',
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     const resetLink = `https://kalpeshkhatri.github.io/hudcredo-frontend/reset.html?token=${token}`;

//     await transporter.sendMail({
//       to: email,
//       from: '"Hudcredo" <no-reply@hudcredo.com>',
//       subject: 'Reset your Hudcredo password',
//       html: `
//         <h3>Reset Your Hudcredo Password</h3>
//         <p>Click the link below to reset your password:</p>
//         <a href="${resetLink}">${resetLink}</a>
//         <p>This link expires in 15 minutes.</p>
//       `,
//     });

//     res.status(200).json({ message: 'Password reset link sent to your email.' });
//   } catch (err) {
//     console.error('❌ Forgot password error:', err.message);
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// });

// // Reset Password
// router.post('/reset-password', async (req, res) => {
//   const { token, newPassword } = req.body;

//   try {
//     const user = await User.findOne({
//       resetPasswordToken: token,
//       resetPasswordExpires: { $gt: Date.now() }
//     });

//     if (!user) return res.status(400).json({ message: 'Invalid or expired token.' });

//     const hashed = await bcrypt.hash(newPassword, 10);
//     user.password = hashed;
//     user.resetPasswordToken = undefined;
//     user.resetPasswordExpires = undefined;
//     await user.save();

//     res.status(200).json({ message: 'Password reset successful. Please log in.' });
//   } catch (err) {
//     console.error('❌ Reset password error:', err.message);
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// });


//------------------------------------------------










export default router;
