"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

"use strict";

(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;
  const TILE = 24;
  const COLS = 180;
  const ROWS = 40;

  const names = [
    "Sword", "Pickaxe", "Grass", "Dirt",
    "Stone", "Wood", "Leaves"
  ];

  const icons = ["⚔️", "⛏️", "🟩", "🟫", "⬜", "🪵", "🌿"];

  const blockColors = {
    1: "#69ad43",
    2: "#89552f",
    3: "#858585",
    4: "#986337",
    5: "#348044"
  };

  let world = [];
  let ground = [];
  let animals = [];
  let zombies = [];
  let inventory = {};
  let selected = 0;
  let cameraX = 0;
  let health = 10;
  let invulnerable = 0;
  let gameOver = false;
  let message = "";
  let messageTimer = 0;

  const keys = {};

  const player = {
    x: 80,
    y: 0,
    w: 17,
    h: 34,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false
  };

  const hotbar = document.getElementById("hotbar");
  const hpDisplay = document.getElementById("hp");
  const countDisplay = document.getElementById("count");
  const statusDisplay = document.getElementById("status");

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function say(text) {
    message = text;
    messageTimer = 100;
    if (statusDisplay) statusDisplay.textContent = text;
  }

  function getBlock(x, y) {
    if (x < 0 || x >= COLS || y >= ROWS) return 3;
    if (y < 0) return 0;
    return world[y][x];
  }

  function generateWorld() {
    world = Array.from(
      { length: ROWS },
      () => Array(COLS).fill(0)
    );

    ground = [];
    animals = [];
    zombies = [];

    let height = 19;

    for (let x = 0; x < COLS; x++) {
      if (Math.random() < 0.3) {
        height += Math.random() < 0.5 ? -1 : 1;
      }

      height = Math.max(13, Math.min(25, height));
      ground[x] = height;

      for (let y = height; y < ROWS; y++) {
        world[y][x] =
          y === height ? 1 :
          y < height + 4 ? 2 : 3;
      }

      if (x > 12 && Math.random() < 0.055) {
        for (let k = 1; k <= 3; k++) {
          world[height - k][x] = 4;
        }

        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -5; dy <= -3; dy++) {
            const tx = x + dx;
            const ty = height + dy;

            if (
              tx >= 0 && tx < COLS &&
              ty >= 0 && world[ty][tx] === 0
            ) {
              world[ty][tx] = 5;
            }
          }
        }
      }
    }

    // Safe, flat starting area.
    for (let x = 0; x < 12; x++) {
      ground[x] = 19;

      for (let y = 19; y < ROWS; y++) {
        world[y][x] = y === 19 ? 1 : y < 23 ? 2 : 3;
      }
    }

    // Spawn animals.
    for (let i = 0; i < 18; i++) {
      const x = randomInt(15, COLS - 2);

      animals.push({
        x: x * TILE,
        y: ground[x] * TILE - 20,
        w: 22,
        h: 20,
        hp: 3,
        type: Math.random() < 0.5 ? "sheep" : "pig",
        dir: Math.random() < 0.5 ? -1 : 1
      });
    }

    // Spawn hostile zombies.
    for (let i = 0; i < 12; i++) {
      const x = randomInt(25, COLS - 2);

      zombies.push({
        x: x * TILE,
        y: ground[x] * TILE - 30,
        w: 20,
        h: 30,
        hp: 5,
        cooldown: randomInt(0, 30)
      });
    }

    inventory = {
      1: 25,
      2: 30,
      3: 30,
      4: 10,
      5: 10
    };

    player.x = 4 * TILE;
    player.y = ground[4] * TILE - player.h;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;

    health = 10;
    invulnerable = 0;
    gameOver = false;

    drawHotbar();
    say("Explore, mine, and survive!");
  }

  function drawHotbar() {
    if (!hotbar) return;

    hotbar.innerHTML = "";

    names.forEach((name, i) => {
      const button = document.createElement("button");

      button.className =
        i === selected ? "active" : "";

      button.textContent =
        `${i + 1} ${icons[i]} ${name}` +
        (i >= 2 ? ` (${inventory[i - 1] || 0})` : "");

      button.addEventListener("click", () => {
        selected = i;
        drawHotbar();
      });

      hotbar.appendChild(button);
    });
  }

  function solidAt(x, y) {
    return getBlock(x, y) !== 0;
  }

  function collides(x, y, w, h) {
    const left = Math.floor(x / TILE);
    const right = Math.floor((x + w - 1) / TILE);
    const top = Math.floor(y / TILE);
    const bottom = Math.floor((y + h - 1) / TILE);

    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (solidAt(tx, ty)) return true;
      }
    }

    return false;
  }

  function movePlayer() {
    if (gameOver) return;

    if (keys.a || keys.ArrowLeft || keys.left) {
      player.vx = -3;
      player.facing = -1;
    } else if (keys.d || keys.ArrowRight || keys.right) {
      player.vx = 3;
      player.facing = 1;
    } else {
      player.vx *= 0.7;
      if (Math.abs(player.vx) < 0.1) player.vx = 0;
    }

    if (
      (keys.w || keys.ArrowUp || keys[" "] || keys.jump) &&
      player.onGround
    ) {
      player.vy = -10;
      player.onGround = false;
    }

    player.vy = Math.min(player.vy + 0.48, 10);

    // Horizontal movement and collision.
    player.x += player.vx;

    if (collides(player.x, player.y, player.w, player.h)) {
      player.x -= player.vx;
      player.vx = 0;
    }

    // Vertical movement and collision.
    player.y += player.vy;
    player.onGround = false;

    if (collides(player.x, player.y, player.w, player.h)) {
      if (player.vy > 0) player.onGround = true;
      player.y -= player.vy;
      player.vy = 0;
    }

    player.x = Math.max(0, Math.min(
      COLS * TILE - player.w, player.x
    ));

    if (player.y > ROWS * TILE) {
      hurtPlayer(3);
      player.y = ground[Math.floor(player.x / TILE)] * TILE - player.h;
    }
  }

  function overlaps(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function hurtPlayer(amount) {
    if (invulnerable > 0 || gameOver) return;

    health = Math.max(0, health - amount);
    invulnerable = 60;
    say("Zombie attack! -" + amount + " health");

    if (health <= 0) {
      gameOver = true;
      say("You died! Press R for a new world.");
    }
  }

  function updateMobs() {
    for (const animal of animals) {
      if (Math.random() < 0.012) {
        animal.dir = Math.random() < 0.5 ? -1 : 1;
      }

      const nextX = animal.x + animal.dir * 0.5;
      const tx = Math.floor(
        (nextX + (animal.dir > 0 ? animal.w : 0)) / TILE
      );

      const gy = Math.min(
        ROWS - 1,
        Math.floor((animal.y + animal.h + 1) / TILE)
      );

      if (
        !solidAt(tx, gy) &&
        nextX > 0 &&
        nextX < COLS * TILE - animal.w
      ) {
        animal.x = nextX;
      }

      const gx = Math.max(0, Math.min(
        COLS - 1,
        Math.floor((animal.x + animal.w / 2) / TILE)
      ));

      animal.y = ground[gx] * TILE - animal.h;
    }

    for (const zombie of zombies) {
      const dx = player.x - zombie.x;

      // Chase player.
      if (Math.abs(dx) < TILE * 13) {
        const direction = Math.sign(dx);
        const nextX = zombie.x + direction * 0.65;

        const tx = Math.floor(
          (nextX + (direction > 0 ? zombie.w : 0)) / TILE
        );

        const gy = Math.min(
          ROWS - 1,
          Math.floor((zombie.y + zombie.h + 1) / TILE)
        );

        if (!solidAt(tx, gy)) {
          zombie.x = nextX;
        }
      }

      const gx = Math.max(0, Math.min(
        COLS - 1,
        Math.floor((zombie.x + zombie.w / 2) / TILE)
      ));

      zombie.y = ground[gx] * TILE - zombie.h;

      if (zombie.cooldown > 0) zombie.cooldown--;

      if (
        overlaps(player, zombie) &&
        zombie.cooldown === 0
      ) {
        hurtPlayer(1);
        zombie.cooldown = 55;
      }
    }

    if (invulnerable > 0) invulnerable--;
  }

  function targetFromEvent(event) {
    const rect = canvas.getBoundingClientRect();

    return {
      x: Math.floor(
        ((event.clientX - rect.left) * W / rect.width + cameraX) / TILE
      ),
      y: Math.floor(
        (event.clientY - rect.top) * H / rect.height / TILE
      )
    };
  }

  function inReach(tx, ty) {
    return Math.hypot(
      tx * TILE + TILE / 2 - (player.x + player.w / 2),
      ty * TILE + TILE / 2 - (player.y + player.h / 2)
    ) < TILE * 5;
  }

  function useTool(event) {
    if (gameOver) return;

    const { x, y } = targetFromEvent(event);

    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;
    if (!inReach(x, y)) {
      say("That is too far away!");
      return;
    }

    const tool = names[selected];

    // Right-click places blocks.
    if (event.button === 2) {
      const id = selected - 1;

      if (selected < 2) return;
      if (getBlock(x, y) !== 0 || (inventory[id] || 0) <= 0) return;

      const bx = x * TILE;
      const by = y * TILE;

      if (
        bx < player.x + player.w &&
        bx + TILE > player.x &&
        by < player.y + player.h &&
        by + TILE > player.y
      ) return;

      world[y][x] = id;
      inventory[id]--;
      drawHotbar();
      return;
    }

    if (event.button !== 0) return;

    // Sword attacks nearby animals or zombies.
    if (tool === "Sword") {
      let target = null;
      let nearest = TILE * 3;

      for (const mob of [...animals, ...zombies]) {
        const distance = Math.hypot(
          mob.x + mob.w / 2 - (player.x + player.w / 2),
          mob.y + mob.h / 2 - (player.y + player.h / 2)
        );

        if (distance < nearest) {
          nearest = distance;
          target = mob;
        }
      }

      if (!target) {
        say("No enemy nearby!");
        return;
      }

      target.hp--;

      if (target.hp <= 0) {
        animals = animals.filter(a => a !== target);
        zombies = zombies.filter(z => z !== target);
        say("Enemy defeated!");
      } else {
        say("Hit! " + target.hp + " health left");
      }

      return;
    }

    // Pickaxe mines blocks.
    if (tool === "Pickaxe") {
      const id = getBlock(x, y);

      if (id === 0) return;

      world[y][x] = 0;
      const slot = id === 1 ? 2 : id;

      inventory[slot] = (inventory[slot] || 0) + 1;

      drawHotbar();
      say("Block mined!");
    }
  }

  function drawBlock(id, x, y) {
    if (!id) return;

    const bx = x * TILE - cameraX;
    const by = y * TILE;

    ctx.fillStyle = blockColors[id] || "#888";
    ctx.fillRect(bx, by, TILE, TILE);

    if (id === 1) {
      ctx.fillStyle = "#81ca50";
      ctx.fillRect(bx, by, TILE, 5);
    }

    if (id === 4) {
      ctx.fillStyle = "#694326";
      ctx.fillRect(bx + 6, by, 3, TILE);
    }

    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.strokeRect(bx, by, TILE, TILE);
  }

  function drawHealthBar(x, y, width, hp, maxHp) {
    ctx.fillStyle = "#222";
    ctx.fillRect(x, y, width, 4);

    ctx.fillStyle = "#ef3333";
    ctx.fillRect(x, y, width * Math.max(0, hp / maxHp), 4);
  }

  function drawAnimal(a) {
    const x = a.x - cameraX;
    const y = a.y;

    ctx.fillStyle = a.type === "pig" ? "#ed9eae" : "#f2eee1";
    ctx.fillRect(x, y + 5, a.w, a.h - 5);
    ctx.fillRect(x + 14, y, 10, 12);

    ctx.fillStyle = "#333";
    ctx.fillRect(x + 20, y + 4, 2, 2);

    ctx.fillStyle = "#555";
    ctx.fillRect(x + 3, y + 16, 4, 5);
    ctx.fillRect(x + 15, y + 16, 4, 5);

    drawHealthBar(x, y - 6, a.w, a.hp, 3);
  }

  function drawZombie(z) {
    const x = z.x - cameraX;
    const y = z.y;

    ctx.fillStyle = "#438b42";
    ctx.fillRect(x + 3, y, 14, 12);

    ctx.fillStyle = "#2777b8";
    ctx.fillRect(x + 2, y + 12, 16, 11);

    ctx.fillStyle = "#34354a";
    ctx.fillRect(x + 3, y + 23, 6, 7);
    ctx.fillRect(x + 12, y + 23, 6, 7);

    ctx.fillStyle = "#fff";
    ctx.fillRect(x + 5, y + 4, 3, 3);
    ctx.fillRect(x + 13, y + 4, 3, 3);

    drawHealthBar(x, y - 6, z.w, z.hp, 5);
  }

  function drawPlayer() {
    const x = player.x - cameraX;
    const y = player.y;

    if (invulnerable > 0 && Math.floor(invulnerable / 5) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    ctx.fillStyle = "#e8b78b";
    ctx.fillRect(x + 3, y, 12, 12);

    ctx.fillStyle = "#5b3c29";
    ctx.fillRect(x + 2, y, 14, 4);

    ctx.fillStyle = "#3885cf";
    ctx.fillRect(x + 1, y + 12, 15, 13);

    ctx.fillStyle = "#343d57";
    ctx.fillRect(x + 2, y + 25, 6, 9);
    ctx.fillRect(x + 10, y + 25, 6, 9);

    ctx.globalAlpha = 1;

    if (selected === 0) {
      ctx.strokeStyle = "#dfe8f2";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 19);
      ctx.lineTo(x + 22 * player.facing, y + 8);
      ctx.stroke();
    } else if (selected === 1) {
      ctx.strokeStyle = "#986438";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 20);
      ctx.lineTo(x + 22, y + 7);
      ctx.stroke();

      ctx.strokeStyle = "#ccc";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + 16, y + 6);
      ctx.lineTo(x + 25, y + 4);
      ctx.stroke();
    }
  }

  function draw() {
    cameraX = Math.max(0, Math.min(
      COLS * TILE - W,
      player.x + player.w / 2 - W / 2
    ));

    ctx.fillStyle = "#7cc9f5";
    ctx.fillRect(0, 0, W, H);

    const startX = Math.max(0, Math.floor(cameraX / TILE));
    const endX = Math.min(
      COLS, Math.ceil((cameraX + W) / TILE)
    );

    for (let y = 0; y < ROWS; y++) {
      for (let x = startX; x < endX; x++) {
        drawBlock(world[y][x], x, y);
      }
    }

    animals.forEach(drawAnimal);
    zombies.forEach(drawZombie);
    drawPlayer();

    // Health display.
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(10, 10, 210, 44);

    ctx.fillStyle = "#e83d45";
    ctx.fillRect(18, 20, 150, 13);

    ctx.fillStyle = "#3ed35d";
    ctx.fillRect(18, 20, 150 * health / 10, 13);

    ctx.fillStyle = "#fff";
    ctx.font = "14px sans-serif";
    ctx.fillText("❤️ " + health + "/10", 175, 31);

    ctx.fillText(
      "🐑 " + animals.length + "  🧟 " + zombies.length,
      18, 47
    );

    if (messageTimer > 0) {
      ctx.textAlign = "center";
      ctx.font = "bold 18px sans-serif";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#333";
      ctx.strokeText(message, W / 2, 80);
      ctx.fillStyle = "#fff";
      ctx.fillText(message, W / 2, 80);
      ctx.textAlign = "left";
      messageTimer--;
    }

    if (gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 36px sans-serif";
      ctx.fillText("YOU DIED", W / 2, H / 2);

      ctx.font = "18px sans-serif";
      ctx.fillText("Press R for a new world", W / 2, H / 2 + 35);
      ctx.textAlign = "left";
    }

    if (hpDisplay) hpDisplay.textContent = "❤️ " + health + "/10";

    if (countDisplay) {
      countDisplay.textContent = "🧱 Blocks: " +
        Object.values(inventory).reduce((a, b) => a + b, 0);
    }
  }

  function gameLoop() {
    if (!gameOver) {
      movePlayer();
      updateMobs();
    }

    draw();
    requestAnimationFrame(gameLoop);
  }

  window.addEventListener("keydown", event => {
    const key = event.key.length === 1
      ? event.key.toLowerCase()
      : event.key;

    if ([" ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) {
      event.preventDefault();
    }

    keys[key] = true;

    if (key >= "1" && key <= "7") {
      selected = Number(key) - 1;
      drawHotbar();
    }

    if (key === "r") generateWorld();
  });

  window.addEventListener("keyup", event => {
    const key = event.key.length === 1
      ? event.key.toLowerCase()
      : event.key;

    keys[key] = false;
  });

  window.addEventListener("blur", () => {
    Object.keys(keys).forEach(key => keys[key] = false);
  });

  canvas.addEventListener("contextmenu", event => {
    event.preventDefault();
  });

  canvas.addEventListener("pointerdown", event => {
    const rect = canvas.getBoundingClientRect();

    const x = Math.floor(
      ((event.clientX - rect.left) * W / rect.width + cameraX) / TILE
    );

    const y = Math.floor(
      (event.clientY - rect.top) * H / rect.height / TILE
    );

    useTool({
      button: event.button,
      clientX: event.clientX,
      clientY: event.clientY
    });
  });

  function useAtPlayer(tool) {
    const tx = Math.floor(
      (player.x + player.w / 2 + player.facing * TILE * 2) / TILE
    );
    const ty = Math.floor((player.y + player.h / 2) / TILE);

    if (tool === "mine") {
      selected = 1;
      drawHotbar();
    } else if (tool === "attack") {
      selected = 0;
      drawHotbar();
    }

    // Directly use the selected tool at the nearby tile.
    useToolAtTile(tx, ty, tool);
  }

  function useToolAtTile(tx, ty, mode) {
    if (gameOver || !inReach(tx, ty)) return;

    if (mode === "attack") {
      let target = null;
      let nearest = TILE * 3;

      for (const mob of [...animals, ...zombies]) {
        const distance = Math.hypot(
          mob.x + mob.w / 2 - (player.x + player.w / 2),
          mob.y + mob.h / 2 - (player.y + player.h / 2)
        );

        if (distance < nearest) {
          nearest = distance;
          target = mob;
        }
      }

      if (target) {
        target.hp--;

        if (target.hp <= 0) {
          animals = animals.filter(m => m !== target);
          zombies = zombies.filter(m => m !== target);
          say("Enemy defeated!");
        } else {
          say("Hit! " + target.hp + " health left");
        }
      } else {
        say("No enemy nearby!");
      }

      return;
    }

    if (mode === "mine") {
      const id = getBlock(tx, ty);
      if (!id) return;

      world[ty][tx] = 0;
      const slot = id === 1 ? 2 : id;

      inventory[slot] = (inventory[slot] || 0) + 1;
      drawHotbar();
      say("Block mined!");
      return;
    }

    if (mode === "place") {
      const id = selected - 1;

      if (selected < 2) return;
      if (getBlock(tx, ty) !== 0 || !inventory[id]) return;

      world[ty][tx] = id;
      inventory[id]--;
      drawHotbar();
    }
  }

  function holdButton(id, key) {
    const button = document.getElementById(id);
    if (!button) return;

    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      keys[key] = true;
      button.setPointerCapture(event.pointerId);
    });

    const release = () => keys[key] = false;

    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  }

  holdButton("left", "left");
  holdButton("right", "right");
  holdButton("jump", "jump");

  const attackButton = document.getElementById("attack");
  if (attackButton) {
    attackButton.addEventListener("click", () => useAtPlayer("attack"));
  }

  const mineButton = document.getElementById("mine");
  if (mineButton) {
    mineButton.addEventListener("click", () => useAtPlayer("mine"));
  }

  const placeButton = document.getElementById("place");
  if (placeButton) {
    placeButton.addEventListener("click", () => useAtPlayer("place"));
  }

  const resetButton = document.getElementById("reset");
  if (resetButton) resetButton.addEventListener("click", generateWorld);

  generateWorld();
  requestAnimationFrame(gameLoop);
})();
