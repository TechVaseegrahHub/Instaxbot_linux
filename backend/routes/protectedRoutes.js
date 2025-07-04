require("dotenv").config();

const path = require('path');
const axios = require('axios');
const express = require('express');
const { json } = express;
const router = express.Router();
const cors = require('cors');
const multer = require('multer');

const jwt = require('jsonwebtoken');

router.use(cors({
  origin: '*' // Replace with your client URL
}));
const SECRET_KEY = process.env.JWT_SECRET_KEY;

function authenticateJWT(req, res, next) {
    const token = req.header('Authorization')?.split(' ')[1]; // Extract token from Authorization header (Bearer token)
  
    if (!token) {
      return res.status(403).json({ message: 'Access denied, token missing' });
    }
  
    jwt.verify(token, SECRET_KEY, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid token' });
      }
  
      req.user = user;  // Attach user data to request object
      next();  // Proceed to the next middleware or route handler
    });
  }

router.get("/protected", authenticateJWT, (req, res) => {
    res.json({ message: "This is a protected route", user: req.user });
  });


  module.exports = router;