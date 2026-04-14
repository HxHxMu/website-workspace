const { execSync, spawn } = require("child_process");
const path = require("path");

function run(command, cwd) {
  execSync(command, { cwd, stdio: "inherit" });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const visualRoot = __dirname;
  const projectRoot = path.resolve(__dirname, "../../projects/portfolio-site");
  const baseUrl = "http://127.0.0.1:8080";

  const server = spawn("python3", ["-m", "http.server", "8080", "-d", "./src"], {
    cwd: projectRoot,
    stdio: "ignore"
  });

  try {
    await wait(1200);
    run(`VISUAL_LOOP_BASE_URL=${baseUrl} node capture.js`, visualRoot);
    run("node compare.js", visualRoot);
  } finally {
    if (!server.killed) {
      server.kill("SIGTERM");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
