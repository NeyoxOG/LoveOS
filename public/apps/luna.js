
/**
 * Luna 3D Logic v2.0
 */

const KEYS = { SESSION: 'fiaos_session' };

let user = null;
let cloud = null;
let state = {
    hunger: 50,
    love: 50,
    energy: 80,
    isSleeping: false
};

// Three.js Globals
let scene, camera, renderer;
let lunaGroup, headGroup, bodyGroup, legs = [];
let clock = new THREE.Clock();
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// Animation State
let jumpTime = 0;
let isJumping = false;
let floatOffset = 0;
let decayInterval = null;

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (sessionStr) user = JSON.parse(sessionStr);

    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    loadState();
    init3D();
    animate();
    
    // Decay Logic (Run locally for UI feel, but cloud sync is master)
    decayInterval = setInterval(decayStats, 30000); // Every 30s decay

    // Listeners
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
}

async function loadState() {
    if (cloud) {
        const remote = await cloud.loadLuna();
        if (remote && remote.stats) {
            state.hunger = remote.stats.hunger || 50;
            state.love = remote.stats.love || 50;
            state.energy = remote.stats.energy || 80;
            state.isSleeping = !!remote.isSleeping;
        }
    }
    updateUI();
}

async function saveState() {
    if (cloud) {
        await cloud.updateLuna({
            stats: { 
                hunger: state.hunger, 
                love: state.love, 
                energy: state.energy 
            },
            isSleeping: state.isSleeping
        });
    }
}

function decayStats() {
    if (state.isSleeping) {
        // Recharge when sleeping
        state.energy = Math.min(100, state.energy + 2);
    } else {
        // Decay when awake
        state.hunger = Math.max(0, state.hunger - 1);
        state.energy = Math.max(0, state.energy - 0.5);
        // Love decays slowly if ignored
        state.love = Math.max(0, state.love - 0.2);
    }
    updateUI();
    // Auto save occasionally? Let's assume interactions trigger saves to avoid spam
}

// --- 3D Scene Setup (Same as before but refined) ---

function init3D() {
    const container = document.getElementById('scene-container');

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x1e1b4b, 0.02);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 0.5, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffd700, 0.8);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    scene.add(dirLight);
    
    const purpleLight = new THREE.PointLight(0x8b5cf6, 0.5);
    purpleLight.position.set(-5, 2, -5);
    scene.add(purpleLight);

    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.3 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.5;
    floor.receiveShadow = true;
    scene.add(floor);

    createLuna();
}

function createLuna() {
    lunaGroup = new THREE.Group();
    
    const woolMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, emissive: 0x222222 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.5 });
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

    bodyGroup = new THREE.Group();
    const sphereGeo = new THREE.SphereGeometry(0.6, 16, 16);
    
    const positions = [
        [0, 0, 0, 1], [0.6, 0.2, 0.2, 0.8], [-0.6, 0.1, -0.2, 0.85],
        [0, 0.5, 0.3, 0.7], [0, -0.4, -0.3, 0.7], [0.4, -0.3, 0.4, 0.6], [-0.5, 0.4, 0, 0.6]
    ];

    positions.forEach(pos => {
        const mesh = new THREE.Mesh(sphereGeo, woolMat);
        mesh.position.set(pos[0], pos[1], pos[2]);
        mesh.scale.setScalar(pos[3]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        bodyGroup.add(mesh);
    });
    lunaGroup.add(bodyGroup);

    headGroup = new THREE.Group();
    headGroup.position.set(0, 0.3, 0.8);
    const faceMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), skinMat);
    faceMesh.castShadow = true;
    headGroup.add(faceMesh);

    const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat); leftEye.position.set(0.15, 0.1, 0.45);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat); rightEye.position.set(-0.15, 0.1, 0.45);
    headGroup.add(leftEye); headGroup.add(rightEye);

    const blushGeo = new THREE.CircleGeometry(0.08, 16);
    const leftBlush = new THREE.Mesh(blushGeo, blushMat);
    leftBlush.position.set(0.25, -0.05, 0.42); leftBlush.rotation.y = 0.5;
    const rightBlush = new THREE.Mesh(blushGeo, blushMat);
    rightBlush.position.set(-0.25, -0.05, 0.42); rightBlush.rotation.y = -0.5;
    headGroup.add(leftBlush); headGroup.add(rightBlush);

    lunaGroup.add(headGroup);

    const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8);
    const legPositions = [ [0.4, -1, 0.4], [-0.4, -1, 0.4], [0.4, -1, -0.4], [-0.4, -1, -0.4] ];
    legPositions.forEach(pos => {
        const leg = new THREE.Mesh(legGeo, skinMat);
        leg.position.set(pos[0], pos[1], pos[2]);
        leg.castShadow = true;
        lunaGroup.add(leg);
        legs.push(leg);
    });

    scene.add(lunaGroup);
}

// --- Animation Loop ---

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    if (lunaGroup) {
        if (!state.isSleeping) {
            floatOffset = Math.sin(time * 2) * 0.05;
            lunaGroup.position.y = floatOffset;
            lunaGroup.rotation.y = Math.sin(time * 0.5) * 0.1;
            lunaGroup.rotation.x = 0; 
            lunaGroup.rotation.z = 0;
            legs.forEach((leg, i) => {
                leg.position.y = -1 + Math.sin(time * 4 + i) * 0.1;
                leg.rotation.x = Math.sin(time * 4 + i) * 0.2;
            });
        } else {
            lunaGroup.position.y = -0.5;
            lunaGroup.rotation.z = 0.2;
            lunaGroup.rotation.x = 0.2;
        }

        if (isJumping) {
            jumpTime += delta * 5;
            const jumpHeight = Math.sin(jumpTime) * 1.5;
            lunaGroup.position.y += Math.max(0, jumpHeight);
            if (jumpTime > Math.PI) {
                isJumping = false;
                jumpTime = 0;
            }
        }
    }
    renderer.render(scene, camera);
}

// --- Interaction ---

function onMouseMove(event) {
    if (state.isSleeping) return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    checkPetting();
    if (headGroup) {
        headGroup.rotation.y += (mouse.x * 0.5 - headGroup.rotation.y) * 0.1;
        headGroup.rotation.x += (mouse.y * 0.5 - headGroup.rotation.x) * 0.1;
    }
}

function onTouchMove(event) {
    if (event.touches.length > 0) {
        const touch = event.touches[0];
        mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        checkPetting();
    }
}

let lastPetTime = 0;
function checkPetting() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(bodyGroup.children);

    if (intersects.length > 0) {
        const now = Date.now();
        if (now - lastPetTime > 150) { 
            spawnHeart(intersects[0].point);
            state.love = Math.min(100, state.love + 1);
            lastPetTime = now;
            updateUI();
            if (Math.random() > 0.9 && !isJumping) {
                showBubble("Mäh! 💗");
                isJumping = true;
            }
            saveState(); // Debounce this in real app, but ok for now
        }
    }
}

// --- Drag & Drop ---

let draggedItem = null;
const dragProxy = document.getElementById('dragProxy');

window.startDrag = (e, itemType) => {
    e.preventDefault();
    draggedItem = itemType;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    dragProxy.innerText = getItemEmoji(itemType);
    dragProxy.style.display = 'flex';
    updateDragProxy(clientX, clientY);
    
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('touchmove', onDragMove, {passive:false});
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchend', onDragEnd);
};

function onDragMove(e) {
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    updateDragProxy(clientX, clientY);
}

function updateDragProxy(x, y) {
    dragProxy.style.left = (x - 30) + 'px';
    dragProxy.style.top = (y - 30) + 'px';
}

function onDragEnd(e) {
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const w = window.innerWidth; const h = window.innerHeight;
    
    // Check drop zone (Center screen)
    if (clientX > w * 0.3 && clientX < w * 0.7 && clientY > h * 0.2 && clientY < h * 0.7) {
        performAction(draggedItem);
    }

    dragProxy.style.display = 'none';
    draggedItem = null;
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('touchmove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('touchend', onDragEnd);
}

function performAction(item) {
    if (state.isSleeping && item !== 'star') {
        showBubble("Zzz... (Schläft)");
        return;
    }

    if (item === 'apple') {
        state.hunger = Math.min(100, state.hunger + 15);
        showBubble("Lecker! 🍎");
        isJumping = true;
    }
    if (item === 'star') {
        state.energy = Math.min(100, state.energy + 20);
        showBubble("Wach! ⚡");
        scene.background = new THREE.Color(0x333333);
        setTimeout(() => scene.background = null, 150);
        if (state.isSleeping) toggleSleep();
    }
    if (item === 'water') {
        state.hunger = Math.min(100, state.hunger + 5);
        state.energy = Math.min(100, state.energy + 5);
        showBubble("Glug glug 💧");
    }
    updateUI();
    saveState();
}

window.toggleSleep = () => {
    state.isSleeping = !state.isSleeping;
    showBubble(state.isSleeping ? "Gute Nacht 🌙" : "Guten Morgen ☀️");
    updateUI();
    saveState();
};

function getItemEmoji(type) { return type==='apple'?'🍎':type==='star'?'🌟':type==='water'?'💧':'📦'; }

// --- UI Helpers ---

function updateUI() {
    document.getElementById('bar-love').style.width = state.love + '%';
    document.getElementById('bar-hunger').style.width = state.hunger + '%';
    
    // Determine Mood Text
    let moodText = "Glücklich";
    if (state.isSleeping) moodText = "Schläft 🌙";
    else if (state.hunger < 30) moodText = "Hungrig 🍎";
    else if (state.energy < 20) moodText = "Müde 😴";
    else if (state.love < 30) moodText = "Einsam 💔";
    
    document.getElementById('status-text').innerText = moodText;
}

function showBubble(text) {
    const b = document.getElementById('speech-bubble');
    b.innerText = text;
    b.classList.add('show');
    setTimeout(() => b.classList.remove('show'), 2000);
}

function spawnHeart(pos) {
    const div = document.createElement('div');
    div.innerText = '💗';
    div.style.position = 'absolute';
    div.style.fontSize = '24px';
    div.style.pointerEvents = 'none';
    const vec = pos.clone().project(camera);
    div.style.left = ((vec.x * .5 + .5) * window.innerWidth) + 'px';
    div.style.top = ((-(vec.y * .5) + .5) * window.innerHeight) + 'px';
    div.style.transition = 'transform 1s, opacity 1s';
    document.body.appendChild(div);
    setTimeout(() => {
        div.style.transform = `translate(${Math.random()*40-20}px, -100px) scale(1.5)`;
        div.style.opacity = '0';
    }, 50);
    setTimeout(() => div.remove(), 1000);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
