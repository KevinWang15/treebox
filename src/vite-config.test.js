import { createViteConfig } from "../vite.config.mjs";

test("uses a configurable base path for hosted demos", () => {
  const previousBasePath = process.env.BASE_PATH;
  process.env.BASE_PATH = "/treebox/";

  try {
    expect(createViteConfig({ mode: "production" }).base).toBe("/treebox/");
  } finally {
    if (previousBasePath === undefined) {
      delete process.env.BASE_PATH;
    } else {
      process.env.BASE_PATH = previousBasePath;
    }
  }
});

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
