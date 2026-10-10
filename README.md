# Rectifier Workbench
Interactive 1-phase / 3-phase diode and thyristor rectifier simulator (schematic + oscilloscope) by Arya Shah, 24EE10038.

**Run locally:** the page loads its scripts over HTTP, so double-clicking `index.html` will not work. From this folder run `python -m http.server` and open http://localhost:8000. On GitHub Pages it works as-is.

**Files:** `js/solver.js` (physics), `js/schematic.jsx`, `js/oscilloscope.jsx`, `js/app.jsx` (UI), `css/styles.css`.

**Model assumptions:** ideal switches and source. L_s overlap (angle and voltage drop) is calculated analytically. Current THD excludes DC.
