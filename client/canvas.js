// canvas.js — drawing helpers (HiDPI aware), preview snapshot, shapes, text

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let previewImageData = null;

// Fit canvas to CSS size with devicePixelRatio for crisp lines
function fitCanvas() {
  const dpr = window.devicePixelRatio || 1;
  // match CSS size
  const cssWidth = Math.round(window.innerWidth * 0.9);
  const cssHeight = Math.round(window.innerHeight * 0.7);
  canvas.style.width = cssWidth + "px";
  canvas.style.height = cssHeight + "px";
  // set actual buffer
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale drawing space
  clearCanvas();
}
fitCanvas();
window.addEventListener("resize", fitCanvas);

export function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Take a snapshot before previewing a shape so we can restore while dragging
export function snapshotCanvas() {
  previewImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
}
export function restoreSnapshot() {
  if (previewImageData) ctx.putImageData(previewImageData, 0, 0);
}

// Smooth freehand stroke (quadratic curve). If tool === 'eraser', punch out.
export function drawStroke(points, color, width, tool = "brush") {
  if (!points || points.length < 2) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Number(width || 3);
  if (tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = color || "#000";
  }
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }
  // last segment
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
  ctx.restore();
}

// Vector shapes (stroke only)
export function drawShape(start, end, color, width, tool) {
  if (!start || !end) return;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = color || "#000";
  ctx.lineWidth = Number(width || 3);
  ctx.beginPath();
  if (tool === "rect") {
    const w = end.x - start.x;
    const h = end.y - start.y;
    ctx.strokeRect(start.x, start.y, w, h);
  } else if (tool === "circle") {
    const r = Math.hypot(end.x - start.x, end.y - start.y);
    ctx.arc(start.x, start.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// Simple text drawing
export function drawText(obj) {
  const { text, x, y, color = "#000", size = 18 } = obj;
  if (!text) return;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = color;
  ctx.font = `600 ${Number(size)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y);
  ctx.restore();
}

// Convert canvas to PNG data URL
export function toPNG() {
  // Use CSS pixels (ctx already scaled)
  return canvas.toDataURL("image/png");
}

// Map pointer event -> canvas coordinates
export function getCanvasPos(e) {
  const touch = e.touches ? e.touches[0] : null;
  const px = touch ? touch.clientX : e.clientX;
  const py = touch ? touch.clientY : e.clientY;
  const rect = canvas.getBoundingClientRect();
  return { x: px - rect.left, y: py - rect.top };
}

export { canvas, ctx, fitCanvas };
