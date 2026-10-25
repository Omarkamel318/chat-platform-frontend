const baseUrl = 'https://localhost:7248/api';

async function request(path, options = {}){
    const response = await fetch(`${baseUrl}${path}`,{
        headers: { 'Content-Type': 'application/json' },
        ...options
    });

    if (!response.ok) {
        console.log(await response.json());
        const errorBody = (await response.json()).errors.join(" ");
        console.log(errorBody);
        throw new Error(errorBody.error);
    }

    if(response.status === 204)
        return null;

    return (await response.json()).data;
}

export function getRoomsForUser(userId) {
    return request(`/chatrooms/user/${userId}`);
}

export function getRoomDetails(roomId, requestingUserId, skip = 0, take = 30) {
    return request(`/chatrooms/${roomId}?requestingUserId=${requestingUserId}&skip=${skip}&take=${take}`);
}

export function createRoom(payload) {
    return request('/chatrooms', { method: 'POST', body: JSON.stringify(payload) });
}

export function sendMessage(payload){
    return request("/chatrooms", {method:'POST', body: JSON.stringify(payload)});
}

export function addMembers(payload){
    return request('/chatrooms/members', {method: 'POST', body: JSON.stringify(payload)});
}

export function removeMembers(payload) {
    return request('/chatrooms/members', { method: 'DELETE', body: JSON.stringify(payload) });
}

export function updateMemberAdminStatus(payload) {
    return request('/chatrooms/members/admin-status', { method: 'PUT', body: JSON.stringify(payload) });
}

export function getAllUsers(){
    return request('/users');
}

export function GetCandidateUsersForRoom(chatRoomId){
    return request(`/users/${chatRoomId}/candidate-users`);
}

export function getUser(id){
    return request(`/users/${id}`);
}

export function getRoomMembers(roomId, requestingUserId) {
    return request(`/chatrooms/${roomId}/members?requestingUserId=${requestingUserId}`);
}

export function closeRoom(roomId, requestingUserId) {
    return request(`/chatrooms/${roomId}/close?requestingUserId=${requestingUserId}`, { method: 'PUT' });
}

export function reopenRoom(roomId, requestingUserId) {
    return request(`/chatrooms/${roomId}/reopen?requestingUserId=${requestingUserId}`, { method: 'PUT' });
}

export function clearRoomForMe(roomId, userId) {
    return request(`/chatrooms/${roomId}/clear?userId=${userId}`, { method: 'DELETE' });
}

export function GetOrCreateDirectRoom(userId, otherUserId){
    return request(`/chatrooms/direct-room/${userId}?otherUserId=${otherUserId}`);
}

export function ExitRoom(roomId, userId){
    return request(`/chatrooms/${roomId}/leave?userId=${userId}`, {method: 'POST'});
}