import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { Rooms } from "./rooms.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const rooms = new Rooms();

app.use(express.static(path.join(__dirname, "../client")));
const PORT = process.env.PORT || 3000;

// ✅ Random Indian-style names (with Shaik Asim & Mohammad Reeha included)
function randomName() {
  const specialNames = ["Shaik Asim", "Mohammad Reeha"]; // 👈 your names first!

  const firstNames = [
    "Aarav", "Vivaan", "Aditya", "Rohan", "Rahul", "Arjun", "Karthik", "Ishaan",
    "Kabir", "Dev", "Neel", "Sahil", "Rudra", "Ayaan", "Aniket",
    "Priya", "Diya", "Ananya", "Isha", "Kavya", "Meera", "Nisha", "Riya",
    "Aditi", "Sneha", "Tanya", "Pooja", "Sanya", "Simran", "Shreya"
  ];

  const lastNames = [
    "Sharma", "Patel", "Reddy", "Iyer", "Gupta", "Nair", "Kumar",
    "Verma", "Mehta", "Das", "Singh", "Pillai", "Chopra", "Yadav",
    "Menon", "Joshi", "Naidu", "Bose", "Shetty", "Bhat"
  ];

  // Occasionally return one of your names (30% chance)
  if (Math.random() < 0.3) {
    return specialNames[Math.floor(Math.random() * specialNames.length)];
  }

  // Otherwise return a random Indian name
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${first} ${last}`;
}


const colorList = ["#ef4444", "#22c55e", "#3b82f6", "#eab308", "#a855f7"];

io.on("connection", (socket) => {
  const room = rooms.get("default");


  // Assign user identity
  const user = {
    id: socket.id,
    name: randomName(),
    color: colorList[Math.floor(Math.random() * colorList.length)],
  };

  room.addUser(socket.id, { name: user.name, color: user.color });

  // Send personal info back
  socket.emit("user:init", user);

  // Send everyone an updated user list
  io.emit("presence:update", room.listUsers());

  // Drawing event
  socket.on("op:commit", (op) => {
    op.userId = socket.id;
    room.applyOp(op);
    socket.broadcast.emit("op:commit", op);
  });

  // Undo/Redo/Clear
  socket.on("op:undo", () => {
    room.undo();
    io.emit("init", room.snapshot());
  });

  socket.on("op:redo", () => {
    room.redoOne();
    io.emit("init", room.snapshot());
  });

  socket.on("canvas:clear", () => {
    room.clear();
    io.emit("canvas:clear");
  });

  // Cursor
  socket.on("cursor", (pos) => {
    io.emit("cursor", {
      id: socket.id,
      name: user.name,
      color: user.color,
      x: pos.x,
      y: pos.y,
    });
  });

  // When user disconnects
  socket.on("disconnect", () => {
    room.removeUser(socket.id);
    io.emit("presence:update", room.listUsers());
    console.log(`❌ ${user.name} left`);
  });

  console.log(`✅ ${user.name} joined`);
});

server.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
