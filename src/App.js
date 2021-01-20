import "./App.css";
import React from "react";
import TreeBox from "./treemap/TreeBox";
import { genData } from "./data/data";

class App extends React.Component {
  componentDidMount() {}

  render() {
    const pixelRatio = 2;

    return (
      <canvas
        width={window.innerWidth * pixelRatio}
        height={window.innerHeight * pixelRatio}
        ref={(canvasRef) => {
          if (!canvasRef) {
            return;
          }
          const treebox = new TreeBox({
            pixelRatio,
            data: genData(),
            domElement: canvasRef,
            eventHandler: console.log,
          });

          window.treebox = treebox;

          window.addEventListener("resize", () => {
            canvasRef.width = window.innerWidth * pixelRatio;
            canvasRef.height = window.innerHeight * pixelRatio;
            treebox.repaint();
          });
          document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
              treebox.zoomOut();
            }
          });
        }}
      />
    );
  }
}

export default App;
