import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputDir = 'images';
const outputDir = 'images/screenshot';
const images = ['copy_button.png', 'expect.png', 'popup.png'];

async function processImages() {
  for (const img of images) {
    const inputPath = path.join(inputDir, img);
    const outputPath = path.join(outputDir, img);

    console.log(`Processing ${img}...`);

    await sharp(inputPath)
      .resize({
        width: 1280,
        height: 800,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 1 },
        position: 'center'
      })
      .png({ quality: 100 })
      .toFile(outputPath);

    console.log(`Saved to ${outputPath}`);
  }
}

processImages().catch(err => {
  console.error(err);
  process.exit(1);
});
