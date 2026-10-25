import { state } from '../state.js';
import { toCamelCaseObject } from '../helpers.js';
import { onSocketEvent } from '../socket.js';
import { GetCandidateUsersForRoom, getRoomMembers, addMembers, removeMembers, updateMemberAdminStatus,closeRoom, reopenRoom, ExitRoom } from '../api.js';

let modalInstance = null;
let roomMembersData = null;
let modalEl = null;
let activeRoom = null;

export async function openRoomOptionsModal(room) {
    activeRoom = room;
    if(activeRoom.currentMemberIsActive)
        roomMembersData = await getRoomMembers(room.id, state.currentUserId);
    
    renderMainView();

    modalEl = document.getElementById('roomOptionsModal');
    modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
    modalInstance.show();
}

function renderMainView(){
    const contentEl = document.getElementById('roomOptionsModalContent');
    contentEl.innerHTML = `
        <div class="modal-header">
            <h5 class="modal-title">Chat Options</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
    `;

    if(!roomMembersData){
        contentEl.innerHTML +=`
            <div class="p-3 fs-4"> Sorry, you are not a member for this group.</div>
            `;
        return;
    }

    const isOwner = roomMembersData.createdByUserId === state.currentUserId;
    const myMembership = roomMembersData.members.find(m => m.userId === state.currentUserId);
    const isAdmin = myMembership ? myMembership.isAdmin : false;
    const isClosedRoom = activeRoom.closedAt ? true : false;

    const closeButton = isOwner
        ? activeRoom.closedAt
            ? `<button class="btn btn-outline-success w-100 mt-3" id="reopen-room-btn">Reopen Room</button>`
            : `<button class="btn btn-outline-danger w-100 mt-3" id="close-room-btn">Close Room</button>`
        : '';

    const leavedButton = !isOwner 
                ? `<button class="btn btn-outline-danger w-100 mt-3" id="exit-room-btn">Exit Room</button`
                :'';
        
        
    contentEl.innerHTML += `
        <div class="modal-body">
            <div id="members-list"></div>
            ${isAdmin ?
                `<button  ${isClosedRoom ? 'disabled' : ''} class="btn btn-outline-primary w-100 mt-3" id="show-add-members-btn">+ Add Member</button>`
                :''}
            ${closeButton}
            ${leavedButton}
        </div>
    `;

    renderMembersList(isOwner, isAdmin, isClosedRoom);

    if (isAdmin) {
        document.getElementById('show-add-members-btn').addEventListener('click', () => showAddMembersSection());
    }

    if (isOwner) {
        const btn = activeRoom.closedAt
            ? document.getElementById('reopen-room-btn')
            : document.getElementById('close-room-btn');
        btn.addEventListener('click', handleToggleClose);
    }
    if (!isOwner){
        const leavedBtn = document.getElementById('exit-room-btn')
        leavedBtn.addEventListener('click', handleExitRoom);
    }

}

    function renderMembersList(isOwner, isAdmin, isClosedRoom){
        const listEl = document.getElementById('members-list');
        listEl.innerHTML = roomMembersData.members.map(member => {
            const isOwnerRow = member.userId === roomMembersData.createdByUserId;
            const isSelf = member.userId === state.currentUserId;
            const ownerBadge = isOwnerRow ? `<span class="badge bg-warning text-dark ms-2">Owner</span>` : '';
            const adminBadge = !isOwnerRow && member.isAdmin ? `<span class="badge bg-primary ms-2">Admin</span>` : '';
            const adminToggle = (isOwner && !isOwnerRow)
            ? `<div class="form-check form-switch mb-0">
                   <input class="form-check-input admin-toggle" type="checkbox" role="switch"
                        ${isClosedRoom ? 'disabled' : ''}
                        data-user-id="${member.userId}" ${member.isAdmin ? 'checked' : ''}>
               </div>`
            : '';
            const removeButton = (isOwner && !isOwnerRow || isAdmin && !isOwnerRow && !isSelf && !member.isAdmin)
                ? `<button  ${isClosedRoom ? 'disabled' : ''} class="btn btn-sm btn-outline-danger remove-member-btn" data-user-id="${member.userId}">Remove</button>`
                : '';

            return `
            <div class="d-flex align-items-center justify-content-between p-2 border-bottom">
                <div>
                    <span>${member.userName}</span>
                    ${ownerBadge}${adminBadge}
                </div>
                <div class="d-flex align-items-center gap-2">
                    ${adminToggle}
                    ${removeButton}
                </div>
            </div>
        `;

        }).join('');

        document.querySelectorAll('.admin-toggle').forEach(toggle => {
        toggle.addEventListener('change', () => handleToggleAdmin(toggle));
    });

        document.querySelectorAll('.remove-member-btn').forEach(btn => {
        btn.addEventListener('click', () => handleRemoveMember(btn.dataset.userId));
    });
    }



async function handleToggleClose() {
    if (activeRoom.closedAt) {

        await reopenRoom(activeRoom.id, state.currentUserId);

    } else {

        await closeRoom(activeRoom.id, state.currentUserId);
    }

}

async function handleExitRoom(){
    if(state.currentRoomId === activeRoom.id)
        await ExitRoom(state.currentRoomId, state.currentUserId)
}


async function showAddMembersSection(){
    const candidateUsers = await GetCandidateUsersForRoom(state.currentRoomId);
    console.log(candidateUsers);


    const sectionEl = document.getElementById('roomOptionsModalContent');

    if (candidateUsers.length === 0) {
        sectionEl.innerHTML = `<div class="text-muted text-center py-2">Everyone is already a member.</div>`;
        return;
    }

    sectionEl.innerHTML = `
        <div class="modal-header">  
            <button class="btn btn-sm btn-light fs-3 me-2" id="back-modal-btn">&larr;</button>
            <h5 class="modal-title">Add Members</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body" style="max-height: 200px; overflow-y: auto;">
            ${candidateUsers.map(user => `
                <div class="d-flex align-items-center p-2 border-bottom">
                    <input type="checkbox" class="form-check-input me-2 add-member-checkbox" data-user-id="${user.userId}">
                    <span>${user.userName}</span>
                </div>
            `).join('')}
            <button class="btn btn-primary w-100 mt-2" id="confirm-add-members-btn">Add Selected</button>
        </div>
    `;

    document.getElementById('confirm-add-members-btn').addEventListener('click', () => handleAddMembers());
    document.getElementById('back-modal-btn').addEventListener('click',()=>{
    
    renderMainView();
    });

}

async function handleAddMembers(){
    const selectedUserIds = Array.from(document.querySelectorAll('.add-member-checkbox'))
        .filter(cb => cb.checked)
        .map(cb => cb.dataset.userId);

    if (selectedUserIds.length === 0)
        return;

    await addMembers({
        chatRoomId: activeRoom.id,
        requestingUserId: state.currentUserId,
        userIds: selectedUserIds
    });

}

async function handleRemoveMember(targetUserId) {
    await removeMembers({
        chatRoomId: activeRoom.id,
        requestingUserId: state.currentUserId,
        userIds: [targetUserId]
    });
}

async function handleToggleAdmin( toggleEl) {
    await updateMemberAdminStatus({
        chatRoomId: activeRoom.id,
        requestingUserId: state.currentUserId,
        targetUserId: toggleEl.dataset.userId,
        isAdmin: toggleEl.checked
    });
}

export function registerRoomOptionsListeners(){
    onSocketEvent('room_closed', handleClosedStateChangeEvent);
    onSocketEvent('room_reopened', handleClosedStateChangeEvent);
    onSocketEvent('member_removed', handleMembersRemovedEvent);
    onSocketEvent('member_added', handleMembersAddedEvent);
    onSocketEvent('member_updated', handleToggleAdminEvent);
    onSocketEvent('member_left', handleMemberLeftEvent);
}

function handleClosedStateChangeEvent(data){
    if(!activeRoom || state.currentRoomId !== data.chatRoomId || !modalEl.classList.contains("show"))
        return;

    if(data.closedAt)
        activeRoom.closedAt = data.closedAt;
    else
       activeRoom.closedAt = null; 

    renderMainView();

}

function handleMembersRemovedEvent(data){
    if(data.chatRoomId !== state.currentRoomId || !activeRoom || !modalEl.classList.contains("show"))
        return;

    if(data.isRemoved){
        roomMembersData = null;
    }
    else{
        roomMembersData.members = roomMembersData.members.filter(m => !data.removedMembersUserIds.includes(m.userId));
    }
    renderMainView();
}

function handleMemberLeftEvent(data){
    if(data.chatRoomId !== state.currentRoomId || !activeRoom || !modalEl.classList.contains("show"))
        return;

    const leavedMember = toCamelCaseObject(data.member);

    if(leavedMember.userId === state.currentUserId){
        roomMembersData = null;
    }
    else{
        roomMembersData.members = roomMembersData.members.filter(m => m.userId !== leavedMember.userId);
    }

    renderMainView();

}

function handleMembersAddedEvent(data){
    if(data.chatRoomId !== state.currentRoomId || !activeRoom || !modalEl.classList.contains("show"))
        return;

    roomMembersData.members.push(...data.newMembers.map(toCamelCaseObject));
    renderMainView();
}

function handleToggleAdminEvent(data){
    if(data.chatRoomId !== state.currentRoomId || !activeRoom || !modalEl.classList.contains("show"))
        return;

    const updatedMember = toCamelCaseObject(data.member);
    console.log(updatedMember);
    console.log(roomMembersData.members);

    roomMembersData.members = roomMembersData.members.map( m =>
             m.userId === updatedMember.userId ? updatedMember : m);

    console.log(roomMembersData.members);
    

    renderMainView();
}


async function refreshMembers() {
    roomMembersData = await getRoomMembers(activeRoom.id, state.currentUserId);
    renderMainView();
}