import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Keep the existing test helpers readable while running them on Vitest.
globalThis.jest = vi;
