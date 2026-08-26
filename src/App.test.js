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
  Object.defineProperty(window, "devicePixelRatio", {
    configurable: true,
    value: 1,
  });
  window.matchMedia = jest.fn((media) => ({
    media,
    matches: true,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
});

test("renders the interactive demo and safely handles root-level controls", () => {
  const { unmount } = render(<App />);

  expect(
    screen.getByRole("heading", { name: /see the whole tree/i })
  ).toBeInTheDocument();
  const currentViewHeading = screen.getByRole("heading", {
    name: "Top level",
  });
  expect(currentViewHeading.parentElement).toHaveClass("chart-heading");
  expect(currentViewHeading).toHaveAttribute("aria-live", "polite");
  expect(currentViewHeading).toHaveAttribute("aria-atomic", "true");
  expect(screen.getByText("Ready to explore")).toHaveAttribute(
    "aria-atomic",
    "true"
  );
  const zoomOutButton = screen.getByRole("button", { name: /zoom out/i });
  expect(zoomOutButton).toBeDisabled();
  expect(zoomOutButton).toHaveAttribute("aria-keyshortcuts", "Escape");

  const canvas = screen.getByRole("application", {
    name: /interactive treemap/i,
  });
  expect(canvas).toHaveAttribute("tabindex", "0");

  const initialPixelRatioQuery = window.matchMedia.mock.results[0].value;
  expect(initialPixelRatioQuery.media).toBe("(resolution: 1dppx)");
  Object.defineProperty(window, "devicePixelRatio", {
    configurable: true,
    value: 2,
  });
  act(() => {
    initialPixelRatioQuery.addEventListener.mock.calls[0][1]();
  });
  expect(window.treebox.pixelRatio).toBe(2);
  expect(Number(window.treebox.canvasElement.style.zoom)).toBe(0.5);
  expect(initialPixelRatioQuery.removeEventListener).toHaveBeenCalledWith(
    "change",
    expect.any(Function)
  );
  expect(window.matchMedia).toHaveBeenLastCalledWith("(resolution: 2dppx)");

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
  expect(
    window.matchMedia.mock.results[1].value.removeEventListener
  ).toHaveBeenCalledWith("change", expect.any(Function));
  expect(document.querySelector("canvas")).not.toBeInTheDocument();
});
