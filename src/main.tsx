import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { polyfill } from "mobile-drag-drop";
import { scrollBehaviourDragImageTranslateOverride } from "mobile-drag-drop/scroll-behaviour";
import "mobile-drag-drop/default.css";

// Enable drag and drop for mobile/Safari
polyfill({
  dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride
});

// Fix for iOS Safari >= 10
try {
  window.addEventListener("touchmove", function() {}, { passive: false });
} catch(e) {
  console.log("Touch events not supported");
}

createRoot(document.getElementById("root")!).render(<App />);
