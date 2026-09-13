const { task } = require("gulp");
const { spawnSync } = require("child_process");
const path = require("path");

task("compile", (done) => {
  const projectRoot = path.resolve(__dirname, "..");
  const result = spawnSync(process.execPath, ["tools/build.mjs"], {
    cwd: projectRoot,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    done(new Error("LayaAir source build failed"));
    return;
  }
  done();
});
