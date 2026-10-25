import {setCurrentUserId, state} from '../state.js'
import {connectSocket} from '../socket.js'
import { openRooms } from './rooms.js';
import { showView } from '../router.js';



export function openAuthView(){
    renderAuthView()
    showView('auth')
}

function renderAuthView(){
    const element = document.getElementById('auth-view');

    element.innerHTML = `
         <div class="d-flex align-items-center justify-content-center vh-100">
            <div class="card shadow-sm p-4" style="width: 100%; max-width: 400px;">
                <h3 class="text-center mb-4">Welcome to Chat</h3>
                <form id="auth-form">
                    <div class="mb-3">
                        <label for="userIdInput" class="form-label">Your User Id</label>
                        <input type="text" class="form-control" id="userIdInput" placeholder="Enter your Guid" required>
                    </div>
                    <button type="submit" class="btn btn-primary w-100">Continue</button>
                    <div id="auth-error" class="text-danger small mt-2 d-none"></div>
                </form>
            </div>
        </div>
    `

     document.getElementById('auth-form').addEventListener('submit',async (event)=>{
        event.preventDefault();
        const userId = document.getElementById('userIdInput').value.trim();
        const errorElement = document.getElementById('auth-error');
        const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if(!pattern.test(userId)){
            errorElement.textContent = 'Please enter a valid User Id.';
            errorElement.classList.remove('d-none');
        }
        else{
            setCurrentUserId(userId);
            connectSocket(userId);

            openRooms();
        }


     })
}