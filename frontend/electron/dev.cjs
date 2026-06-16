const { spawn } = require("node:child_process");
const electron = require("electron");

const child = spawn(electron, ["."], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PHOENIX_DESKTOP_DEV_URL: process.env.PHOENIX_DESKTOP_DEV_URL || "http://localhost:5173",
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
