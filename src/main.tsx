import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n";
import "./index.css";
import App from "./App";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>,
);
