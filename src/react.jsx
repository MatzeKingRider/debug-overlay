import { useEffect, useRef } from "react";
import DebugOverlay from "./debug-overlay.js";

export default function DebugOverlayComponent({ project, apiUrl, apiKey }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    DebugOverlay.init({
      project,
      endpoint: `${apiUrl}/debug/notes`,
      apiKey,
    });
    return () => DebugOverlay.destroy();
  }, [project, apiUrl, apiKey]);

  return null;
}
