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
