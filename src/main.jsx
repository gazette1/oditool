import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// v1.6.12 · Pattern F · install retry + fallback provider chain at boot.
// Idempotent · safe to call from anywhere · activates only when
// VITE_OPENROUTER_API_KEY or VITE_OPENAI_API_KEY are set in .env.local.
import { installFallbackChain } from "./lib/providers";
installFallbackChain();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
