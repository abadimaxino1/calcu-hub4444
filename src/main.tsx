import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./tailwind.css";

// Initialize i18n before rendering
import './i18n';

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker and notify the app when an update is available.
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // prefer generated Workbox SW at /sw.js (production), fall back to /service-worker.js
      const candidates = ['/sw.js', '/service-worker.js'];
      for (const c of candidates) {
        try {
          const reg = await navigator.serviceWorker.register(c);
          // Listen for updates
          reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed') {
                // If there is a waiting worker, notify the app
                if (reg.waiting) {
                  window.dispatchEvent(new CustomEvent('swUpdated', { detail: { registration: reg } }));
                }
              }
            });
          });

          // also detect if a new SW is already waiting (e.g., after a refresh)
          if (reg.waiting) {
            window.dispatchEvent(new CustomEvent('swUpdated', { detail: { registration: reg } }));
          }

          return;
        } catch (e) {
          // try next candidate
        }
      }
    } catch (e) {
      // ignore registration errors
    }
  });
}
