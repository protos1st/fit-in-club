const express = require('express');
const { v2: cloudinary } = require('cloudinary');
const { authMiddleware } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// GET /api/upload/sign
router.get('/sign', (req, res) => {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = 'fitbud-avatars';

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET
  );

  res.json({
    signature,
    timestamp,
    folder,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
  });
});

module.exports = router;
