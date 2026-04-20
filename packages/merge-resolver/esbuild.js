const esbuild = require("esbuild");

const watch = process.argv.includes("--watch");

const ctx = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "out/extension.js",
  external: ["vscode"],
  platform: "node",
  format: "cjs",
  target: "node18",
  sourcemap: true,
  logLevel: "info",
};

(async () => {
  if (watch) {
    const context = await esbuild.context(ctx);
    await context.watch();
  } else {
    await esbuild.build(ctx);
  }
})();
