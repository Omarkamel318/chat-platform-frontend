import { state } from '../state.js';
import { getAllUsers, createRoom } from '../api.js';
import { openRoom } from './room.js';
import { loadRooms } from './rooms.js';


let modalInstance = null;
let allUsers = [];

export async function openCreateRoomModal() {    
    allUsers = ((await getAllUsers())).filter(u => u.userId !== state.currentUserId);

    const contentElement = document.getElementById('createRoomModalContent');
    contentElement.innerHTML = buildModalContent();

    bindDirectTabEvents();
    bindGroupTabEvents();

    const modalElement = document.getElementById('createRoomModal');

    modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
    modalInstance.show();
}


function buildModalContent() {
    return `
        <div class="modal-header">
            <h5 class="modal-title">Start a conversation</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
            <ul class="nav nav-tabs mb-3" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#direct-tab-pane" type="button">
                        Direct Message
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" data-bs-toggle="tab" data-bs-target="#group-tab-pane" type="button">
                        New Group
                    </button>
                </li>
            </ul>
            <div class="tab-content">
                <div class="tab-pane fade show active" id="direct-tab-pane">
                    ${buildUserListHtml('direct-user-item')}
                </div>
                <div class="tab-pane fade" id="group-tab-pane">
                    <div class="mb-3">
                        <label class="form-label">Group name</label>
                        <input type="text" class="form-control" id="group-name-input" placeholder="e.g. Project Team">
                    </div>
                    <label class="form-label">Add members</label>
                    <div style="max-height: 250px; overflow-y: auto;">
                        ${buildUserListHtml('group-user-checkbox', true)}
                    </div>
                    <button class="btn btn-primary w-100 mt-3" id="create-group-btn" disabled>Create Group</button>
                </div>
            </div>
        </div>
    `;
}

function buildUserListHtml(itemClass, withCheckbox = false) {
    if (allUsers.length === 0) {
        return `<div class="text-muted text-center py-3">No other users found.</div>`;
    }

    return allUsers.map(user => `
        <div class="d-flex align-items-center p-2 border-bottom ${itemClass}" data-user-id="${user.userId}" role="button">
            ${withCheckbox ? `<input type="checkbox" class="form-check-input me-2" data-user-id="${user.userId}">` : ''}
            <div class="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-2"
                 style="width: 36px; height: 36px; flex-shrink: 0;">
                ${user.userName[0].toUpperCase()}
            </div>
            <span>${user.userName}</span>
        </div>
    `).join('');
}

function bindDirectTabEvents() {
    document.querySelectorAll('.direct-user-item').forEach(item => {
        item.addEventListener('click', async () => {
            const otherUserId = item.dataset.userId;

            const room = state.rooms.find(r=>r.otherDirectUserId === otherUserId);

            modalInstance.hide();
            if(room)
                openRoom(room.id, otherUserId);
            else 
                openRoom(null, otherUserId);
        });
    });
}

function bindGroupTabEvents() {
    const createBtn = document.getElementById('create-group-btn');
    const nameInput = document.getElementById('group-name-input');
    const checkboxes = document.querySelectorAll('.group-user-checkbox input[type="checkbox"]');

    function updateButtonState() {
        const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
        createBtn.disabled = !anyChecked || nameInput.value.trim() === '';
    }

    checkboxes.forEach(cb => cb.addEventListener('change', updateButtonState));


    nameInput.addEventListener('input', updateButtonState);



    createBtn.addEventListener('click', async () => {
        const selectedUserIds = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.dataset.userId);

        const response = await createRoom({
            name: nameInput.value.trim(),
            isGroup: true,
            createdByUserId: state.currentUserId,
            memberUserIds: selectedUserIds
        });

        const room = response;

        modalInstance.hide();
        openRoom(room.id);
        loadRooms();

    });
}