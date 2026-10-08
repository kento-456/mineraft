// Game Engine Variables
let scene, camera, renderer, clock;
let player = {
    position: new THREE.Vector3(50, 1.6, 50),
    velocity: new THREE.Vector3(),
    canJump: true,
    health: 100,
    hunger: 100,
    energy: 100
};

// Input & Controls States
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let isLocked = false;

// Gameplay Variables
const MAP_SIZE = 100;
let blocks = []; // Holds references to block meshes for collision/raycasting
let mobs = [];

let inventory = { Grass: 10, Stone: 5, Wood: 5, Apple: 3 };
const blockTypes = ["Grass", "Stone", "Wood"];
let currentBlockIndex = 0;

// Colors mapping
const blockColors = { Grass: 0x557a2b, Stone: 0x777777, Wood: 0x8a5a36 };

// Raycasting for mining/placing
let raycaster = new THREE.Raycaster();
let mouseCenter = new THREE.Vector2(0, 0); // Always center screen

// DOM Hooks
let blocker, hpVal, hungerVal, energyVal, selectedVal, invGrass, invStone, invWood, invApple;

// Initialize when page fully loads
window.onload = function() {
    blocker = document.getElementById('blocker');
    hpVal = document.getElementById('hp-val');
    hungerVal = document.getElementById('hunger-val');
    energyVal = document.getElementById('energy-val');
    selectedVal = document.getElementById('selected-val');
    invGrass = document.getElementById('inv-grass');
    invStone = document.getElementById('inv-stone');
    invWood = document.getElementById('inv-wood');
    invApple = document.getElementById('inv-apple');

    init();
    animate();
};

function init() {
    // 1. Scene, Camera, Renderer Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.FogExp2(0x87CEEB, 0.015);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.copy(player.position);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(20, 40, 20);
    scene.add(dirLight);

    // 3. World Generation (100x100 Base Floor)
    const floorGeo = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x3a5f0b });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(MAP_SIZE/2, 0, MAP_SIZE/2);
    scene.add(floor);

    // Spawn some initial structures/resources across the 100x100 grid
    for(let i=0; i<40; i++) {
        let rx = Math.floor(Math.random() * (MAP_SIZE - 10)) + 5;
        let rz = Math.floor(Math.random() * (MAP_SIZE - 10)) + 5;
        let type = Math.random() > 0.5 ? "Wood" : "Stone";
        spawnBlock(rx, 0.5, rz, type);
        if (type === "Wood") spawnBlock(rx, 1.5, rz, "Wood"); // Make trees taller
    }

    // 4. Mobs Setup (Zombies)
    for(let i=0; i<6; i++) {
        let rx = Math.floor(Math.random() * 80) + 10;
        let rz = Math.floor(Math.random() * 80) + 10;
        spawnMob(rx, rz);
    }

    // 5. Pointer Lock Event Handling
    window.addEventListener('resize', onWindowResize);
    blocker.addEventListener('click', () => {
        blocker.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === blocker) {
            blocker.style.display = 'none';
            isLocked = true;
        } else {
            blocker.style.display = 'flex';
            isLocked = false;
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isLocked) return;
        camera.rotation.y -= e.movementX * 0.0025;
        camera.rotation.x -= e.movementY * 0.0025;
        camera.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, camera.rotation.x));
    });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);

    camera.rotation.order = "YXZ";
    updateUI();
}

function spawnBlock(x, y, z, type) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshLambertMaterial({ color: blockColors[type] });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.userData = { type: type };
    scene.add(mesh);
    blocks.push(mesh);
}

function spawnMob(x, z) {
    const geo = new THREE.BoxGeometry(1, 2, 1);
    const mat = new THREE.MeshLambertMaterial({ color: 0xff00ff }); // Magenta
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 1, z);
    scene.add(mesh);
    mobs.push(mesh);
}

// Controls & Core Actions
function onKeyDown(e) {
    switch (e.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space': 
            if (player.canJump && isLocked) {
                player.velocity.y += 7;
                player.canJump = false;
            }
            break;
        case 'Digit1': currentBlockIndex = 0; updateUI(); break;
        case 'Digit2': currentBlockIndex = 1; updateUI(); break;
        case 'Digit3': currentBlockIndex = 2; updateUI(); break;
        
        case 'KeyE': // EAT
            if (inventory.Apple > 0) {
                inventory.Apple--;
                player.hunger = Math.min(100, player.hunger + 30);
                player.health = Math.min(100, player.health + 15);
                updateUI();
            }
            break;
        case 'KeyR': // SLEEP
            if (player.energy < 50) {
                player.energy = 100;
                player.hunger = Math.max(10, player.hunger - 25);
                updateUI();
            }
            break;
        case 'KeyC': // CRAFTING
            if (inventory.Wood >= 2) {
                inventory.Wood -= 2;
                inventory.Stone += 1;
                updateUI();
            }
            break;
    }
}

function onKeyUp(e) {
    switch (e.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
    }
}

function onMouseDown(e) {
    if (!isLocked) return;
    
    raycaster.setFromCamera(mouseCenter, camera);
    let intersects = raycaster.intersectObjects(blocks);

    if (intersects.length > 0 && intersects.distance < 6) {
        let hitObject = intersects.object;
        
        if (e.button === 0) { // LEFT CLICK: MINE
            inventory[hitObject.userData.type]++;
            scene.remove(hitObject);
            blocks = blocks.filter(b => b !== hitObject);
            updateUI();
        } 
        else if (e.button === 2) { // RIGHT CLICK: PLACE
            let selectedType = blockTypes[currentBlockIndex];
            if (inventory[selectedType] > 0) {
                let normal = intersects.face.normal;
                let newPos = hitObject.position.clone().add(normal);
                spawnBlock(newPos.x, newPos.y, newPos.z, selectedType);
                inventory[selectedType]--;
                updateUI();
            }
        }
    }
}

function updateUI() {
    if (!hpVal) return;
    hpVal.innerText = Math.floor(player.health);
    hungerVal.innerText = Math.floor(player.hunger);
    energyVal.innerText = Math.floor(player.energy);
    selectedVal.innerText = blockTypes[currentBlockIndex].toUpperCase();
    invGrass.innerText = inventory.Grass;
    invStone.innerText = inventory.Stone;
    invWood.innerText = inventory.Wood;
    invApple.innerText = inventory.Apple;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Core Loop Calculations
function animate() {
    requestAnimationFrame(animate);

    if (isLocked) {
        let delta = clock.getDelta();
        if (delta > 0.1) delta = 0.1;

        player.hunger -= 0.6 * delta;
        player.energy -= 0.4 * delta;
        if(player.hunger <= 0) {
            player.hunger = 0;
            player.health -= 4 * delta;
        }

        mobs.forEach(mob => {
            let dir = new THREE.Vector3().subVectors(camera.position, mob.position);
            dir.y = 0;
            dir.normalize();
            mob.position.addScaledVector(dir, 2.5 * delta);

            let dist = mob.position.distanceTo(camera.position);
            if(dist < 1.3) {
                player.health -= 15 * delta;
            }
        });

        player.velocity.x -= player.velocity.x * 10.0 * delta;
        player.velocity.z -= player.velocity.z * 10.0 * delta;
        player.velocity.y -= 9.8 * 2.0 * delta;

        let direction = new THREE.Vector3();
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) player.velocity.z -= direction.z * 40.0 * delta;
        if (moveLeft || moveRight) player.velocity.x -= direction.x * 40.0 * delta;

        camera.moveRight(-player.velocity.x * delta);
        camera.moveForward(-player.velocity.z * delta);
        camera.position.y += player.velocity.y * delta;

        if (camera.position.y < 1.6) {
            player.velocity.y = 0;
            camera.position.y = 1.6;
            player.canJump = true;
        }

        if (camera.position.x < 0) camera.position.x = 0;
        if (camera.position.x > MAP_SIZE) camera.position.x = MAP_SIZE;
