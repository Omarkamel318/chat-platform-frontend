import { state } from '../state.js';
import { showView } from '../router.js';
import {getRoomDetails, getUser, GetOrCreateDirectRoom} from '../api.js';
import {formatTime, toCamelCaseObject} from '../helpers.js';
import {sendSocketMessage,onSocketEvent} from '../socket.js';
import{renderRoomsList} from './rooms.js';
import { openRoomOptionsModal } from './roomOptions.js';
const PAGE_SIZE = 30;

let currentRoom = null;
let oldestLoadedSkip = 0;
let hasMoreMessages = true;
let typingTimeout = null;
let otherUserId = null;


export function openRoom(roomId, userId) {
    otherUserId = userId
    state.currentRoomId = roomId;
    showView('room');
    renderRoomView();
}

async function renderRoomView() {
    const elment = document.getElementById('room-view');

    elment.innerHTML = `
        <div class=" d-flex flex-column vh-100">
            <div class="d-flex align-items-center p-3 border-bottom bg-white">
                <button class="btn btn-sm btn-light fs-3 me-2" id="back-btn">&larr;</button>
                <div id="room-header-info" class="flex-grow-1"></div>
            </div>
            <div id="messages-container" class="flex-grow-1 overflow-auto p-3"></div>
            <div id="typing-indicator" class="px-3 fw-semibold invisible text-muted small">Typing...</div>
            <div class="p-3 border-top bg-white">
                <form id="send-message-form" class="d-flex gap-2">
                    
                </form>
            </div>
        </div>
    `;

    const container = document.querySelector('#messages-container');

    container.addEventListener('scroll',()=>{
        if(container.scrollTop === 0)
            loadOlderMessages();
    });

    document.getElementById('back-btn').addEventListener('click', () => {
        state.currentRoomId = null;
        otherUserId = null;
        currentRoom = null;
        renderRoomsList();
        showView('rooms');
    });
    document.getElementById('send-message-form').addEventListener('submit', handleSendMessage);

    // const inputElement = document.getElementById('message-input');
    // inputElement.addEventListener('input', handleTypingInput);
    // inputElement.focus();


    oldestLoadedSkip = 0;
    hasMoreMessages = true;


    if(state.currentRoomId)
        await loadRoom();
    else
        await createEmptyRoom();

    if(currentRoom.currentMemberIsActive)
        markAsRead(state.currentRoomId);
    
}

async function createEmptyRoom(){
    hasMoreMessages = false;

    const headerElment = document.getElementById('room-header-info');
    const displayName = (await getUser(otherUserId)).userName
    headerElment.innerHTML = `<span class="fw-semibold">${displayName}</span>`;
}

async function loadRoom(){
    currentRoom = (await getRoomDetails(state.currentRoomId, state.currentUserId, 0, PAGE_SIZE));
    oldestLoadedSkip = currentRoom.messages.length;
    hasMoreMessages = currentRoom.messages.length === PAGE_SIZE;
    
    //header
    renderHeader();

    //SendForm
    renderSendForm();

    //messages
    renderMessages();

    scrollToBottom();
}

function renderHeader(){
const headerElment = document.getElementById('room-header-info');
    const displayName = currentRoom.name

    const membersButton = currentRoom.isGroup
        ? `<button class="menu-button btn btn-sm btn-light float-end" id="options-btn">
        <span></span>
        <span></span>
        <span></span>
        </button>`
        : '';

    headerElment.innerHTML = `<span class="fw-semibold">${displayName}</span>${membersButton}`;

    if (currentRoom.isGroup) {
        document.getElementById('options-btn').addEventListener('click', () => openRoomOptionsModal(currentRoom));
    }
}


function renderSendForm(){
    const formEl = document.getElementById('send-message-form');
    formEl.innerHTML = `<input type="text" id="message-input" class="form-control" placeholder="" autocomplete="off">
                    <button type="submit" id="message-send" class="btn btn-primary">Send</button>`

    const input = document.getElementById('message-input');
    const button = document.getElementById('message-send');

    const isClosed = Boolean(currentRoom.closedAt);
    const currentMemberIsActive = currentRoom.currentMemberIsActive;
    const isDisabled = isClosed || !currentMemberIsActive;


    input.disabled = isDisabled;
    button.disabled = isDisabled;
    input.placeholder = !currentMemberIsActive ? 'You are not a member for this group'
                                        : isClosed ? 'The group is closed'
                                            :'Type a message...' ;

    if(!isDisabled){
        const inputElement = document.getElementById('message-input');
        inputElement.addEventListener('input', handleTypingInput);
        inputElement.focus();
    }
}

function renderMessages(){
    const container = document.getElementById('messages-container');

    const loadMoreButton = hasMoreMessages
        ? `<div class="text-center mb-3"><button class="btn btn-sm btn-outline-secondary" id="load-more-btn">Load older messages</button></div>`
        : '';

    container.innerHTML = loadMoreButton + currentRoom.messages.map(renderMessageBubble).join('');

    if (hasMoreMessages) {
        document.getElementById('load-more-btn').addEventListener('click', loadOlderMessages);
    }
}

function renderMessageBubble(message) {

    const isMine = message.senderId === state.currentUserId;
    const bubbleClass = isMine ? 'ms-auto bubble-mine' : 'me-auto bubble-other';

    return `
        <div class="d-flex flex-column mb-2 ${isMine ? 'align-items-end' : 'align-items-start'}">
            ${!isMine ? `<span class="small text-muted">${message.senderUserName}</span>` : ''}
            <div class="p-2 rounded-3 ${bubbleClass}" style="max-width: 70%;">
                <div>${message.content}</div>
                <div class="d-flex justify-content-end align-items-center gap-1 mt-1">
                    <span class="small opacity-75">${formatTime(message.sentAt)}</span>
                    <span class="small opacity-75">Sent</span>
                    </div>
            </div>
            <div class = "">
                ${isMine ? renderReadStatus(message) : ''}
            </div>
        </div>
    `;
}

function renderReadStatus(message) {

    const readCount = message.readBy.length;

    if (currentRoom.isGroup) {
        return `
            ${readCount > 0 ? `<span class="small opacity-75">Seen by ${message.readBy.map(rb=>rb.userName).join(', ')}</span>` : '' }
        `;

    }

    return `
        ${readCount > 0 ? `<span class="small opacity-75">Seen at ${formatTime(message.readBy[0].readAt)}</span>` : ''}
    `
}

function scrollToBottom() {
    const container = document.getElementById('messages-container');
    container.scrollTop = container.scrollHeight;
}

async function loadOlderMessages() {
    const container = document.getElementById('messages-container');
    const previousHeight = container.scrollHeight;

    const olderPage = await getRoomDetails(state.currentRoomId, state.currentUserId, oldestLoadedSkip, PAGE_SIZE);
    currentRoom.messages = [...olderPage.messages, ...currentRoom.messages];
    oldestLoadedSkip += olderPage.messages.length;
    hasMoreMessages = olderPage.messages.length === PAGE_SIZE;

    renderMessages();
    container.scrollTop = container.scrollHeight - previousHeight;
}

async function handleSendMessage(event) {
    event.preventDefault();

    const input = document.getElementById('message-input');
    const content = input.value.trim();
    if (content === '') return;

    input.value = '';
    //stopTyping();
    if(!state.currentRoomId){
        currentRoom = await GetOrCreateDirectRoom(state.currentUserId,otherUserId);
        console.log(currentRoom);
        state.currentRoomId = currentRoom.id;
    }

    sendSocketMessage({
        type: 'new_message',
        chatRoomId: state.currentRoomId,
        content: content,
        receiverId: otherUserId
    });

}

function handleTypingInput() {
    sendSocketMessage({ type: 'typing', chatRoomId: state.currentRoomId});

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(stopTyping, 1000);
}

function markAsRead(currentRoomId){
    sendSocketMessage({
        type : 'mark_as_read',
        chatRoomId: currentRoomId
    })
}


export function registerRoomListeners() {
    onSocketEvent('new_message', handleIncomingMessage);
    onSocketEvent('typing', handleTypingEvent);
    onSocketEvent('read_receipt', handleReadReceiptEvent);
    onSocketEvent('room_closed', handleClosedStateChange);
    onSocketEvent('room_reopened', handleClosedStateChange);
    onSocketEvent('member_removed', handleMembersRemovedEvent);
    onSocketEvent('member_left', handleMemberLeftEvent);
    
}

async function handleIncomingMessage(message) {

    if (message.chatRoomId !== state.currentRoomId)
        return;

    currentRoom.messages = [...currentRoom.messages, message];

    renderMessages();
    scrollToBottom();

    if (message.senderId !== state.currentUserId) {
         markAsRead(state.currentRoomId);
    }
}

function handleTypingEvent(res) {
    if (!currentRoom || res.chatRoomId !== state.currentRoomId) 
        return;
    if (res.typingUserId === state.currentUserId) 
        return;

    const indicator = document.getElementById('typing-indicator');    
    //indicator.textContent = res.isTyping ? 'Typing...' : '';
    res.isTyping ? indicator.classList.remove('invisible') : indicator.classList.add('invisible');
    
}

function handleReadReceiptEvent(res) {

    if(res.readerUserId === state.currentUserId){
        state.rooms.find(r => r.id === res.chatRoomId).lastReadAtForRequestedUser = res.readAt;
        renderRoomsList();
        return;
    }

    if (res.chatRoomId !== state.currentRoomId)
        return;

    if (!currentRoom.isGroup) {

        currentRoom.messages.forEach(m => {
            if(m.senderId === state.currentUserId && m.readBy.length == 0){
                m.readBy.push({userId : res.readerUserId, readAt : res.readAt});
            }
        })

    } else {
        currentRoom.messages = currentRoom.messages.map(m => {
            if (m.senderId !== state.currentUserId)
                 return m;

            const alreadyIncluded = (m.readBy || []).some(r => r.userId === res.readerUserId);
            if (alreadyIncluded)
                 return m;

            console.log(m);
            console.log({ ...m, readBy: [...(m.readBy || []), { userId: res.readerUserId, userName: res.readerUserName, readAt: res.readAt }] });

            return { ...m, readBy: [...(m.readBy || []), { userId: res.readerUserId, userName: res.readerUserName, readAt: res.readAt }] };
        });
    }

    renderMessages();
}

function handleClosedStateChange(data) {
    if(!currentRoom || state.currentRoomId !== data.chatRoomId)
        return;

    if(data.closedAt){
        currentRoom.closedAt = data.closedAt;
    }

    else{
        currentRoom.closedAt = null; 
    }

    renderSendForm();
    renderHeader();
}

function handleMembersRemovedEvent(data){
    if(!currentRoom || state.currentRoomId !== data.chatRoomId)
        return;

    if(data.isRemoved){
        currentRoom.currentMemberIsActive = false;
        renderSendForm();
    }

}

function handleMemberLeftEvent(data){
    if(!currentRoom || state.currentRoomId !== data.chatRoomId)
        return;

    const leavedMember = toCamelCaseObject(data.member);

    if(leavedMember.userId === state.currentUserId){
        currentRoom.currentMemberIsActive = false;
        renderSendForm();
    }
}

function stopTyping() {
    sendSocketMessage({ type: 'typing', chatRoomId: state.currentRoomId, isTyping: false });
}