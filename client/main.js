// main.js — UI wiring: tools, drawing, streaming, preview, theme, download, intro

import {
  canvas, getCanvasPos, drawStroke, drawShape, drawText,
  snapshotCanvas, restoreSnapshot, clearCanvas, toPNG
} from "./canvas.js";
import { socket } from "./websocket.js";

// ===== UI elements =====
const toolEl = document.getElementById("tool");
const colorEl = document.getElementById("colorPicker");
const widthEl = document.getElementById("strokeWidth");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const clearBtn = document.getElementById("clearBtn");
const downloadBtn = document.getElementById("downloadBtn");
const themeBtn = document.getElementById("themeBtn");

// Intro overlay
const intro = document.getElementById("introOverlay");
const startBtn = document.getElementById("startBtn");
if (startBtn) {
  startBtn.addEventListener("click", () => {
    intro.style.display = "none";
  });
}

// ===== Theme toggle (persisted) =====
const root = document.documentElement;
const savedTheme = localStorage.getItem("flamboard_theme");
if (savedTheme) root.setAttribute("data-theme", savedTheme);
themeBtn?.addEventListener("click", () => {
  const cur = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", cur);
  localStorage.setItem("flamboard_theme", cur);
  themeBtn.textContent = cur === "dark" ? "☀️ Light" : "🌙 Dark";
});
themeBtn && (themeBtn.textContent =
  (root.getAttribute("data-theme") === "dark") ? "☀️ Light" : "🌙 Dark");

// ===== Drawing state =====
let drawing = false;
let points = [];
let startPoint = null;
let lastSendT = 0;

// stream segments while moving (every ~16ms)
function maybeStreamSegment() {
  const now = performance.now();
  if (points.length >= 2 && now - lastSendT > 16) {
    lastSendT = now;
    const seg = points.slice(-2); // last 2 points as a mini-segment
    socket.emit("op:commit", {
      tool: toolEl.value,
      color: colorEl.value,
      width: Number(widthEl.value),
      points: seg
    });
  }
}

// ===== Pointer handlers (mouse + touch) =====
function onDown(e) {
  e.preventDefault();
  drawing = true;
  const p = getCanvasPos(e);
  startPoint = p;
  points = [p];

  // for shape preview, snapshot background
  if (toolEl.value === "rect" || toolEl.value === "circle") {
    snapshotCanvas();
  }
}
function onMove(e) {
  const p = getCanvasPos(e);

  // broadcast cursor to others in page coords (not canvas coords) for convenience
  socket.emit("cursor", { x: (e.touches ? e.touches[0].clientX : e.clientX), y: (e.touches ? e.touches[0].clientY : e.clientY) });

  if (!drawing) return;

  const tool = toolEl.value;
  if (tool === "brush" || tool === "eraser") {
    points.push(p);
    // render locally for immediate feedback
    drawStroke(points.slice(-2), colorEl.value, Number(widthEl.value), tool);
    // stream small segments in real time
    maybeStreamSegment();
  } else if (tool === "rect" || tool === "circle") {
    // live preview: restore snapshot then draw current preview
    restoreSnapshot();
    drawShape(startPoint, p, colorEl.value, Number(widthEl.value), tool);
  }
}
function onUp(e) {
  if (!drawing) return;
  drawing = false;

  const tool = toolEl.value;
  const color = colorEl.value;
  const width = Number(widthEl.value);

  if (tool === "brush" || tool === "eraser") {
    if (points.length >= 2) {
      // final commit with the whole path (for history correctness)
      socket.emit("op:commit", { tool, color, width, points });
    }
  } else if (tool === "rect" || tool === "circle") {
    const end = getCanvasPos(e.type.startsWith("touch") ? { touches: e.changedTouches } : e);
    // ensure final state drawn locally (already previewed)
    drawShape(startPoint, end, color, width, tool);
    socket.emit("op:commit", { tool, color, width, start: startPoint, end });
  } else if (tool === "text") {
    const where = getCanvasPos(e);
    const text = prompt("Enter text");
    if (text && text.trim().length) {
      const size = Math.max(14, Number(width) * 6); // simple text sizing
      drawText({ text, x: where.x, y: where.y, color, size });
      socket.emit("op:commit", { tool: "text", text, x: where.x, y: where.y, color, size });
    }
  }

  points = [];
  startPoint = null;
}

// Attach listeners
["mousedown", "touchstart"].forEach((ev) => canvas.addEventListener(ev, onDown, { passive: false }));
["mousemove", "touchmove"].forEach((ev) => canvas.addEventListener(ev, onMove, { passive: false }));
["mouseup", "mouseleave", "touchend", "touchcancel"].forEach((ev) => canvas.addEventListener(ev, onUp, { passive: false }));

// ===== Buttons: undo/redo/clear/download =====
undoBtn?.addEventListener("click", () => socket.emit("op:undo"));
redoBtn?.addEventListener("click", () => socket.emit("op:redo"));
clearBtn?.addEventListener("click", () => {
  if (confirm("Clear the entire canvas for everyone?")) socket.emit("canvas:clear");
});
downloadBtn?.addEventListener("click", () => {
  const url = toPNG();
  const a = document.createElement("a");
  a.href = url;
  a.download = `flamboard-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
});
