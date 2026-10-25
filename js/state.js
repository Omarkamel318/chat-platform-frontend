const USER_ID = 'current_user_id'

export const state = {
    currentUserId: sessionStorage.getItem(USER_ID),
    socket: null,
    currentRoomId: null,
    rooms: []
};

export function setCurrentUserId(userId){
    state.currentUserId = userId;
    sessionStorage.setItem(USER_ID,userId)
}

export function clearCurrentUserId() {
    state.currentUserId = null;
    sessionStorage.removeItem(USER_ID_KEY);
}