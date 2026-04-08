const { execSync } = require("child_process");

function run(command, cwd) {
  execSync(command, { cwd, stdio: "inherit" });
}

function main() {
  const visualRoot = __dirname;
  run("node capture.js", visualRoot);
  run("node compare.js", visualRoot);
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
