// websocket.js — socket wiring: init, ops, cursors, presence, status

import { clearCanvas, drawStroke, drawShape, drawText } from "./canvas.js";

const params = new URLSearchParams(location.search);
const room = params.get("room") || "default";
export const socket = io({ query: { room } });

// ===== Connection status UI =====
const statusEl = document.getElementById("status");
function setStatus(msg, emoji = "🟢") {
  if (!statusEl) return;
  statusEl.textContent = `${emoji} ${msg}`;
}
socket.on("connect", () => setStatus("Connected", "🟢"));
socket.io.on("reconnect_attempt", () => setStatus("Reconnecting…", "🟡"));
socket.on("disconnect", () => setStatus("Disconnected", "🔴"));
socket.on("connect_error", () => setStatus("Connection error", "🔴"));

// ===== Presence (online users) =====
const usersUl = document.getElementById("users");

socket.on("user:init", (me) => {
  // could show name somewhere if needed
});

socket.on("presence:update", (users) => {
  if (!usersUl) return;
  usersUl.innerHTML = "";
  users.forEach((u) => {
    const li = document.createElement("li");
    const initials =
      (u.name?.split(" ").map(s => s[0]).join("").slice(0, 2) || "U").toUpperCase();
    li.innerHTML = `
      <span class="avatar" style="background:${u.color}">${initials}</span>
      <span>${u.name || u.id}</span>
    `;
    usersUl.appendChild(li);
  });
});

// ===== Init snapshot & operations =====
// Snapshot contains array of ops (strokes/shapes/text)
socket.on("init", (snapshot) => {
  clearCanvas();
  (snapshot?.ops || []).forEach((op) => renderOp(op));
});

socket.on("op:commit", (op) => renderOp(op));

socket.on("canvas:clear", () => clearCanvas());

function renderOp(op) {
  if (!op) return;
  if (op.tool === "brush" || op.tool === "eraser") {
    drawStroke(op.points, op.color, op.width, op.tool);
  } else if (op.tool === "rect" || op.tool === "circle") {
    drawShape(op.start, op.end, op.color, op.width, op.tool);
  } else if (op.tool === "text") {
    drawText(op);
  }
}

// ===== Live cursors with name bubble =====
const cursors = new Map();

function getCursorEl(id, color, name) {
  let el = cursors.get(id);
  if (!el) {
    el = document.createElement("div");
    el.className = "cursor";
    el.style.border = `1px solid ${color || "#0ea5e9"}`;
    el.style.boxShadow = `0 0 8px ${color || "#0ea5e9"}`;
    el.textContent = name || "Guest";
    document.body.appendChild(el);
    cursors.set(id, el);
  } else {
    el.textContent = name || el.textContent;
  }
  el.style.color = "#fff";
  return el;
}

socket.on("cursor", ({ id, color, name, x, y }) => {
  const el = getCursorEl(id, color, name);
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
});
