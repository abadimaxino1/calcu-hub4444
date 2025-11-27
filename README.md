# Calcu Hub (Prototype)

This is a Vite + React + TypeScript prototype containing multiple calculators (work hours, payroll, EOS, dates) with an in-app TestPanel.

How to run (Windows PowerShell):

```powershell
cd C:\Users\abdul\calcu-hub
npm install
npm run build:css    # optional: compile Tailwind from globals.css to tailwind-output.css
npm run dev
```

Open http://localhost:5173 in your browser.

Notes:
- Tailwind output file `src/styles/tailwind-output.css` is included as a small placeholder for quick preview. For production, run the `build:css` script to generate full Tailwind output.
- The in-app TestPanel is visible in the UI to run basic unit-like checks.
