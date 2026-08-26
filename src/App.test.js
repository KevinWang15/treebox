import { act, fireEvent, render, screen } from "@testing-library/react";
import App from "./App";

const gradient = { addColorStop: jest.fn() };
const canvasContext = {
  beginPath: jest.fn(),
  clearRect: jest.fn(),
  clip: jest.fn(),
  createLinearGradient: jest.fn(() => gradient),
  fillRect: jest.fn(),
  fillText: jest.fn(),
  measureText: jest.fn(() => ({ width: 10 })),
  rect: jest.fn(),
  restore: jest.fn(),
  save: jest.fn(),
};

beforeEach(() => {
  canvasContext.createLinearGradient.mockImplementation(() => gradient);
  canvasContext.measureText.mockImplementation(() => ({ width: 10 }));
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: jest.fn(() => canvasContext),
  });
});

test("renders the interactive demo and safely handles root-level controls", () => {
  const { unmount } = render(<App />);

  expect(
    screen.getByRole("heading", { name: /see the whole tree/i })
  ).toBeInTheDocument();
  const zoomOutButton = screen.getByRole("button", { name: /zoom out/i });
  expect(zoomOutButton).toBeDisabled();
  expect(zoomOutButton).toHaveAttribute("aria-keyshortcuts", "Escape");

  const canvas = screen.getByRole("application", {
    name: /interactive treemap/i,
  });
  expect(canvas).toHaveAttribute("tabindex", "0");

  expect(() => {
    fireEvent.click(canvas, { clientX: 0, clientY: 0 });
    fireEvent.keyDown(canvas, { key: "Escape" });
  }).not.toThrow();

  act(() => {
    window.treebox.emitEvent("zoom", {
      node: { text: "Selected group" },
      canZoomOut: true,
    });
  });
  expect(zoomOutButton).toBeEnabled();
  expect(
    screen.getByRole("heading", { name: "Selected group" })
  ).toBeInTheDocument();

  unmount();
  expect(document.querySelector("canvas")).not.toBeInTheDocument();
});
