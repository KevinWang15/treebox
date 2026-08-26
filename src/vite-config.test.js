import { createViteConfig } from "../vite.config.mjs";

test("exports the library default as the direct UMD value", () => {
  const config = createViteConfig({ mode: "library" });

  expect(config.build).toMatchObject({
    emptyOutDir: true,
    lib: {
      fileName: expect.any(Function),
      formats: ["umd"],
      name: "treebox",
    },
    outDir: "build",
    rolldownOptions: {
      output: {
        exports: "default",
      },
    },
    sourcemap: true,
    target: "es2015",
  });
  expect(config.build.lib.fileName()).toBe("treebox.js");
  expect(config.build.lib.entry).toMatch(/src[/\\]libroot\.js$/);
});
