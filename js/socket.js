import {state} from './state.js';

const WS_URL = 'wss://localhost:7248/ws/chat';

let socket = null;
const subscribers = {};

//subscribe
export function onSocketEvent(type, callback){
    if(!subscribers[type])
        subscribers[type] = [];

    subscribers[type].push(callback);
}

export function connectSocket(userId){
    const socket = new WebSocket(`${WS_URL}?userId=${userId}`);

    socket.onopen = ()=>{
        console.log('WebSocket connected');
    };

    socket.onclose = (event) => {
    console.log("WebSocket closed");

};
    
    //publisher
    socket.onmessage = (event)=>{
        const envelope = JSON.parse(event.data);
        const callbacks = subscribers[envelope.type] || [];
        callbacks.forEach(callback=>callback(envelope.data));
    }
    
    state.socket = socket

}

export function sendSocketMessage(payload){
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN)
        throw new Error('Connection failed');

    state.socket.send(JSON.stringify(payload));
}