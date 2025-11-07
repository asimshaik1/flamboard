import { DrawingState } from './drawing-state.js';

export class Rooms {
  constructor() {
    this.rooms = new Map();
  }

  get(roomId = 'default') {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new DrawingState());
    }
    return this.rooms.get(roomId);
  }
}
