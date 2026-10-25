import {registerRoomsListeners} from './views/rooms.js';
import {registerRoomListeners} from './views/room.js';
import {registerRoomOptionsListeners} from './views/roomOptions.js';




export function registerMainRealtimeListeners(){
   registerRoomListeners();
   registerRoomsListeners();
   registerRoomOptionsListeners();
}


