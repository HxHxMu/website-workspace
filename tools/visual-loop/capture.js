const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

async function main() {
  const projectRoot = path.resolve(__dirname, "../../projects/portfolio-site");
  const configPath = path.join(projectRoot, "visual-tests", "config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: config.viewport
  });

  const url = `http://127.0.0.1:8000/${config.page}`;
  await page.goto(url, { waitUntil: "networkidle" });

  const outputPath = path.resolve(__dirname, "output/current/current.png");
  await page.screenshot({ path: outputPath, fullPage: true });

  await browser.close();
  console.log(`Captured screenshot: ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
