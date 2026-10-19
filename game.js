const canvas = document.getElementById("game");

if (!canvas) {
  throw new Error("Game canvas was not found! Check index.html");
}

const ctx = canvas.getContext("2d");
"use strict";

// MINI MINECRAFT 2D — fresh game engine
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const inventoryElement = document.getElementById("items");

const TILE = 24;
const COLS = 180;
const ROWS = 36;
const GRAVITY = 0.55;

const BLOCKS = {
  1: { name: "Grass", color: "#64a344" },
  2: { name: "Dirt", color: "#87512f" },
  3: { name: "Stone", color: "#858585" },
  4: { name: "Wood", color: "#9a6537" },
  5: { name: "Leaves", color: "#328342" }
};

const HOTBAR = [
  "sword", "pickaxe", 1, 2, 3, 4, 5
];

let selected = 0;
let inventory = { 1: 20, 2: 30, 3: 20, 4: 10, 5: 10 };
let world = [];
let surface = [];
let animals = [];
let zombies = [];
let cameraX = 0;
let cameraY = 0;
let health = 10;
let invulnerable = 0;
let attackCooldown = 0;
let gameOver = false;
let lastTime = 0;
let keys = {};
let message = "";
let messageTimer = 0;

const player = {
  x: 0, y: 0, w: 17, h: 34,
  vx: 0, vy: 0,
  speed: 3.2, jump: -10,
  onGround: false,
  facing: 1
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function solid(tx, ty) {
  if (tx < 0 || tx >= COLS || ty >= ROWS) return true;
  if (ty < 0) return false;
  return world[ty][tx] !== 0;
}

function generateWorld() {
  world = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  surface = [];
  animals = [];
  zombies = [];

  let ground = 20;

  for (let x = 0; x < COLS; x++) {
    if (Math.random() < 0.35) ground += rand(-1, 1);
    ground = Math.max(12, Math.min(25, ground));
    surface[x] = ground;

    for (let y = ground; y < ROWS; y++) {
      if (y === ground) world[y][x] = 1;
      else if (y < ground + 4) world[y][x] = 2;
      else world[y][x] = Math.random() < 0.08 ? 0 : 3;
    }

    // Small trees
    if (x > 8 && Math.random() < 0.055) {
      for (let t = 1; t <= 3; t++) {
        if (ground - t >= 0) world[ground - t][x] = 4;
      }
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -5; dy <= -3; dy++) {
          const tx = x + dx;
          const ty = ground + dy;
          if (tx >= 0 && tx < COLS && ty >= 0 &&
              world[ty][tx] === 0 && Math.random() < 0.85) {
            world[ty][tx] = 5;
          }
        }
      }
    }
  }

  // Keep the starting area relatively flat and safe.
  for (let x = 0; x < 12; x++) {
    surface[x] = 20;
    for (let y = 20; y < ROWS; y++) {
      world[y][x] = y === 20 ? 1 : y < 24 ? 2 : 3;
    }
  }

  player.x = 4 * TILE;
  player.y = surface[4] * TILE - player.h;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.facing = 1;

  health = 10;
  invulnerable = 0;
  attackCooldown = 0;
  gameOver = false;

  // Spawn friendly animals.
  for (let i = 0; i < 14; i++) {
    const tx = rand(15, COLS - 5);
    animals.push({
      x: tx * TILE,
      y: surface[tx] * TILE - 19,
      w: 22, h: 19,
      hp: 3,
      type: Math.random() < 0.5 ? "sheep" : "pig",
      dir: Math.random() < 0.5 ? -1 : 1,
      speed: 0.35 + Math.random() * 0.5
    });
  }

  // Spawn hostile zombies.
  for (let i = 0; i < 10; i++) {
    const tx = rand(25, COLS - 5);
    zombies.push({
      x: tx * TILE,
      y: surface[tx] * TILE - 30,
      w: 20, h: 30,
      hp: 5,
      speed: 0.65 + Math.random() * 0.35,
      cooldown: rand(0, 40)
    });
  }

  updateInventory();
  say("New world generated!");
}

function say(text) {
  message = text;
  messageTimer = 100;
}

function updateInventory() {
  if (!inventoryElement) return;
  inventoryElement.innerHTML = "";

  HOTBAR.forEach((item, i) => {
    const button = document.createElement("button");
    button.className = "slot" + (i === selected ? " selected" : "");

    if (item === "sword") {
      button.textContent = (i + 1) + ". ⚔️ Sword";
    } else if (item === "pickaxe") {
      button.textContent = (i + 1) + ". ⛏️ Pickaxe";
    } else {
      button.textContent =
        (i + 1) + ". " + BLOCKS[item].name +
        " (" + (inventory[item] || 0) + ")";
    }

    button.addEventListener("click", () => {
      selected = i;
      updateInventory();
    });
    inventoryElement.appendChild(button);
  });
}

function movePlayer() {
  if (gameOver) return;

  if (keys.a || keys.ArrowLeft) {
    player.vx = -player.speed;
    player.facing = -1;
  } else if (keys.d || keys.ArrowRight) {
    player.vx = player.speed;
    player.facing = 1;
  } else {
    player.vx *= 0.72;
    if (Math.abs(player.vx) < 0.1) player.vx = 0;
  }

  if ((keys.w || keys.ArrowUp || keys[" "]) && player.onGround) {
    player.vy = player.jump;
    player.onGround = false;
  }

  player.vy = Math.min(player.vy + GRAVITY, 12);

  // Horizontal collision.
  player.x += player.vx;
  let left = Math.floor(player.x / TILE);
  let right = Math.floor((player.x + player.w - 1) / TILE);
  let top = Math.floor(player.y / TILE);
  let bottom = Math.floor((player.y + player.h - 1) / TILE);

  for (let ty = top; ty <= bottom; ty++) {
    if (player.vx > 0 && solid(right, ty)) {
      player.x = right * TILE - player.w;
      player.vx = 0;
    } else if (player.vx < 0 && solid(left, ty)) {
      player.x = (left + 1) * TILE;
      player.vx = 0;
    }
  }

  // Vertical collision.
  player.y += player.vy;
  left = Math.floor(player.x / TILE);
  right = Math.floor((player.x + player.w - 1) / TILE);
  top = Math.floor(player.y / TILE);
  bottom = Math.floor((player.y + player.h - 1) / TILE);
  player.onGround = false;

  for (let tx = left; tx <= right; tx++) {
    if (player.vy > 0 && solid(tx, bottom)) {
      player.y = bottom * TILE - player.h;
      player.vy = 0;
      player.onGround = true;
    } else if (player.vy < 0 && solid(tx, top)) {
      player.y = (top + 1) * TILE;
      player.vy = 0;
    }
  }

  if (player.y > ROWS * TILE) {
    hurtPlayer(2);
    player.y = 0;
  }
}

function hurtPlayer(amount) {
  if (invulnerable > 0 || gameOver) return;

  health = Math.max(0, health - amount);
  invulnerable = 55;
  say("Ouch! -" + amount + " health");

  if (health <= 0) {
    gameOver = true;
    say("You were defeated! Press R to respawn.");
  }
}

function updateMobs() {
  for (const a of animals) {
    const dx = player.x - a.x;
    if (Math.random() < 0.01) a.dir = rand(0, 1) ? 1 : -1;

    if (Math.abs(dx) < TILE * 3 && Math.random() < 0.03) {
      a.dir = dx > 0 ? -1 : 1;
    }

    const nextX = a.x + a.dir * a.speed;
    const tx = Math.floor((nextX + (a.dir > 0 ? a.w : 0)) / TILE);
    const gy = Math.min(ROWS - 1, Math.floor((a.y + a.h + 2) / TILE));

    if (!solid(tx, gy) && nextX > 0 && nextX < COLS * TILE - a.w) {
      a.x = nextX;
    }

    const groundX = Math.max(0, Math.min(COLS - 1,
      Math.floor((a.x + a.w / 2) / TILE)));
    a.y = surface[groundX] * TILE - a.h;
  }

  for (const z of zombies) {
    const dx = player.x - z.x;
    const distance = Math.abs(dx);

    if (distance < TILE * 14 && distance > 2 && !gameOver) {
      const dir = Math.sign(dx);
      const nextX = z.x + dir * z.speed;
      const tx = Math.floor((nextX + (dir > 0 ? z.w : 0)) / TILE);
      const gy = Math.min(ROWS - 1,
        Math.floor((z.y + z.h + 2) / TILE));

      if (!solid(tx, gy) && nextX >= 0 &&
          nextX < COLS * TILE - z.w) {
        z.x = nextX;
      }
    }

    const gx = Math.max(0, Math.min(COLS - 1,
      Math.floor((z.x + z.w / 2) / TILE)));
    z.y = surface[gx] * TILE - z.h;

    if (z.cooldown > 0) z.cooldown--;

    const touching =
      player.x < z.x + z.w &&
      player.x + player.w > z.x &&
      player.y < z.y + z.h &&
      player.y + player.h > z.y;

    if (touching && z.cooldown <= 0 && !gameOver) {
      hurtPlayer(1);
      z.cooldown = 55;
    }
  }
}

function getTarget(event) {
  const rect = canvas.getBoundingClientRect();
  const sx = (event.clientX - rect.left) * canvas.width / rect.width;
  const sy = (event.clientY - rect.top) * canvas.height / rect.height;

  return {
    x: Math.floor((sx + cameraX) / TILE),
    y: Math.floor((sy + cameraY) / TILE)
  };
}

function inReach(tx, ty) {
  const px = player.x + player.w / 2;
  const py = player.y + player.h / 2;
  return Math.hypot(tx * TILE + TILE / 2 - px,
                    ty * TILE + TILE / 2 - py) < TILE * 5;
}

function useTool(event) {
  if (gameOver) return;

  const target = getTarget(event);
  const tx = target.x;
  const ty = target.y;

  if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return;
  if (!inReach(tx, ty)) return;

  const item = HOTBAR[selected];

  // Right-click places a selected block.
  if (event.button === 2) {
    if (typeof item !== "number") return;
    if (world[ty][tx] !== 0 || (inventory[item] || 0) <= 0) return;

    const bx = tx * TILE;
    const by = ty * TILE;

    const overlaps =
      bx < player.x + player.w &&
      bx + TILE > player.x &&
      by < player.y + player.h &&
      by + TILE > player.y;

    if (overlaps) return;

    world[ty][tx] = item;
    inventory[item]--;
    updateInventory();
    return;
  }

  if (event.button !== 0) return;

  // Sword: damage nearby animals or zombies.
  if (item === "sword") {
    if (attackCooldown > 0) return;
    attackCooldown = 18;

    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;

    const targets = [...animals, ...zombies];
    let closest = null;
    let bestDistance = TILE * 3;

    for (const mob of targets) {
      const mx = mob.x + mob.w / 2;
      const my = mob.y + mob.h / 2;
      const d = Math.hypot(mx - px, my - py);

      if (d < bestDistance) {
        bestDistance = d;
        closest = mob;
      }
    }

    if (closest) {
      closest.hp--;
      say("Sword hit! " + closest.hp + " health left");

      if (closest.hp <= 0) {
        animals = animals.filter(a => a !== closest);
        zombies = zombies.filter(z => z !== closest);
        say("Enemy defeated!");
      }
    } else {
      say("No enemy close enough!");
    }
    return;
  }

  // Pickaxe: mine blocks.
  if (item === "pickaxe") {
    const block = world[ty][tx];
    if (block === 0) return;

    world[ty][tx] = 0;
    inventory[block] = (inventory[block] || 0) + 1;
    updateInventory();
    say("Block mined!");
  }
}

canvas.addEventListener("contextmenu", e => e.preventDefault());
canvas.addEventListener("pointerdown", useTool);

function drawBlock(id, x, y) {
  if (!id) return;

  const bx = x * TILE - cameraX;
  const by = y * TILE - cameraY;

  ctx.fillStyle = BLOCKS[id].color;
  ctx.fillRect(bx, by, TILE, TILE);

  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.strokeRect(bx, by, TILE, TILE);

  if (id === 1) {
    ctx.fillStyle = "#75bf4a";
    ctx.fillRect(bx, by, TILE, 5);
  }

  if (id === 4) {
    ctx.fillStyle = "#694326";
    ctx.fillRect(bx + 6, by, 3, TILE);
  }

  if (id === 5) {
    ctx.fillStyle = "#439b4c";
    ctx.fillRect(bx + 3, by + 3, TILE - 6, TILE - 6);
  }
}

function drawAnimal(a) {
  const x = a.x - cameraX;
  const y = a.y - cameraY;

  ctx.fillStyle = a.type === "pig" ? "#ee9ca5" : "#eee9dc";
  ctx.fillRect(x, y + 5, a.w, a.h - 5);
  ctx.fillRect(x + a.w - 7, y, 10, 12);

  ctx.fillStyle = "#333";
  ctx.fillRect(x + a.w, y + 4, 2, 2);

  ctx.fillStyle = "#555";
  ctx.fillRect(x + 3, y + a.h - 3, 4, 5);
  ctx.fillRect(x + 15, y + a.h - 3, 4, 5);

  drawHealthBar(x, y - 7, a.w, a.hp, 3);
}

function drawZombie(z) {
  const x = z.x - cameraX;
  const y = z.y - cameraY;

  ctx.fillStyle = "#498c45";
  ctx.fillRect(x + 3, y, 14, 12);

  ctx.fillStyle = "#2e77b7";
  ctx.fillRect(x + 2, y + 12, 16, 11);

  ctx.fillStyle = "#32334a";
  ctx.fillRect(x + 3, y + 23, 6, 7);
  ctx.fillRect(x + 12, y + 23, 6, 7);

  ctx.fillStyle = "#eee";
  ctx.fillRect(x + 5, y + 4, 3, 3);
  ctx.fillRect(x + 13, y + 4, 3, 3);

  drawHealthBar(x, y - 7, z.w, z.hp, 5);
}

function drawHealthBar(x, y, width, hp, maxHp) {
  ctx.fillStyle = "#333";
  ctx.fillRect(x, y, width, 4);
  ctx.fillStyle = "#ef3333";
  ctx.fillRect(x, y, width * Math.max(0, hp / maxHp), 4);
}

function drawPlayer() {
  const x = player.x - cameraX;
  const y = player.y - cameraY;

  if (invulnerable > 0 && Math.floor(invulnerable / 5) % 2 === 0) {
    ctx.globalAlpha = 0.45;
  }

  ctx.fillStyle = "#efc49a";
  ctx.fillRect(x + 3, y, 12, 12);

  ctx.fillStyle = "#60412d";
  ctx.fillRect(x + 2, y, 14, 4);

  ctx.fillStyle = "#3982ce";
  ctx.fillRect(x + 1, y + 12, 15, 13);

  ctx.fillStyle = "#344767";
  ctx.fillRect(x + 2, y + 25, 6, 9);
  ctx.fillRect(x + 10, y + 25, 6, 9);

  ctx.fillStyle = "#222";
  ctx.fillRect(
    x + (player.facing > 0 ? 11 : 4),
    y + 5, 2, 2
  );

  ctx.globalAlpha = 1;

  // Draw the equipped tool.
  const tool = HOTBAR[selected];

  if (tool === "sword") {
    ctx.strokeStyle = "#d8e5ef";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + player.w / 2, y + 19);
    ctx.lineTo(x + player.w / 2 + player.facing * 17, y + 8);
    ctx.stroke();

    ctx.strokeStyle = "#81552f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + player.w / 2 - 3, y + 17);
    ctx.lineTo(x + player.w / 2 + 4, y + 21);
    ctx.stroke();
  } else if (tool === "pickaxe") {
    ctx.strokeStyle = "#85572e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 20);
    ctx.lineTo(x + 22, y + 7);
    ctx.stroke();

    ctx.strokeStyle = "#b7c2ce";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 15, y + 6);
    ctx.lineTo(x + 24, y + 4);
    ctx.stroke();
  }
}

function draw() {
  const w = canvas.width;
  const h = canvas.height;

  cameraX = Math.max(0, Math.min(
    COLS * TILE - w,
    player.x + player.w / 2 - w / 2
  ));

  cameraY = Math.max(0, Math.min(
    ROWS * TILE - h,
    player.y + player.h / 2 - h / 2
  ));

  // Sky background.
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#69b9f2");
  sky.addColorStop(1, "#d2edff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const startX = Math.max(0, Math.floor(cameraX / TILE));
  const endX = Math.min(COLS, Math.ceil((cameraX + w) / TILE) + 1);
  const startY = Math.max(0, Math.floor(cameraY / TILE));
  const endY = Math.min(ROWS, Math.ceil((cameraY + h) / TILE) + 1);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      drawBlock(world[y][x], x, y);
    }
  }

  animals.forEach(drawAnimal);
  zombies.forEach(drawZombie);
  drawPlayer();

  // On-screen HUD.
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(10, 10, 210, 46);

  ctx.fillStyle = "#222";
  ctx.fillRect(18, 19, 150, 15);

  ctx.fillStyle = "#e83d45";
  ctx.fillRect(18, 19, 150, 15);

  ctx.fillStyle = "#3ed35d";
  ctx.fillRect(18, 19, 150 * health / 10, 15);

  ctx.fillStyle = "#fff";
  ctx.font = "14px sans-serif";
  ctx.fillText("❤️ " + health + " / 10", 176, 31);
  ctx.fillText("Animals: " + animals.length +
               "  Zombies: " + zombies.length, 18, 48);

  if (messageTimer > 0) {
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.strokeText(message, w / 2, 80);
    ctx.fillText(message, w / 2, 80);
    ctx.textAlign = "left";
  }

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText("YOU DIED", w / 2, h / 2 - 12);
    ctx.font = "18px sans-serif";
    ctx.fillText("Press R to respawn", w / 2, h / 2 + 24);
    ctx.textAlign = "left";
  }
}

function loop(time) {
  const delta = Math.min((time - lastTime) / 16.67 || 1, 2);
  lastTime = time;

  if (!gameOver) {
    movePlayer();
    updateMobs();

    if (invulnerable > 0) invulnerable =
      Math.max(0, invulnerable - delta);

    if (attackCooldown > 0) attackCooldown =
      Math.max(0, attackCooldown - delta);

    if (messageTimer > 0) messageTimer -= delta;
  }

  draw();
  requestAnimationFrame(loop);
}

// Keyboard controls.
window.addEventListener("keydown", event => {
  const key = event.key.length === 1
    ? event.key.toLowerCase()
    : event.key;

  if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
    event.preventDefault();
  }

  keys[key] = true;

  if (key >= "1" && key <= String
