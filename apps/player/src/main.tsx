import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import "./styles/index.css";
import "./styles/game-feed.css";
import "./styles/card-content.css";
import "./styles/voice-recorder.css";
import "./styles/agreement-card.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter><App /></BrowserRouter>
  </StrictMode>
);
