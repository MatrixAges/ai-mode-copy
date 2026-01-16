import sharp from 'sharp';
import path from 'path';

const inputImage = 'images/copy_button.png';
const outputDir = 'images/screenshot';

const promoConfigs = [
  {
    name: 'small_promo.png',
    width: 440,
    height: 280,
  },
  {
    name: 'marquee_promo.png',
    width: 1400,
    height: 560,
  }
];

async function generatePromos() {
  for (const config of promoConfigs) {
    const outputPath = path.join(outputDir, config.name);
    console.log(`Generating ${config.name} (${config.width}x${config.height})...`);

    await sharp(inputImage)
      .resize({
        width: config.width,
        height: config.height,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 1 },
        position: 'center'
      })
      .flatten({ background: { r: 0, g: 0, b: 0 } }) // Ensure no alpha channel
      .png({ quality: 100 })
      .toFile(outputPath);

    console.log(`Saved to ${outputPath}`);
  }
}

generatePromos().catch(err => {
  console.error(err);
  process.exit(1);
});
