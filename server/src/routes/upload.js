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

// GET /api/upload/sign — returns a signed upload params for direct browser upload
router.get('/sign', (req, res) => {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = 'fitbud-avatars';
  const eager = 'c_fill,w_400,h_400,g_face,q_auto,f_auto';

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder, eager, transformation: eager },
    process.env.CLOUDINARY_API_SECRET
  );

  res.json({
    signature,
    timestamp,
    folder,
    eager,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
  });
});

module.exports = router;
