import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";

registerSW({ immediate: true });

const secretPath = import.meta.env.VITE_SECRET_PATH ?? "espace-bartoli-xxxxx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={`/${secretPath}`}>
      <App />
    </BrowserRouter>
  </StrictMode>
);
