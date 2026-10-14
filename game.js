```javascript
// =====================================================
// MINECRAFT JAVASCRIPT EDITION
// =====================================================


// =====================================================
// MENU
// =====================================================

const menu =
    document.getElementById("menu");

const game =
    document.getElementById("game");

const playButton =
    document.getElementById("playButton");

const worldName =
    document.getElementById("worldName");

const errorText =
    document.getElementById("error");

const worldTitle =
    document.getElementById("worldTitle");

let gameStarted = false;


// =====================================================
// THREE.JS
// =====================================================

let scene;
let camera;
let renderer;
let clock;


// =====================================================
// PLAYER
// =====================================================

const player = {

    x: 0,
    y: 5,
    z: 0,

    width: 0.6,
    height: 1.8,

    speed: 5,

    velocityY: 0,

    grounded: false,

    health: 100,
    hunger: 100,

    sleeping: false
};


// =====================================================
// WORLD
// =====================================================

const WORLD_SIZE = 32;

const blocks = new Map();

const meshes = [];


// Block IDs
const AIR = 0;
const GRASS = 1;
const DIRT = 2;
const STONE = 3;
const WOOD = 4;
const LEAVES = 5;
const BED = 6;


// =====================================================
// BLOCK MAP
// =====================================================

function blockKey(x, y, z) {

    return `${x},${y},${z}`;
}


function getBlock(x, y, z) {

    return (
        blocks.get(
            blockKey(x, y, z)
        ) || AIR
    );
}


function setBlock(x, y, z, type) {

    const key =
        blockKey(x, y, z);

    if (type === AIR) {

        blocks.delete(key);

    } else {

        blocks.set(key, type);
    }
}


// =====================================================
// FIND GROUND
// =====================================================

function findGround(x, z) {

    for (let y = 20; y >= 0; y--) {

        if (
            getBlock(x, y, z)
            !== AIR
        ) {
            return y;
        }
    }

    return 0;
}


// =====================================================
// MATERIALS
// =====================================================

let materials;
let cubeGeometry;


function createMaterials() {

    materials = {

        grass:
            new THREE.MeshLambertMaterial({
                color: 0x55aa35
            }),

        dirt:
            new THREE.MeshLambertMaterial({
                color: 0x79502c
            }),

        stone:
            new THREE.MeshLambertMaterial({
                color: 0x777777
            }),

        wood:
            new THREE.MeshLambertMaterial({
                color: 0x8b5a2b
            }),

        leaves:
            new THREE.MeshLambertMaterial({
                color: 0x2f8f32,
                transparent: true,
                opacity: .9
            }),

        bed:
            new THREE.MeshLambertMaterial({
                color: 0xb83232
            })
    };

    cubeGeometry =
        new THREE.BoxGeometry(
            1,
            1,
            1
        );
}


// =====================================================
// MATERIAL SELECTOR
// =====================================================

function getMaterial(type) {

    if (type === GRASS)
        return materials.grass;

    if (type === DIRT)
        return materials.dirt;

    if (type === STONE)
        return materials.stone;

    if (type === WOOD)
        return materials.wood;

    if (type === LEAVES)
        return materials.leaves;

    if (type === BED)
        return materials.bed;

    return materials.dirt;
}


// =====================================================
// CREATE BLOCK
// =====================================================

function createBlockMesh(
    x,
    y,
    z,
    type
) {

    const mesh =
        new THREE.Mesh(
            cubeGeometry,
            getMaterial(type)
        );

    mesh.position.set(
        x + .5,
        y + .5,
        z + .5
    );

    mesh.userData = {
        x,
        y,
        z,
        type
    };

    scene.add(mesh);

    meshes.push(mesh);
}


// =====================================================
// REBUILD BLOCKS
// =====================================================

function rebuildMeshes() {

    for (const mesh of meshes) {

        scene.remove(mesh);
    }

    meshes.length = 0;

    for (
        const [key, type]
        of blocks
    ) {

        const [
            x,
            y,
            z
        ] =
            key
                .split(",")
                .map(Number);

        createBlockMesh(
            x,
            y,
            z,
            type
        );
    }
}


// =====================================================
// WORLD GENERATOR
// =====================================================

function generateWorld() {

    blocks.clear();

    for (
        let x = -WORLD_SIZE / 2;
        x < WORLD_SIZE / 2;
        x++
    ) {

        for (
            let z = -WORLD_SIZE / 2;
            z < WORLD_SIZE / 2;
            z++
        ) {

            const height =
                2 +
                Math.floor(
                    Math.sin(x * .35) +
                    Math.cos(z * .25)
                );

            for (
                let y = 0;
                y <= height;
                y++
            ) {

                if (y === height) {

                    setBlock(
                        x,
                        y,
                        z,
                        GRASS
                    );

                } else if (
                    y >= height - 2
                ) {

                    setBlock(
                        x,
                        y,
                        z,
                        DIRT
                    );

                } else {

                    setBlock(
                        x,
                        y,
                        z,
                        STONE
                    );
                }
            }
        }
    }


    // =================================================
    // TREES
    // =================================================

    for (let i = 0; i < 10; i++) {

        const x =
            Math.floor(
                Math.random() * 24
            ) - 12;

        const z =
            Math.floor(
                Math.random() * 24
            ) - 12;

        const ground =
            findGround(x, z);

        for (
            let y = 1;
            y <= 4;
            y++
        ) {

            setBlock(
                x,
                ground + y,
                z,
                WOOD
            );
        }

        for (
            let lx = -2;
            lx <= 2;
            lx++
        ) {

            for (
                let lz = -2;
                lz <= 2;
                lz++
            ) {

                for (
                    let ly = 3;
                    ly <= 5;
                    ly++
                ) {

                    if (
                        Math.abs(lx) +
                        Math.abs(lz) < 4
                    ) {

                        setBlock(
                            x + lx,
                            ground + ly,
                            z + lz,
                            LEAVES
                        );
                    }
                }
            }
        }
    }


    // =================================================
    // BED
    // =================================================

    const bedX = 3;
    const bedZ = 3;

    const bedY =
        findGround(
            bedX,
            bedZ
        ) + 1;

    setBlock(
        bedX,
        bedY,
        bedZ,
        BED
    );


    rebuildMeshes();
}


// =====================================================
// START GAME
// =====================================================

function startGame() {

    let name =
        worldName.value.trim();

    if (!name) {

        errorText.textContent =
            "Enter a world name.";

        return;
    }

    if (gameStarted)
        return;

    gameStarted = true;

    worldTitle.textContent =
        name;

    menu.style.display =
        "none";

    game.style.display =
        "block";


    // Three.js scene
    scene =
        new THREE.Scene();

    scene.background =
        new THREE.Color(
            0x87ceeb
        );

    scene.fog =
        new THREE.Fog(
            0x87ceeb,
            20,
            60
        );


    // Camera
    camera =
        new THREE.PerspectiveCamera(
            75,
            window.innerWidth /
            window.innerHeight,
            .1,
            1000
        );


    // Renderer
    renderer =
        new THREE.WebGLRenderer({
            antialias: false
        });

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio,
            2
        )
    );

    document.body.appendChild(
        renderer.domElement
    );


    // Clock
    clock =
        new THREE.Clock();


    // Lights
    const ambient =
        new THREE.HemisphereLight(
            0xbde7ff,
            0x554433,
            1.5
        );

    scene.add(ambient);


    const sun =
        new THREE.DirectionalLight(
            0xffffff,
            1.5
        );

    sun.position.set(
        20,
        30,
        10
    );

    scene.add(sun);


    createMaterials();

    generateWorld();


    // Spawn above ground
    player.x = 0;
    player.z = 0;

    player.y =
        findGround(0, 0) + 1.01;


    updateHUD();

    animate();
}


// =====================================================
// KEYBOARD
// =====================================================

const keys = {};

document.addEventListener(
    "keydown",
    event => {

        keys[event.code] = true;

        if (
            event.code === "Space"
        ) {
            event.preventDefault();
        }

        if (
            event.code === "KeyE"
        ) {
            eat();
        }

        if (
            event.code === "KeyF"
        ) {
            sleep();
        }
    }
);


document.addEventListener(
    "keyup",
    event => {

        keys[event.code] = false;
    }
);


// =====================================================
// MOUSE LOOK
// =====================================================

let yaw = 0;
let pitch = 0;

let locked = false;


document.addEventListener(
    "pointerlockchange",
    () => {

        locked =
            document.pointerLockElement
            === renderer?.domElement;
    }
);


document.addEventListener(
    "mousemove",
    event => {

        if (!locked)
            return;

        yaw -=
            event.movementX * .002;

        pitch -=
            event.movementY * .002;

        pitch =
            Math.max(
                -1.5,
                Math.min(
                    1.5,
                    pitch
                )
            );
    }
);


// =====================================================
// POINTER LOCK
// =====================================================

document.addEventListener(
    "click",
    () => {

        if (
            gameStarted &&
            renderer &&
            !locked
        ) {

            renderer.domElement
                .requestPointerLock();
        }
    }
);


// =====================================================
// COLLISION
// =====================================================

function collides(
    x,
    y,
    z
) {

    const radius = .3;

    const minX =
        Math.floor(
            x - radius
        );

    const maxX =
        Math.floor(
            x + radius
        );

    const minY =
        Math.floor(y);

    const maxY =
        Math.floor(
            y + player.height
        );

    const minZ =
        Math.floor(
            z - radius
        );

    const maxZ =
        Math.floor(
            z + radius
        );


    for (
        let bx = minX;
        bx <= m
```

/*
  Crafting System
  Add this to your existing JavaScript game.
*/

// Player inventory
const inventory = {
    wood: 0,
    sticks: 0,
    cobblestone: 0,
    diamonds: 0,
    crafting_table: 0,
    wooden_pickaxe: 0,
    diamond_pickaxe: 0,
    diamond_sword: 0
};

// Recipes: ingredients required for each item
const recipes = {
    crafting_table: {
        ingredients: { wood: 4 },
        result: { crafting_table: 1 }
    },

    wooden_pickaxe: {
        ingredients: { wood: 3, sticks: 2 },
        result: { wooden_pickaxe: 1 }
    },

    diamond_pickaxe: {
        ingredients: { diamonds: 3, sticks: 2 },
        result: { diamond_pickaxe: 1 }
    },

    diamond_sword: {
        ingredients: { diamonds: 2, sticks: 1 },
        result: { diamond_sword: 1 }
    }
};

// Set to true only while using a crafting table
let craftingTableOpen = false;

// Open crafting table
function openCraftingTable() {
    if (inventory.crafting_table <= 0) {
        console.log("You need a crafting table!");
        return;
    }

    craftingTableOpen = true;
    console.log("Crafting table opened!");
    console.log("Available recipes:", Object.keys(recipes));
}

// Close crafting table
function closeCraftingTable() {
    craftingTableOpen = false;
}

// Craft an item
function craftItem(itemName) {
    const recipe = recipes[itemName];

    if (!recipe) {
        console.log("Unknown recipe!");
        return false;
    }

    // Require the crafting table for every recipe
    if (!craftingTableOpen) {
        console.log("Open a crafting table first!");
        return false;
    }

    // Check ingredients
    for (const material in recipe.ingredients) {
        if ((inventory[material] || 0) < recipe.ingredients[material]) {
            console.log("Not enough " + material + "!");
            return false;
        }
    }

    // Remove ingredients
    for (const material in recipe.ingredients) {
        inventory[material] -= recipe.ingredients[material];
    }

    // Add crafted item
    for (const item in recipe.result) {
        inventory[item] = (inventory[item] || 0)
            + recipe.result[item];
    }

    console.log("Crafted " + itemName + "!");
    return true;
}

/*
  Right-click block placement
  Requires Three.js and an existing block raycaster.
*/

// Prevent the browser's right-click menu
renderer.domElement.addEventListener("contextmenu", (event) => {
    event.preventDefault();
});

// Selected block to place
let selectedBlock = "dirt";

// Example block inventory
// If you already have an inventory, use that instead.
const blockInventory = {
    dirt: 20,
    stone: 10,
    wood: 10,
    crafting_table: 1
};

// Change this to your existing block-placement function.
// It should create a block at the specified grid position.
function placeBlockAt(position, blockType) {
    // Replace this example with your game's block creation logic.
    console.log("Place", blockType, "at", position);
}

// Use your existing raycaster and block meshes here.
renderer.domElement.addEventListener("mousedown", (event) => {
    // Right mouse button only
    if (event.button !== 2) return;

    event.preventDefault();

    // Make sure the player has the selected block
    if (!blockInventory[selectedBlock] ||
        blockInventory[selectedBlock] <= 0) {
        console.log("You don't have any " + selectedBlock + "!");
        return;
    }

    // Convert mouse position to normalized device coordinates
    const rect = renderer.domElement.getBoundingClientRect();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Find the block the player is looking at
    raycaster.setFromCamera(mouse, camera);

    const hits = raycaster.intersectObjects(blockMeshes, false);

    if (hits.length === 0) return;

    const hit = hits[0];

    // Place the new block on the face being targeted
    const normal = hit.face.normal.clone()
        .transformDirection(hit.object.matrixWorld);

    const position = hit.object.position.clone()
        .add(normal);

    // Snap to the block grid
    position.set(
        Math.round(position.x),
        Math.round(position.y),
        Math.round(position.z)
    );

    // Only place blocks within 2 blocks of the player
    const distance = player.position.distanceTo(position);

    if (distance > 2) {
        console.log("That spot is too far away!");
        return;
    }

    // Don't place a block inside the player
    if (position.distanceTo(player.position) < 1) {
        console.log("You can't place a block inside yourself!");
        return;
    }

    // Create the block using your game's block function
    placeBlockAt(position, selectedBlock);

    // Consume one block
    blockInventory[selectedBlock]--;
});

document.addEventListener("keydown", (event) => {
    if (event.repeat) return;

    if (event.key === "1") {
        equipTool("wooden_pickaxe");
    }

    if (event.key === "2") {
        equipTool("diamond_pickaxe");
    }

    if (event.key === "3") {
        equipTool("stone_pickaxe");
    }

    if (event.key === "e") {
        openCraftingTable();
    }

    if (event.key === "Escape") {
        closeCraftingTable();
    }
});

function rightClickAction(x, y) {
  const target = world[y][x];

  // Right-click an apple to eat it.
  if (target.type === "apple") {
    if (player.hp >= player.maxHp) {
      return say("Your health is already full!");
    }

    player.hp = Math.min(player.maxHp, player.hp + 20);

    // Remove the apple from the world.
    world[y][x] = {
      type: "grass",
      hp: 2,
      maxHp: 2
    };

    say("You ate an apple and restored health!");
    draw();
    return;
  }

  // Right-click a bed to sleep.
  if (target.type === "bed") {
    player.hp = player.maxHp;

    say("You slept in the bed and restored your health!");
    draw();
    return;
  }

  say("Nothing to eat or sleep in here!");
}

const animals = [];

function spawnAnimal(type = "pig") {
  let x, y;

  do {
    x = Math.floor(Math.random() * COLS);
    y = Math.floor(Math.random() * ROWS);
  } while (
    Math.hypot(x - player.x, y - player.y) < 3 ||
    world[y][x].type !== "grass"
  );

  animals.push({
    type,
    x,
    y,
    hp: type === "cow" ? 14 : 10,
    maxHp: type === "cow" ? 14 : 10
  });
}

function spawnZombie() {
  let x, y;

  do {
    x = Math.floor(Math.random() * COLS);
    y = Math.floor(Math.random() * ROWS);
  } while (
    Math.hypot(x - player.x, y - player.y) < 5 ||
    world[y][x].type !== "grass"
  );

  mobs.push({
    type: "zombie",
    x,
    y,
    hp: 16,
    maxHp: 16
  });
}

// Spawn some creatures.
for (let i = 0; i < 4; i++) {
  spawnAnimal("pig");
  spawnAnimal("cow");
}

for (let i = 0; i < 3; i++) {
  spawnZombie();
}

function drawCreatures() {
  // Draw animals.
  for (const a of animals) {
    ctx.fillStyle = a.type === "cow" ? "#f1eee2" : "#ed9aaf";
    ctx.fillRect(a.x * TILE + 6, a.y * TILE + 9, 28, 23);

    // Animal face.
    ctx.fillStyle = "#292929";
    ctx.fillRect(a.x * TILE + 10, a.y * TILE + 12, 4, 4);
    ctx.fillRect(a.x * TILE + 25, a.y * TILE + 12, 4, 4);

    // Health bar.
    ctx.fillStyle = "#333";
    ctx.fillRect(a.x * TILE + 5, a.y * TILE + 2, 30, 4);
    ctx.fillStyle = "#64e35d";
    ctx.fillRect(
      a.x * TILE + 5, a.y * TILE + 2,
      30 * Math.max(0, a.hp / a.maxHp), 4
    );
  }

  // Draw zombies.
  for (const z of mobs) {
    if (z.type !== "zombie") continue;

    ctx.fillStyle = "#378c50";
    ctx.fillRect(z.x * TILE + 7, z.y * TILE + 5, 26, 30);

    ctx.fillStyle = "#171717";
    ctx.fillRect(z.x * TILE + 11, z.y * TILE + 12, 5, 5);
    ctx.fillRect(z.x * TILE + 24, z.y * TILE + 12, 5, 5);

    ctx.fillStyle = "#333";
    ctx.fillRect(z.x * TILE + 6, z.y * TILE, 28, 4);
    ctx.fillStyle = "#ff4747";
    ctx.fillRect(
      z.x * TILE + 6, z.y * TILE,
      28 * Math.max(0, z.hp / z.maxHp), 4
    );
  }
}
