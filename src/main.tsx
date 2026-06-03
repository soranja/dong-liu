import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import "./styles/wave.css";

import { DongLiuShell } from "./DongLiuShell.tsx";

history.scrollRestoration = "manual";
window.scrollTo({ top: 0 });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DongLiuShell />
  </StrictMode>,
);
