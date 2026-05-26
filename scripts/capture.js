const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const FRAMES_DIR = path.join(__dirname, '../frames');
const SVG_PATH = path.join(__dirname, '../images/terminal.svg');

// Duración total de la animación en ms (27s de animación + 3s al final)
const ANIM_DURATION_MS = 30000;
// FPS del GIF final
const FPS = 20;
const FRAME_INTERVAL_MS = 1000 / FPS;
const TOTAL_FRAMES = Math.ceil(ANIM_DURATION_MS / FRAME_INTERVAL_MS);

async function main() {
  if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });

  // Limpiar frames anteriores
  fs.readdirSync(FRAMES_DIR).forEach(f => {
    if (f.endsWith('.png')) fs.unlinkSync(path.join(FRAMES_DIR, f));
  });

  const svgContent = fs.readFileSync(SVG_PATH, 'utf8');

  // HTML wrapper que muestra el SVG con fondo y tamaño fijo
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 800px;
    background: transparent;
    overflow: hidden;
  }
  .wrap {
    width: 800px;
    padding: 10px;
    background: #181825;
  }
</style>
</head>
<body>
<div class="wrap">
${svgContent}
</div>
</body>
</html>`;

  const htmlPath = path.join(__dirname, '../frames/_preview.html');
  fs.writeFileSync(htmlPath, html);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--window-size=820,870',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 820, height: 870, deviceScaleFactor: 1 });
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

  // Esperar a que las fuentes carguen
  await page.waitForTimeout(1500);

  console.log(`Capturando ${TOTAL_FRAMES} frames a ${FPS}fps...`);

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const frameNum = String(i).padStart(4, '0');
    await page.screenshot({
      path: path.join(FRAMES_DIR, `frame_${frameNum}.png`),
      clip: { x: 0, y: 0, width: 820, height: 856 },
      omitBackground: false,
    });

    if (i % 20 === 0) console.log(`  Frame ${i}/${TOTAL_FRAMES}`);

    // Avanzar el tiempo de la animación
    await page.evaluate((ms) => {
      document.getAnimations().forEach(a => {
        a.currentTime = ms;
      });
    }, (i + 1) * FRAME_INTERVAL_MS);

    await page.waitForTimeout(50);
  }

  await browser.close();
  console.log(`✓ ${TOTAL_FRAMES} frames capturados en ./frames/`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
