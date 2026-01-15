import sharp from 'sharp';
import { join } from 'path';

const sizes = [16, 19, 24, 32, 38, 48, 64, 96, 128, 256, 512];
const inputPath = 'public/icons/icon.svg';
const outputDir = 'public/icons';

async function generateIcons() {
  console.log('💎 Generating Full-Stack HD Icons...\n');
  
  for (const size of sizes) {
    const outputPath = join(outputDir, `icon${size}.png`);
    const grayPath = join(outputDir, `icon${size}-gray.png`);
    
    const basePipe = sharp(inputPath, { density: 1200 })
      .resize(size, size, {
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: false
      })
      .sharpen({
        sigma: 0.5,
        m1: 0.5,
        m2: 1.0
      });

    await basePipe.clone()
      .png({ compressionLevel: 9, adaptiveFiltering: false, quality: 100 })
      .toFile(outputPath);

    await basePipe.clone()
      .grayscale()
      .png({ compressionLevel: 9, adaptiveFiltering: false, quality: 100 })
      .toFile(grayPath);
    
    console.log(`✨ [${size}x${size}] → Color & Grayscale versions generated`);
  }
  
  console.log('\n🚀 All icons generated successfully!');
}

generateIcons().catch(console.error);
