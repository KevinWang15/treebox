import "./App.css";
import React from "react";
import TreeBox from "./treemap/TreeBox";
import { genData } from "./data/data";

class App extends React.Component {
  state = {
    activeLabel: "Top level",
    canZoomOut: false,
    hoveredLabel: null,
  };

  chartElement = null;
  treebox = null;
  pixelRatioMediaQuery = null;

  componentDidMount() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    this.treebox = new TreeBox({
      pixelRatio,
      data: genData(),
      domElement: this.chartElement,
      eventHandler: this.handleTreeBoxEvent,
    });
    window.treebox = this.treebox;
    window.addEventListener("resize", this.handleResize);
    this.watchPixelRatio();
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.handleResize);
    this.unwatchPixelRatio();
    if (this.treebox) {
      this.treebox.destroy();
    }
    if (window.treebox === this.treebox) {
      delete window.treebox;
    }
    this.treebox = null;
  }

  handleTreeBoxEvent = (type, payload) => {
    if (type === "hover") {
      this.setState({ hoveredLabel: payload ? payload.text : null });
    }
    if (type === "zoom") {
      this.setState({
        activeLabel: payload.node.text || "Top level",
        canZoomOut: payload.canZoomOut,
        hoveredLabel: null,
      });
    }
  };

  handleResize = () => {
    if (this.treebox) {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      if (!this.treebox.setPixelRatio(pixelRatio)) {
        this.treebox.repaint();
      }
    }
  };

  handlePixelRatioChange = () => {
    this.handleResize();
    this.watchPixelRatio();
  };

  watchPixelRatio = () => {
    this.unwatchPixelRatio();
    if (typeof window.matchMedia !== "function") {
      return;
    }

    this.pixelRatioMediaQuery = window.matchMedia(
      `(resolution: ${window.devicePixelRatio || 1}dppx)`
    );
    if (typeof this.pixelRatioMediaQuery.addEventListener === "function") {
      this.pixelRatioMediaQuery.addEventListener(
        "change",
        this.handlePixelRatioChange
      );
    } else if (typeof this.pixelRatioMediaQuery.addListener === "function") {
      this.pixelRatioMediaQuery.addListener(this.handlePixelRatioChange);
    }
  };

  unwatchPixelRatio = () => {
    if (!this.pixelRatioMediaQuery) {
      return;
    }
    if (typeof this.pixelRatioMediaQuery.removeEventListener === "function") {
      this.pixelRatioMediaQuery.removeEventListener(
        "change",
        this.handlePixelRatioChange
      );
    } else if (typeof this.pixelRatioMediaQuery.removeListener === "function") {
      this.pixelRatioMediaQuery.removeListener(this.handlePixelRatioChange);
    }
    this.pixelRatioMediaQuery = null;
  };

  handleZoomOut = () => {
    if (this.treebox) {
      this.treebox.zoomOut();
      this.treebox.canvasElement.focus({ preventScroll: true });
    }
  };

  handleZoomOutKeyDown = (event) => {
    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    if (!event.repeat) {
      this.handleZoomOut();
    }
  };

  render() {
    const { activeLabel, canZoomOut, hoveredLabel } = this.state;

    return (
      <div className="app-shell">
        <header className="hero">
          <p className="eyebrow">Interactive canvas treemap</p>
          <h1>See the whole tree.</h1>
          <p className="hero-copy">
            Treebox turns weighted, hierarchical data into a fast, explorable
            map. Pick a group to move in, or drag across any region for a closer
            look.
          </p>
        </header>

        <main>
          <section className="chart-card" aria-labelledby="chart-title">
            <div className="chart-toolbar">
              <div className="chart-heading">
                <p className="chart-kicker">Current view</p>
                <h2 id="chart-title" aria-live="polite" aria-atomic="true">
                  {activeLabel}
                </h2>
              </div>
              <div className="chart-actions">
                <p
                  className="hover-status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {hoveredLabel
                    ? `Exploring ${hoveredLabel}`
                    : "Ready to explore"}
                </p>
                <button
                  type="button"
                  disabled={!canZoomOut}
                  aria-keyshortcuts="Escape"
                  onClick={this.handleZoomOut}
                  onKeyDown={this.handleZoomOutKeyDown}
                >
                  Zoom out <kbd>Esc</kbd>
                </button>
              </div>
            </div>

            <div
              className="chart-viewport"
              ref={(element) => {
                this.chartElement = element;
              }}
            />
          </section>

          <section className="interaction-guide" aria-label="How to explore">
            <div>
              <span>01</span>
              <h3>Open a group</h3>
              <p>Tap or click a colored block to reveal the next level.</p>
            </div>
            <div>
              <span>02</span>
              <h3>Frame a detail</h3>
              <p>Drag a rectangle over any area to magnify it.</p>
            </div>
            <div>
              <span>03</span>
              <h3>Retrace your path</h3>
              <p>Scroll down or press Escape to step back out.</p>
            </div>
          </section>
        </main>
      </div>
    );
  }
}

export default App;
