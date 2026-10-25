import {state} from './state.js';
import {connectSocket} from './socket.js';
import {openRooms} from './views/rooms.js';
import {openAuthView} from './views/auth.js';




const views = {
    auth: document.getElementById('auth-view'),
    rooms: document.getElementById('rooms-view'),
    room: document.getElementById('room-view')
};

export function showView(name){
    Object.entries(views).forEach(([v,e])=>{
        e.classList.toggle('d-none',v !== name);
    });

}

async function start(){
    if(state.currentUserId){
        connectSocket(state.currentUserId);
        openRooms();
    }
    else{
        openAuthView();
    }
}

start();