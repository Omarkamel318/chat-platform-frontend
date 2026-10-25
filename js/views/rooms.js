import { state } from '../state.js';
import { getRoomsForUser, clearRoomForMe } from '../api.js';
import { onSocketEvent } from '../socket.js';
import { openRoom } from './room.js';
import { openCreateRoomModal } from './createRoom.js';
import { showView } from '../router.js';
import {registerMainRealtimeListeners} from '../Events.js'




// let listenersRegistered = false;

export function openRooms() {
    showView('rooms');
    renderRoomsView();
    registerMainRealtimeListeners();
}

async function renderRoomsView() {
    const element = document.getElementById('rooms-view');

    element.innerHTML = `
        <div class="d-flex flex-column vh-100">
            <div class="d-flex justify-content-between align-items-center p-3 border-bottom bg-white">
                <h4 class="mb-0">Chats</h4>
                <button class="btn btn-primary btn-sm" id="new-room-btn">+ New Room</button>
            </div>
            <div id="rooms-list-container" class="flex-grow-1 overflow-auto"></div>
        </div>
    `;

    document.getElementById('new-room-btn').addEventListener('click',()=>openCreateRoomModal());

    //load rooms
    loadRooms();

    // subscribe what would happen
    // registerRoomsListeners();
}

export async function loadRooms() {
    state.rooms= await getRoomsForUser(state.currentUserId);

    renderRoomsList();
}

export function renderRoomsList(){
    const container = document.getElementById('rooms-list-container');

    if(state.rooms.length === 0)
        container.innerHTML = `<div class="text-center text-muted p-5">No chats yet. Start a new one!</div>`;


    container.innerHTML = state.rooms.map(room =>renderRoomCards(room)).join('');

    state.rooms.forEach(room => {
        document.getElementById(`room-card-${room.id}`).addEventListener('click',()=>openRoom(room.id));
    });

    document.querySelectorAll('.delete-room-btn').forEach(btn => {
        btn.addEventListener('click', (event) => {
            event.stopPropagation();
            handleDeleteRoom(btn.dataset.roomId);
        });
    });
}

function renderRoomCards(room){
    const displayName = room.name;
    const lastMessage = room.lastMessage? room.lastMessage.content : 'Start chating...';
    const time = new Date(room.lastMessage ? room.lastMessage.sentAt : room.createdAt);
    const lastReadAtForRequestedUser = new Date(room.lastReadAtForRequestedUser);
    const senderUserName = room.lastMessage ? `${room.lastMessage.senderUserName}: `: '';
    const isCurrentUserMessage = room.lastMessage ? room.lastMessage.senderUserId === state.currentUserId : false;

    return `
        <div id="room-card-${room.id}" class="d-flex align-items-center p-3 border-bottom room-card" role="button">
            <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                 style="width: 48px; height: 48px; flex-shrink: 0;">
                ${displayName[0]}
            </div>
            <div class="flex-grow-1 overflow-hidden">
                <div class="d-flex justify-content-between">
                    <span class="${lastReadAtForRequestedUser < time && !isCurrentUserMessage ? 'fw-bold' : 'fw-semibold'} ">${displayName}</span>
                    <span class="${lastReadAtForRequestedUser < time && !isCurrentUserMessage ? 'fw-bold' : 'text-muted'} small">${formatTime(time)}</span>
                </div>
                <div class="${lastReadAtForRequestedUser < time && !isCurrentUserMessage ? 'fw-medium' : ''} text-muted small text-truncate">${isCurrentUserMessage ? 'you: ' : senderUserName}${lastMessage}</div>
            </div>
            <button class="btn btn-lg text-danger delete-room-btn" data-room-id="${room.id}" title="Delete chat">&times;</button>
        </div>
        `
    }

async function handleDeleteRoom(roomId) {
    if (!confirm('Delete this chat?')) return;

    await clearRoomForMe(roomId, state.currentUserId);
    state.rooms = state.rooms.filter(r => r.id !== roomId);
    renderRoomsList();
}

export function registerRoomsListeners(){
    onSocketEvent('new_message',handleNewMessageEvent);
    onSocketEvent('member_added',handleAddedToNewGroupEvent);


}

function handleNewMessageEvent(data){
     let existingRoom = state.rooms.find(r=>r.id === data.chatRoomId);

        if(existingRoom){

            existingRoom.lastMessage = {
                content: data.content,
                senderUserName: data.senderUserName,
                sentAt: data.sentAt,
                senderUserId: data.senderId
            };


            const newRoom = window.structuredClone(existingRoom);

            state.rooms.unshift(newRoom);

            const indexOfExistingRoom = state.rooms.indexOf(existingRoom);
            state.rooms.splice(indexOfExistingRoom, 1);
            
            renderRoomsList();
        }
        else{
            loadRooms();
        }
}

function handleAddedToNewGroupEvent(data){
    let existingRoom = state.rooms.find(r=>r.id === data.chatRoomId);

    if(existingRoom)
        return;

    loadRooms();
}

function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString([],{hour: '2-digit', minute: '2-digit'})
}
