// ✅ ESM import for fs
import * as fs from "fs";

export class DrawingState {
  constructor() {
    this.ops = [];
    this.redo = [];
    this.users = new Map();
  }

  addUser(socketId, user) {
    this.users.set(socketId, user);
  }

  removeUser(socketId) {
    this.users.delete(socketId);
  }

  listUsers() {
    return [...this.users.entries()].map(([id, u]) => ({ id, ...u }));
  }

  applyOp(op) {
    this.ops.push(op);
    this.redo = [];
  }

  undo() {
    if (this.ops.length === 0) return null;
    const op = this.ops.pop();
    this.redo.push(op);
    return op;
  }

  redoOne() {
    if (this.redo.length === 0) return null;
    const op = this.redo.pop();
    this.ops.push(op);
    return op;
  }

  clear() {
    this.ops = [];
    this.redo = [];
  }

  snapshot() {
    return { ops: this.ops, users: this.listUsers() };
  }

  // ✅ Add persistence methods (works with ESM)
  saveToFile() {
    try {
      fs.writeFileSync(
        "canvas_backup.json",
        JSON.stringify(this.ops, null, 2),
        "utf8"
      );
      console.log("💾 Canvas saved to canvas_backup.json");
    } catch (err) {
      console.error("❌ Error saving canvas:", err);
    }
  }

  loadFromFile() {
    try {
      if (fs.existsSync("canvas_backup.json")) {
        const data = fs.readFileSync("canvas_backup.json", "utf8");
        this.ops = JSON.parse(data);
        console.log("✅ Canvas loaded from canvas_backup.json");
      }
    } catch (err) {
      console.error("❌ Error loading canvas:", err);
    }
  }
}
