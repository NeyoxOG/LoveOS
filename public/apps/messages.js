
/**
 * Messages App Logic
 */

const KEYS = { SESSION: 'fiaos_session' };

let user = null;
let cloud = null;
let unsubscribe = null;

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);

    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    if (cloud) {
        unsubscribe = cloud.listenToMessages(renderMessages);
    } else {
        document.getElementById('chatList').innerHTML = '<div class="empty-state">Keine Verbindung zur Cloud.</div>';
    }

    // Input Listeners
    const inp = document.getElementById('msgInput');
    inp.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') send();
    });
}

function renderMessages(messages) {
    const list = document.getElementById('chatList');
    list.innerHTML = '';

    if (!messages || messages.length === 0) {
        list.innerHTML = '<div class="empty-state">Noch keine Nachrichten.<br>Schreib etwas! 👇</div>';
        return;
    }

    // Sort by Date Ascending
    const sorted = [...messages].sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    sorted.forEach(msg => {
        const div = document.createElement('div');
        // Fix: user.userId
        const isMe = msg.senderId === user.userId;
        div.className = `message ${isMe ? 'me' : 'other'}`;
        
        let timeStr = '';
        if (msg.createdAt) {
            const d = new Date(msg.createdAt);
            timeStr = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }

        div.innerHTML = `
            ${msg.text}
            <div class="msg-meta">${timeStr}</div>
        `;
        list.appendChild(div);
    });

    list.scrollTop = list.scrollHeight;
}

window.send = async () => {
    const inp = document.getElementById('msgInput');
    const text = inp.value.trim();
    if (!text) return;

    inp.value = '';
    
    if (cloud) {
        await cloud.sendMessage(text);
    }
};

window.onunload = () => {
    if (unsubscribe) unsubscribe();
};

init();
