
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const TILE = 30;
const COLS = 100;
const ROWS = 60;

const BLOCKS = {
  0: { name: "Air", color: "transparent" },
  1: { name: "Grass", color: "#65b844" },
  2: { name: "Dirt", color: "#936037" },
  3: { name: "Stone", color: "#858b91" },
  4: { name: "Wood", color: "#80502b" },
  5: { name: "Leaves", color: "#27843d" },
  6: { name: "Coal", color: "#30343a" },
  7: { name: "Iron", color: "#c5a48b" },
  8: { name: "Diamond", color: "#48e3ed" }
};

const HOTBAR = [2, 3, 4, 5, 6, 7];
let world = [];
let surface = [];
let animals = [];
let keys = {};
let selected = 0;
let inventory = {};
let cameraX = 0;
let cameraY = 0;
let day = 1;
let jumpHeld = false;

const player = {
  x: 100,
  y: 100,
  w: 20,
  h: 27,
  vx: 0,
  vy: 0,
  speed: 3.5,
  onGround: false
};

function resetInventory() {
  inventory = {
    2: 20,
    3: 10,
    4: 10,
    5: 0,
    6: 0,
    7: 0,
    8: 0
  };
}

function generateWorld() {
  world = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(0)
  );

  surface = [];
  animals = [];
  day = 1;

  let height = 11;

  for (let x = 0; x < COLS; x++) {
    height += Math.floor(Math.random() * 3) - 1;
    height = Math.max(7, Math.min(17, height));
    surface[x] = height;

    for (let y = height; y < ROWS; y++) {
      if (y === height) {
        world[y][x] = 1;
      } else if (y < height + 4) {
        world[y][x] = 2;
      } else {
        world[y][x] = 3;
      }
    }
  }

  // Trees
  for (let x = 4; x < COLS - 4; x++) {
    if (Math.random() < 0.10) {
      const ground = surface[x];

      for (let y = ground - 1; y >= ground - 4; y--) {
        if (y >= 0) world[y][x] = 4;
      }

      for (let dy = -2; dy <= 1; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const tx = x + dx;
          const ty = ground - 4 + dy;

          if (
            tx >= 0 && tx < COLS &&
            ty >= 0 && ty < ROWS &&
            world[ty][tx] === 0 &&
            Math.random() > 0.12
          ) {
            world[ty][tx] = 5;
          }
        }
      }
    }
  }

  // Underground ores
  for (let i = 0; i < 240; i++) {
    const x = Math.floor(Math.random() * COLS);
    const y = surface[x] + 4 +
      Math.floor(Math.random() * (ROWS - surface[x] - 5));

    const r = Math.random();
    world[y][x] = r < 0.65 ? 6 : r < 0.93 ? 7 : 8;
  }

  // Spawn sheep and pigs
  for (let i = 0; i < 14; i++) {
    const x = 5 + Math.floor(Math.random() * (COLS - 10));
    animals.push({
      x: x * TILE + 4,
      y: surface[x] * TILE - 18,
      w: 23,
      h: 18,
      type: Math.random() < 0.65 ? "sheep" : "pig",
      dir: Math.random() < 0.5 ? -1 : 1,
      speed: 0.3 + Math.random() * 0.6,
      phase: Math.random() * 10
    });
  }

  player.x = 100;
  player.y = surface[3] * TILE - player.h;
  player.vx = 0;
  player.vy = 0;

  resetInventory();
  updateInventory();
}

function solidAt(px, py) {
  const x = Math.floor(px / TILE);
  const y = Math.floor(py / TILE);

  if (x < 0 || x >= COLS || y >= ROWS) return true;
  if (y < 0) return false;

  return world[y][x] !== 0;
}

function movePlayer() {
  player.vx = 0;

  if (keys["a"] || keys["arrowleft"]) {
    player.vx = -player.speed;
  }

  if (keys["d"] || keys["arrowright"]) {
    player.vx = player.speed;
  }

  // Horizontal collision
  player.x += player.vx;

  if (player.vx > 0 &&
      (solidAt(player.x + player.w, player.y + 2) ||
       solidAt(player.x + player.w, player.y + player.h - 2))) {
    player.x = Math.floor((player.x + player.w) / TILE) *
      TILE - player.w - 0.01;
  }

  if (player.vx < 0 &&
      (solidAt(player.x, player.y + 2) ||
       solidAt(player.x, player.y + player.h - 2))) {
    player.x = (Math.floor(player.x / TILE) + 1) * TILE;
  }

  // Gravity
  player.vy += 0.45;
  player.vy = Math.min(player.vy, 11);
  player.onGround = false;

  player.y += player.vy;

  // Vertical collision
  if (player.vy >= 0 &&
      (solidAt(player.x + 2, player.y + player.h) ||
       solidAt(player.x + player.w - 2, player.y + player.h))) {
    player.y = Math.floor(
      (player.y + player.h) / TILE
    ) * TILE - player.h;
    player.vy = 0;
    player.onGround = true;
  } else if (
    player.vy < 0 &&
    (solidAt(player.x + 2, player.y) ||
     solidAt(player.x + player.w - 2, player.y))
  ) {
    player.y = (Math.floor(player.y / TILE) + 1) * TILE;
    player.vy = 0;
  }

  player.x = Math.max(
    0,
    Math.min(COLS * TILE - player.w, player.x)
  );

  player.y = Math.min(
    ROWS * TILE - player.h,
    player.y
  );
}

function jump() {
  if (player.onGround) {
    player.vy = -9.5;
    player.onGround = false;
  }
}

function updateCamera() {
  cameraX = player.x + player.w / 2 - canvas.width / 2;
  cameraY = player.y + player.h / 2 - canvas.height / 2;

  cameraX = Math.max(
    0,
    Math.min(COLS * TILE - canvas.width, cameraX)
  );

  cameraY = Math.max(
    0,
    Math.min(ROWS * TILE - canvas.height, cameraY)
  );
}

function drawBlock(id, x, y) {
  if (id === 0) return;

  const px = x * TILE - cameraX;
  const py = y * TILE - cameraY;

  ctx.fillStyle = BLOCKS[id].color;
  ctx.fillRect(px, py, TILE, TILE);

  // Pixel-style details
  if (id === 1) {
    ctx.fillStyle = "#378b31";
    ctx.fillRect(px, py, TILE, 6);
    ctx.fillStyle = "#81552e";
    ctx.fillRect(px, py + 6, TILE, TILE - 6);
    ctx.fillStyle = "#65b844";
    ctx.fillRect(px, py, TILE, 4);
  }

  if (id === 2) {
    ctx.fillStyle = "#b07b48";
    ctx.fillRect(px + 5, py + 8, 5, 4);
    ctx.fillRect(px + 20, py + 20, 4, 4);
  }

  if (id === 3) {
    ctx.fillStyle = "#aeb4ba";
    ctx.fillRect(px + 5, py + 6, 7, 4);
    ctx.fillRect(px + 17, py + 19, 6, 5);
    ctx.fillStyle = "#696f75";
    ctx.fillRect(px + 3, py + 20, 5, 3);
  }

  if (id === 4) {
    ctx.fillStyle = "#a16a37";
    ctx.fillRect(px + 7, py, 4, TILE);
    ctx.fillRect(px + 21, py, 3, TILE);
  }

  if (id === 5) {
    ctx.fillStyle = "#43a94e";
    ctx.fillRect(px + 4, py + 5, 8, 6);
    ctx.fillRect(px + 17, py + 18, 7, 6);
  }

  if (id === 6) {
    ctx.fillStyle = "#171a1e";
    ctx.fillRect(px + 4, py + 6, 9, 8);
    ctx.fillRect(px + 17, py + 18, 8, 7);
  }

  if (id === 7) {
    ctx.fillStyle = "#e5c7ad";
    ctx.fillRect(px + 4, py + 6, 9, 7);
    ctx.fillRect(px + 18, py + 19, 7, 6);
  }

  if (id === 8) {
    ctx.fillStyle = "#c0ffff";
    ctx.fillRect(px + 5, py + 5, 8, 8);
    ctx.fillRect(px + 18, py + 18, 7, 7);
  }

  ctx.strokeStyle = "rgba(0,0,0,0.13)";
  ctx.strokeRect(px, py, TILE, TILE);
}

function drawAnimal(a) {
  const x = a.x - cameraX;
  const y = a.y - cameraY;

  if (a.type === "sheep") {
    ctx.fillStyle = "#f2f0e8";
    ctx.fillRect(x + 2, y + 2, 19, 12);
    ctx.fillRect(x, y + 5, 6, 9);
    ctx.fillStyle = "#e0ddd3";
    ctx.fillRect(x + 6, y, 9, 4);
  } else {
    ctx.fillStyle = "#e68a91";
    ctx.fillRect(x + 1, y + 5, 21, 10);
    ctx.fillRect(x + 3, y + 2, 8, 5);
    ctx.fillRect(x + 17, y + 2, 5, 5);
  }

  // Head and eye
  ctx.fillStyle = a.type === "sheep" ? "#f0d8c2" : "#f0a1a1";
  ctx.fillRect(x + 16, y + 3, 8, 9);

  ctx.fillStyle = "#222";
  ctx.fillRect(x + 21, y + 5, 2, 2);

  // Legs
  ctx.fillStyle = "#493b32";
  ctx.fillRect(x + 5, y + 13, 4, 5);
  ctx.fillRect(x + 16, y + 13, 4, 5);
}

function drawPlayer() {
  const x = player.x - cameraX;
  const y = player.y - cameraY;

  // Body
  ctx.fillStyle = "#2878d0";
  ctx.fillRect(x + 3, y + 10, 14, 11);

  // Head
  ctx.fillStyle = "#e6b38a";
  ctx.fillRect(x + 3, y, 14, 11);

  // Hair
  ctx.fillStyle = "#633d26";
  ctx.fillRect(x + 2, y, 16, 4);

  // Eye
  ctx.fillStyle = "#222";
  ctx.fillRect(x + 13, y + 5, 2, 2);

  // Legs
  ctx.fillStyle = "#38465e";
  ctx.fillRect(x + 4, y + 21, 5, 6);
  ctx.fillRect(x + 11, y + 21, 5, 6);
}

function drawWorld() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#69c5ff");
  sky.addColorStop(1, "#d3f1ff");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Sun
  ctx.fillStyle = "#fff1a3";
  ctx.beginPath();
  ctx.arc(800 - cameraX * 0.08, 75, 27, 0, Math.PI * 2);
  ctx.fill();

  const startX = Math.max(0, Math.floor(cameraX / TILE));
  const endX = Math.min(
    COLS,
    Math.ceil((cameraX + canvas.width) / TILE) + 1
  );

  const startY = Math.max(0, Math.floor(cameraY / TILE));
  const endY = Math.min(
    ROWS,
    Math.ceil((cameraY + canvas.height) / TILE) + 1
  );

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      drawBlock(world[y][x], x, y);
    }
  }

  animals.forEach(drawAnimal);
  drawPlayer();

  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(10, 10, 180, 30);
  ctx.fillStyle = "white";
  ctx.font = "14px Arial";
  ctx.fillText("World: Mini Minecraft", 20, 30);

  document.getElementById("position").textContent =
    `Position: ${Math.floor(player.x / TILE)}, ` +
    `${Math.floor(player.y / TILE)}`;
}

function updateAnimals() {
  for (const a of animals) {
    a.phase += 0.04;

    if (Math.random() < 0.005) {
      a.dir *= -1;
    }

    a.x += a.dir * a.speed;

    const tx = Math.floor((a.x + a.w / 2) / TILE);
    const nextX = Math.floor(
      (a.x + a.dir * 4 + a.w / 2) / TILE
    );

    if (
      nextX < 0 || nextX >= COLS ||
      world[surface[Math.max(0, Math.min(COLS - 1, nextX))]][
        Math.max(0, Math.min(COLS - 1, nextX))
      ] === 0
    ) {
      a.dir *= -1;
    }

    const groundX = Math.max(0, Math.min(COLS - 1, tx));
    a.y = surface[groundX] * TILE - a.h;
  }
}

function updateInventory() {
  const items = document.getElementById("items");
  items.innerHTML = "";

  HOTBAR.forEach((id, index) => {
    const button = document.createElement("button");
    button.className = "slot" +
      (selected === index ? " selected" : "");

    button.textContent =
      `${index + 1}. ${BLOCKS[id].name} (${inventory[id] || 0})`;

    button.addEventListener("click", () => {
      selected = index;
      updateInventory();
    });

    items.appendChild(button);
  });
}

function getTarget(event) {
  const rect = canvas.getBoundingClientRect();

  const screenX =
    (event.clientX - rect.left) * canvas.width / rect.width;
  const screenY =
    (event.clientY - rect.top) * canvas.height / rect.height;

  return {
    x: Math.floor((screenX + cameraX) / TILE),
    y: Math.floor((screenY + cameraY) / TILE)
  };
}

function withinReach(x, y) {
  const px = player.x + player.w / 2;
  const py = player.y + player.h / 2;

  const bx = x * TILE + TILE / 2;
  const by = y * TILE + TILE / 2;

  return Math.hypot(px - bx, py - by) <= TILE * 5;
}

canvas.addEventListener("contextmenu", event => {
  event.preventDefault();
});

canvas.addEventListener("pointerdown", event => {
  const { x, y } = getTarget(event);

  if (
    x < 0 || x >= COLS ||
    y < 0 || y >= ROWS ||
    !withinReach(x, y)
  ) return;

  if (event.button === 2) {
    // Place a block
    const id = HOTBAR[selected];

    if (world[y][x] !== 0 || inventory[id] <= 0) return;

    const bx = x * TILE;
    const by = y * TILE;

    // Don't place blocks inside the player
    const overlapsPlayer =
      bx < player.x + player.w &&
      bx + TILE > player.x &&
      by < player.y + player.h &&
      by + TILE > player.y;

    if (overlapsPlayer) return;

    world[y][x] = id;
    inventory[id]--;
    updateInventory();
  } else if (event.button === 0) {
    // Mine a block
    const id = world[y][x];

    if (id === 0) return;

    inventory[id] = (inventory[id] || 0) + 1;
    world[y][x] = 0;

    // Grass and dirt drop dirt; ores drop themselves
    if (id === 1) {
      inventory[2]++;
    }

    updateInventory();
  }
});

window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if ([
    "arrowleft", "arrowright", "arrowup",
    " ", "arrowdown"
  ].includes(key)) {
    event.preventDefault();
  }

  keys[key] = true;

  if (
    (key === "w" || key === "arrowup" || key === " ") &&
    !jumpHeld
  ) {
    jump();
    jumpHeld = true;
  }

  if (key >= "1" && key <= "6") {
    selected = Number(key) - 1;
    updateInventory();
  }

  if (key === "r") {
    generateWorld();
  }
});

window.addEventListener("keyup", event => {
  keys[event.key.toLowerCase()] = false;

  if (
    event.key.toLowerCase() === "w" ||
    event.key === "ArrowUp" ||
    event.key === " "
  ) {
    jumpHeld = false;
  }
});

// Mobile controls
function bindHoldButton(id, key) {
  const button = document.getElementById(id);

  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    keys[key] = true;
    button.setPointerCapture(event.pointerId);
  });

  function release() {
    keys[key] = false;
  }

  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
}

bindHoldButton("left", "a");
bindHoldButton("right", "d");

document.getElementById("jump").addEventListener("pointerdown", event => {
  event.preventDefault();
  jump();
});

// Main game loop
function gameLoop() {
  movePlayer();
  updateAnimals();
  updateCamera();
  drawWorld();

  requestAnimationFrame(gameLoop);
}

generateWorld();
gameLoop();
canvas.addEventListener("pointerdown", event => {
  const { x, y } = getTarget(event);

  if (
    x < 0 || x >= COLS ||
    y < 0 || y >= ROWS
  ) return;

  const tool = HOTBAR[selected];

  // Right-click: place a block
  if (event.button === 2) {
    if (typeof tool !== "number") return;
    if (!withinReach(x, y)) return;

    const id = tool;

    if (world[y][x] !== 0 || inventory[id] <= 0) return;

    const bx = x * TILE;
    const by = y * TILE;

    const overlapsPlayer =
      bx < player.x + player.w &&
      bx + TILE > player.x &&
      by < player.y + player.h &&
      by + TILE > player.y;

    if (overlapsPlayer) return;

    world[y][x] = id;
    inventory[id]--;
    updateInventory();
  }

  // Left-click: use the selected tool
  if (event.button === 0) {
    if (tool === "sword") {
      // Attack the closest animal in range
      const targetX = x * TILE + TILE / 2;
      const targetY = y * TILE + TILE / 2;

      const animal = animals.find(a => {
        const ax = a.x + a.w / 2;
        const ay = a.y + a.h / 2;

        return Math.hypot(ax - targetX, ay - targetY) < 40 &&
          Math.hypot(
            ax - (player.x + player.w / 2),
            ay - (player.y + player.h / 2)
          ) < TILE * 3;
      });

      if (animal) {
        animal.hp--;

        if (animal.hp <= 0) {
          animals = animals.filter(a => a !== animal);
        }
      }

      return;
    }

    // Only the pickaxe mines blocks
    if (tool !== "pickaxe") return;
    if (!withinReach(x, y)) return;

    const id = world[y][x];
    if (id === 0) return;

    world[y][x] = 0;

    if (id === 1) {
      inventory[2] = (inventory[2] || 0) + 1;
    } else {
      inventory[id] = (inventory[id] || 0) + 1;
    }

    updateInventory();
  }
});
const HOTBAR = [
  "pickaxe", "sword",
  2, 3, 4, 5, 6, 7, 8
];

const TOOL_NAMES = {
  pickaxe: "⛏️ Pickaxe",
  sword: "⚔️ Sword"
};
// Animal health bar
ctx.fillStyle = "#333";
ctx.fillRect(x, y - 7, 24, 4);

ctx.fillStyle = "#ef4444";
ctx.fillRect(x, y - 7, 24, 4);

ctx.fillStyle = "#22c55e";
ctx.fillRect(x, y - 7, 24 * (a.hp / 3), 4);
if (key >= "1" && key <= "6") {
  selected = Number(key) - 1;
  updateInventory();
}
function drawZombie(z) {
  const x = z.x - cameraX;
  const y = z.y - cameraY;

  // Green head
  ctx.fillStyle = "#579447";
  ctx.fillRect(x + 3, y, 14, 11);

  // Blue shirt
  ctx.fillStyle = "#2678ad";
  ctx.fillRect(x + 2, y + 11, 16, 10);

  // Dark pants
  ctx.fillStyle = "#303653";
  ctx.fillRect(x + 3, y + 21, 5, 6);
  ctx.fillRect(x + 12, y + 21, 5, 6);

  // Eyes
  ctx.fillStyle = "#f5eeee";
  ctx.fillRect(x + 5, y + 4, 3, 3);
  ctx.fillRect(x + 13, y + 4, 3, 3);

  // Health bar
  ctx.fillStyle = "#222";
  ctx.fillRect(x, y - 7, z.w, 4);
  ctx.fillStyle = "#ef3333";
  ctx.fillRect(x, y - 7, z.w * Math.max(0, z.hp / 5), 4);
}
