import React from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";
import App from "./App";
import "./tailwind.css";

// Initialize Sentry
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || "https://placeholder@sentry.io/123",
    integrations: [new BrowserTracing()],
    tracesSampleRate: 0.1,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_RELEASE_VERSION || "1.0.0",
  });
}

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
