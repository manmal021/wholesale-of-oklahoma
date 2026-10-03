import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function optimizeImages() {
  console.log('🚀 Starting safe image optimization...');
  let totalBefore = 0;
  let totalAfter = 0;

  // 1. Mango avatar
  const avatarPath = path.resolve('public/mango-avatar.jpg');
  if (fs.existsSync(avatarPath)) {
    const inputBuf = fs.readFileSync(avatarPath);
    const beforeSize = inputBuf.length;
    totalBefore += beforeSize;
    const buffer = await sharp(inputBuf)
      .resize(256, 256, { fit: 'cover' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    fs.writeFileSync(avatarPath, buffer);
    const afterSize = buffer.length;
    totalAfter += afterSize;
    console.log(`mango-avatar.jpg: ${(beforeSize / 1024).toFixed(1)} KB -> ${(afterSize / 1024).toFixed(1)} KB (-${(((beforeSize - afterSize) / beforeSize) * 100).toFixed(0)}%)`);
  }

  // 2. Products
  const productsDir = path.resolve('public/products');
  if (fs.existsSync(productsDir)) {
    const files = fs.readdirSync(productsDir);
    for (const file of files) {
      const filePath = path.join(productsDir, file);
      if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
      const inputBuf = fs.readFileSync(filePath);
      const beforeSize = inputBuf.length;
      totalBefore += beforeSize;

      const isPng = /\.png$/i.test(file);
      const isJpg = /\.jpe?g$/i.test(file);

      let pipeline = sharp(inputBuf).resize({ width: 500, withoutEnlargement: true });
      if (isPng) {
        pipeline = pipeline.png({ compressionLevel: 9, quality: 85, effort: 7 });
      } else if (isJpg) {
        pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
      }

      const buffer = await pipeline.toBuffer();
      // Only replace if smaller
      if (buffer.length < beforeSize) {
        fs.writeFileSync(filePath, buffer);
        totalAfter += buffer.length;
        console.log(`[product] ${file}: ${(beforeSize / 1024).toFixed(1)} KB -> ${(buffer.length / 1024).toFixed(1)} KB (-${(((beforeSize - buffer.length) / beforeSize) * 100).toFixed(0)}%)`);
      } else {
        totalAfter += beforeSize;
      }
    }
  }

  // 3. Gallery
  const galleryDir = path.resolve('public/gallery');
  const thumbsDir = path.resolve('public/gallery/thumbs');
  if (!fs.existsSync(thumbsDir)) {
    fs.mkdirSync(thumbsDir, { recursive: true });
  }

  if (fs.existsSync(galleryDir)) {
    const files = fs.readdirSync(galleryDir);
    for (const file of files) {
      const filePath = path.join(galleryDir, file);
      if (!/\.(png|jpe?g)$/i.test(file) || fs.statSync(filePath).isDirectory()) continue;
      const inputBuf = fs.readFileSync(filePath);
      const beforeSize = inputBuf.length;
      totalBefore += beforeSize;

      const isPng = /\.png$/i.test(file);
      const isJpg = /\.jpe?g$/i.test(file);

      // Main image: max width 1280px
      let pipeline = sharp(inputBuf).resize({ width: 1280, withoutEnlargement: true });
      if (isPng) {
        pipeline = pipeline.png({ compressionLevel: 9, quality: 85 });
      } else if (isJpg) {
        pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
      }
      const mainBuffer = await pipeline.toBuffer();
      fs.writeFileSync(filePath, mainBuffer);
      totalAfter += mainBuffer.length;

      // Thumbnail: max width 160px for bottom carousel strip
      const thumbPath = path.join(thumbsDir, file);
      let thumbPipeline = sharp(inputBuf).resize({ width: 160, height: 112, fit: 'cover' });
      if (isPng) {
        thumbPipeline = thumbPipeline.png({ compressionLevel: 9 });
      } else if (isJpg) {
        thumbPipeline = thumbPipeline.jpeg({ quality: 75, mozjpeg: true });
      }
      const thumbBuffer = await thumbPipeline.toBuffer();
      fs.writeFileSync(thumbPath, thumbBuffer);

      console.log(`[gallery] ${file}: ${(beforeSize / 1024).toFixed(1)} KB -> ${(mainBuffer.length / 1024).toFixed(1)} KB (thumb: ${(thumbBuffer.length / 1024).toFixed(1)} KB)`);
    }
  }

  console.log('----------------------------------------------------');
  console.log(`Total Before: ${(totalBefore / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total After : ${(totalAfter / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Saved       : ${((totalBefore - totalAfter) / 1024 / 1024).toFixed(2)} MB (-${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1)}%)`);
}

optimizeImages().catch((err) => {
  console.error('Image optimization failed:', err);
  process.exit(1);
});
