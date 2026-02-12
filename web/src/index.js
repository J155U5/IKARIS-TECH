// web/src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

import { globalLoading } from "./loading/globalLoading";

// ✅ 1) Fijar tema ANTES del primer paint (evita flash)
// Si tú guardas el tema con otra key, cámbiala aquí.
const savedTheme = localStorage.getItem("theme") || "dark"; // "light" | "dark"
document.documentElement.setAttribute("data-theme", savedTheme);

// ✅ 2) BOOT LOADER: iniciar ANTES de renderizar React (evita “pantalla 1”)
globalLoading.start();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
