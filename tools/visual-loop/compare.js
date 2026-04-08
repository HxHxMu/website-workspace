const fs = require("fs");
const path = require("path");
const pixelmatch = require("pixelmatch");
const { PNG } = require("pngjs");

function main() {
    const referencePath = path.resolve(__dirname, "output/reference/reference.png");
    const currentPath = path.resolve(__dirname, "output/current/current.png");
    const diffPath = path.resolve(__dirname, "output/diff/diff.png");
    const reportPath = path.resolve(__dirname, "output/reports/latest-report.md");

    if (!fs.existsSync(referencePath)) {
        throw new Error(`Missing reference image: ${referencePath}`);
    }

    if (!fs.existsSync(currentPath)) {
        throw new Error(`Missing current image: ${currentPath}`);
    }

    const reference = PNG.sync.read(fs.readFileSync(referencePath));
    const current = PNG.sync.read(fs.readFileSync(currentPath));

    const width = Math.min(reference.width, current.width);
    const height = Math.min(reference.height, current.height);

    const refCrop = new PNG({ width, height });
    const curCrop = new PNG({ width, height });

    PNG.bitblt(reference, refCrop, 0, 0, width, height, 0, 0);
    PNG.bitblt(current, curCrop, 0, 0, width, height, 0, 0);

    const diff = new PNG({ width, height });

    const mismatchedPixels = pixelmatch(
        refCrop.data,
        curCrop.data,
        diff.data,
        width,
        height,
        { threshold: 0.1 }
    );

    fs.writeFileSync(diffPath, PNG.sync.write(diff));

    const totalPixels = width * height;
    const mismatchRatio = mismatchedPixels / totalPixels;
    const similarity = 1 - mismatchRatio;

    const major = [];
    const medium = [];
    const minor = [];

    if (similarity < 0.75) {
        major.push("Large visual mismatch. Layout and spacing likely differ significantly.");
    } else if (similarity < 0.88) {
        medium.push("Moderate visual mismatch. Typography, spacing, or card treatment likely differ.");
    } else {
        minor.push("Mostly close. Remaining differences are likely polish and spacing details.");
    }

    const report = `# Visual Comparison Report

## Similarity
${(similarity * 100).toFixed(2)}%

## Mismatch Ratio
${(mismatchRatio * 100).toFixed(2)}%

## Major
${major.length ? major.map((x) => `- ${x}`).join("\n") : "- None"}

## Medium
${medium.length ? medium.map((x) => `- ${x}`).join("\n") : "- None"}

## Minor
${minor.length ? minor.map((x) => `- ${x}`).join("\n") : "- None"}

## Files
- Reference: tools/visual-loop/output/reference/reference.png
- Current: tools/visual-loop/output/current/current.png
- Diff: tools/visual-loop/output/diff/diff.png
`;

    fs.writeFileSync(reportPath, report);
    console.log(report);
}

try {
    main();
} catch (err) {
    console.error(err);
    process.exit(1);
}