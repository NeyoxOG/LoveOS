
/**
 * Luna 3D Logic
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
let particles = [];
let clock = new THREE.Clock();
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// Animation State
let jumpTime = 0;
let isJumping = false;
let floatOffset = 0;
let lastDecayAt = Date.now();
let lastSaveAt = Date.now();

function init() {
    const sessionStr = localStorage.getItem(KEYS.SESSION);
    if (!sessionStr) return;
    user = JSON.parse(sessionStr);
    user.id = user.id || user.userId;

    if (window.parent.FIAOS && window.parent.FIAOS.cloud) {
        cloud = window.parent.FIAOS.cloud;
    }

    loadState();
    init3D();
    animate();
    setInterval(tickNeeds, 15000);
    
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
            }
        });
    }
}

function clampStat(value) {
    return Math.max(0, Math.min(100, value));
}

function tickNeeds() {
    const now = Date.now();
    const minutes = (now - lastDecayAt) / 60000;
    if (minutes <= 0) return;

    if (state.isSleeping) {
        state.energy = clampStat(state.energy + minutes * 6);
        state.hunger = clampStat(state.hunger - minutes * 1);
    } else {
        state.energy = clampStat(state.energy - minutes * 4);
        state.hunger = clampStat(state.hunger - minutes * 2);
        state.love = clampStat(state.love - minutes * 0.5);
    }

    if (!state.isSleeping && state.energy <= 10) {
        state.isSleeping = true;
        showBubble("Müde... 😴");
    }

    lastDecayAt = now;
    updateUI();

    if (now - lastSaveAt > 60000) {
        lastSaveAt = now;
        saveState();
    }
}

// --- 3D Scene Setup ---

function init3D() {
    const container = document.getElementById('scene-container');

    // Scene
    scene = new THREE.Scene();
    // fog to blend floor
    scene.fog = new THREE.FogExp2(0x1e1b4b, 0.02);

    // Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 0.5, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffd700, 0.8); // Gold sunlight
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    scene.add(dirLight);
    
    const purpleLight = new THREE.PointLight(0x8b5cf6, 0.5);
    purpleLight.position.set(-5, 2, -5);
    scene.add(purpleLight);

    // Floor (Invisible catcher for shadows)
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.3 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.5;
    floor.receiveShadow = true;
    scene.add(floor);

    // --- Create Luna ---
    createLuna();
}

function createLuna() {
    lunaGroup = new THREE.Group();
    
    // Materials
    const woolMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        roughness: 0.8,
        emissive: 0x222222
    });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.5 }); // Dark blue face
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

    // Body (Cloud of Spheres)
    bodyGroup = new THREE.Group();
    const sphereGeo = new THREE.SphereGeometry(0.6, 16, 16);
    
    // Main body clumps
    const positions = [
        [0, 0, 0, 1],
        [0.6, 0.2, 0.2, 0.8],
        [-0.6, 0.1, -0.2, 0.85],
        [0, 0.5, 0.3, 0.7],
        [0, -0.4, -0.3, 0.7],
        [0.4, -0.3, 0.4, 0.6],
        [-0.5, 0.4, 0, 0.6]
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

    // Head
    headGroup = new THREE.Group();
    headGroup.position.set(0, 0.3, 0.8);
    
    const faceMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), skinMat);
    faceMesh.castShadow = true;
    headGroup.add(faceMesh);

    // Eyes (White dots)
    const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.15, 0.1, 0.45);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(-0.15, 0.1, 0.45);
    headGroup.add(leftEye);
    headGroup.add(rightEye);

    // Blush
    const blushGeo = new THREE.CircleGeometry(0.08, 16);
    const leftBlush = new THREE.Mesh(blushGeo, blushMat);
    leftBlush.position.set(0.25, -0.05, 0.42);
    leftBlush.rotation.y = 0.5;
    const rightBlush = new THREE.Mesh(blushGeo, blushMat);
    rightBlush.position.set(-0.25, -0.05, 0.42);
    rightBlush.rotation.y = -0.5;
    headGroup.add(leftBlush);
    headGroup.add(rightBlush);

    lunaGroup.add(headGroup);

    // Legs (Floating Rayman Style)
    const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8);
    const legPositions = [
        [0.4, -1, 0.4],
        [-0.4, -1, 0.4],
        [0.4, -1, -0.4],
        [-0.4, -1, -0.4]
    ];

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
        // Floating (breathing)
        if (!state.isSleeping) {
            floatOffset = Math.sin(time * 2) * 0.05;
            lunaGroup.position.y = floatOffset;
            
            // Subtle rotation
            lunaGroup.rotation.y = Math.sin(time * 0.5) * 0.1;
            
            // Leg swing
            legs.forEach((leg, i) => {
                leg.position.y = -1 + Math.sin(time * 4 + i) * 0.1;
                leg.rotation.x = Math.sin(time * 4 + i) * 0.2;
            });
        } else {
            // Sleeping pose
            lunaGroup.position.y = -0.5;
            lunaGroup.rotation.z = 0.1; // tilt
            lunaGroup.rotation.x = 0.2; // nod
        }

        // Jump Logic
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

    // Particles
    updateParticles();

    renderer.render(scene, camera);
}

// --- Interaction ---

function onMouseMove(event) {
    if (state.isSleeping) return;
    
    // Normalize mouse
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    checkPetting();
    
    // Head tracking (Subtle)
    if (headGroup) {
        const targetX = mouse.x * 0.5;
        const targetY = mouse.y * 0.5;
        headGroup.rotation.y += (targetX - headGroup.rotation.y) * 0.1;
        headGroup.rotation.x += (targetY - headGroup.rotation.x) * 0.1;
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

// "Petting" via Raycasting
let lastPetTime = 0;
function checkPetting() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(bodyGroup.children);

    if (intersects.length > 0) {
        const now = Date.now();
        if (now - lastPetTime > 100) { // Limit rate
            spawnHeart(intersects[0].point);
            state.love = Math.min(100, state.love + 0.5);
            lastPetTime = now;
            updateUI();
            
            // Random jump if loved enough
            if (Math.random() > 0.95 && !isJumping) {
                showBubble("Yay! 💗");
                isJumping = true;
            }
        }
    }
}

// --- Drag and Drop Logic ---

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
    // Check if dropped near center (approx where Luna is)
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Simple box check for center screen
    if (clientX > width * 0.3 && clientX < width * 0.7 && clientY > height * 0.2 && clientY < height * 0.7) {
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
    if (state.isSleeping && item !== 'star') { // Only star wakes up? Or just shake
        showBubble("Zzz...");
        return;
    }

    if (item === 'apple') {
        state.hunger = Math.min(100, state.hunger + 20);
        showBubble("Mjam! 🍎");
        isJumping = true;
    }
    if (item === 'star') {
        state.energy = Math.min(100, state.energy + 20);
        showBubble("Power! ⚡");
        // Flash effect
        scene.background = new THREE.Color(0x333333);
        setTimeout(() => scene.background = null, 100);
    }
    if (item === 'water') {
        showBubble("Erfrischend 💧");
        state.hunger = Math.min(100, state.hunger + 5);
    }
    
    updateUI();
    saveState();
}

window.toggleSleep = () => {
    state.isSleeping = !state.isSleeping;
    if (state.isSleeping) {
        showBubble("Gute Nacht 🌙");
        state.energy = 100; // instant recharge logic for demo
    } else {
        showBubble("Guten Morgen! ☀️");
    }
    updateUI();
    saveState();
};

function getItemEmoji(type) {
    if(type==='apple') return '🍎';
    if(type==='star') return '🌟';
    if(type==='water') return '💧';
    return '📦';
}

// --- Particles (Hearts) ---

function spawnHeart(pos) {
    const div = document.createElement('div');
    div.innerText = '💗';
    div.style.position = 'absolute';
    div.style.fontSize = '24px';
    div.style.pointerEvents = 'none';
    
    // Project 3D pos to 2D screen
    const vec = pos.clone();
    vec.project(camera);
    const x = (vec.x * .5 + .5) * window.innerWidth;
    const y = (-(vec.y * .5) + .5) * window.innerHeight;
    
    div.style.left = x + 'px';
    div.style.top = y + 'px';
    div.style.transition = 'transform 1s, opacity 1s';
    
    document.body.appendChild(div);
    
    // Animate CSS
    setTimeout(() => {
        div.style.transform = `translate(${Math.random()*40-20}px, -100px) scale(1.5)`;
        div.style.opacity = '0';
    }, 50);
    
    setTimeout(() => div.remove(), 1000);
}

function updateParticles() {
    // Placeholder if we wanted 3D particles in scene
}

// --- UI Helpers ---


function getWeatherInfo() {
    const hour = new Date().getHours();
    const dayPart = hour < 6 ? 'Nacht' : hour < 12 ? 'Morgen' : hour < 18 ? 'Tag' : 'Abend';
    const variants = [
        { icon: '☀️', label: 'Sonnig' },
        { icon: '🌤️', label: 'Leicht bewölkt' },
        { icon: '🌧️', label: 'Sanfter Regen' },
        { icon: '🌙', label: 'Ruhige Nacht' }
    ];
    const idx = (new Date().getDate() + new Date().getHours()) % variants.length;
    return { ...variants[idx], dayPart };
}


function updateUI() {
    document.getElementById('bar-love').style.width = state.love + '%';
    document.getElementById('bar-hunger').style.width = state.hunger + '%';
    document.getElementById('bar-energy').style.width = state.energy + '%';
    document.getElementById('status-text').innerText = getMoodText();
    const weather = getWeatherInfo();
    const weatherIcon = document.getElementById('weather-icon');
    const weatherText = document.getElementById('weather-text');
    const dayPart = document.getElementById('daypart-text');
    if (weatherIcon) weatherIcon.innerText = weather.icon;
    if (weatherText) weatherText.innerText = weather.label;
    if (dayPart) dayPart.innerText = weather.dayPart;
}

function getMoodText() {
    if (state.isSleeping) return 'Schläft 🌙';
    if (state.hunger <= 20) return 'Hungrig 🍎';
    if (state.energy <= 20) return 'Müde 💤';
    if (state.love >= 80) return 'Glücklich 💗';
    return 'Wach ☀️';
}

function showBubble(text) {
    const b = document.getElementById('speech-bubble');
    b.innerText = text;
    b.classList.add('show');
    setTimeout(() => b.classList.remove('show'), 2000);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
