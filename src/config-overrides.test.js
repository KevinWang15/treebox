const override = require("../config-overrides");

test("exports the library default as the direct UMD value", () => {
  const originalBuildTarget = process.env.BUILD_TARGET;
  process.env.BUILD_TARGET = "lib";
  const config = {
    entry: ["original-entry"],
    externals: [],
    optimization: {
      runtimeChunk: {},
      splitChunks: {},
    },
    output: { path: "/tmp/treebox-build" },
    plugins: [],
  };

  try {
    const result = override(config);

    expect(result.output).toEqual({
      path: "/tmp/treebox-build",
      filename: "treebox.js",
      library: "treebox",
      libraryExport: "default",
      libraryTarget: "umd",
    });
  } finally {
    if (originalBuildTarget === undefined) {
      delete process.env.BUILD_TARGET;
    } else {
      process.env.BUILD_TARGET = originalBuildTarget;
    }
  }
});
