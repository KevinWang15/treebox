import "./App.css";
import React from "react";
import TreeBox from "./treemap/TreeBox";
import { genData } from "./data/data";

class App extends React.Component {
  componentDidMount() {}

  render() {
    const pixelRatio = 2;

    return (
      <div
        style={{
          width: "100%",
          height: 600,
          position: "absolute",
          boxSizing: "border-box",
          top: "50%",
          transform: "translateY(-50%)",
          padding: 50,
          // background: "#CCC",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
          }}
          ref={(domElement) => {
            if (!domElement) {
              return;
            }
            const treebox = new TreeBox({
              pixelRatio,
              data: genData(),
              domElement,
              eventHandler: console.log,
            });

            window.treebox = treebox;

            window.addEventListener("resize", () => {
              treebox.repaint();
            });
            document.addEventListener("keydown", (e) => {
              if (e.key === "Escape") {
                treebox.zoomOut();
              }
            });
          }}
        />
      </div>
    );
  }
}

export default App;
