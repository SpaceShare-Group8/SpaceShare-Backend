/**
 
 * Setup:
 *   npm install cloudinary dotenv
 *
 * Usage:
 *   node scripts/test-cloudinary-upload.js ./path/to/test-image.jpg
 */


import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const imagePath = process.argv[2];

if (!imagePath) {
  console.error('Usage: node scripts/test-cloudinary-upload.js <path-to-image>');
  process.exit(1);
}

try {
  const result = await cloudinary.uploader.upload(imagePath, { folder: 'spaceshare/test' });
  console.log('Upload succeeded.');
  console.log('URL:', result.secure_url);
  console.log('public_id:', result.public_id);
} catch (err) {
  console.error('Upload failed:', err.message);
  process.exit(1);
}