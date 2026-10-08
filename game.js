<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Web Sandbox Survival (BabylonJS)</title>
    
    <!-- ─── CSS STYLE SHEET ────────────────────────────────────────── -->
    <style>
        html, body {
            overflow: hidden;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            user-select: none;
            background-color: #000;
        }

        #renderCanvas {
            width: 100%;
            height: 100%;
            touch-action: none;
            display: block;
        }

        /* Crosshair in the dead center */
        #crosshair {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 12px;
            height: 12px;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 5;
        }
        #crosshair::before, #crosshair::after {
            content: '';
            position: absolute;
            background: white;
        }
        #crosshair::before { top: 5px; left: 0; width: 12px; height: 2px; }
        #crosshair::after { top: 0; left: 5px; width: 2px; height: 12px; }

        /* HUD & UI Panels */
        #hud {
            position: absolute;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: #fff;
            padding: 15px;
            border-radius: 8px;
            font-size: 14px;
            line-height: 1.6;
            pointer-events: none;
            z-index: 5;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        }

        .highlight {
            color: #4CAF50;
            font-weight: bold;
        }

        #instructions {
            position: absolute;
            bottom: 25px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 25px;
            border-radius: 25px;
            font-size: 13px;
            text-align: center;
            pointer-events: none;
            z-index: 5;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }

        /* Click to Play Screen */
        #blocker {
            position: absolute;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            text-align: center;
            cursor: pointer;
            z-index: 10;
        }
        #popup {
            background: rgba(0,0,0,0.6);
            padding: 30px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.1);
            line-height: 1.8;
        }
        .btn-start {
            margin-top: 15px;
            display: inline-block;
            background: #4CAF50;
            padding: 10px 25px;
            border-radius: 5px;
            font-weight: bold;
        }
    </style>

    <!-- Include Babylon.js Framework from secure CDN -->
    <script src="https://babylonjs.com"></script>
</head>
<body>

    <div id="blocker">
        <div id="popup">
            <strong style="font-size: 24px; color: #4CAF50;">3D JAVASCRIPT VOXEL SURVIVAL</strong><br><br>
            <strong>W, A, S, D</strong> = Move around | <strong>Mouse</strong> = Look around<br>
            <strong>Left Click</strong> = Mine Block | <strong>Right Click</strong> = Place Block<br>
            <strong>Keys 1, 2, 3</strong> = Switch Selected Block Type<br>
            <strong>E</strong> = Eat Apple | <strong>R</strong> = Sleep | <strong>C</strong> = Craft Stone<br><br>
            <div class="btn-start">CLICK ANYWHERE TO START</div>
        </div>
    </div>

    <div id="crosshair"></div>
    
    <div id="hud">
        <div>♥ HP: <span id="hp-val">100</span> | 🍖 Hunger: <span id="hunger-val">100</span> | ⚡ Energy: <span id="energy-val">100</span></div>
        <div style="margin-top: 8px;">Active Block: <span id="selected-val" class="highlight">GRASS</span></div>
        <div style="margin-top: 4px;">Inventory: 
            Grass(<span id="inv-grass">10</span>) 
            Stone(<span id="inv-stone">5</span>) 
            Wood(<span id="inv-wood">5</span>) 
            Apple(<span id="inv-apple">3</span>)
        </div>
    </div>

    <div id="instructions">
        [1-3] Swap Block | [E] Eat Apple | [R] Sleep | [C] Craft
    </div>

    <canvas id="renderCanvas"></canvas>

    <!-- ─── JAVASCRIPT GAME LOGIC ──────────────────────────────────── -->
    <script>
        const canvas = document.getElementById("renderCanvas");
        const engine = new BABYLON.Engine(canvas, true);
        
        let scene, camera;
        const MAP_SIZE = 100;
        
        // Gameplay & Survival States
        let player = { health: 100, hunger: 100, energy: 100 };
        let inventory = { Grass: 10, Stone: 5, Wood: 5, Apple: 3 };
        const blockTypes = ["Grass", "Stone", "Wood"];
        let currentBlockIndex = 0;
        
        let blocksArray = [];
        let mobsArray = [];

        // Color definitions for block types
        const blockColors = {
            Grass: new BABYLON.Color3(0.33, 0.48, 0.17),
            Stone: new BABYLON.Color3(0.45, 0.45, 0.45),
            Wood: new BABYLON.Color3(0.54, 0.35, 0.21)
        };

        // UI Element Hooks
        const blocker = document.getElementById("blocker");
        const hpVal = document.getElementById("hp-val");
        const hungerVal = document.getElementById("hunger-val");
        const energyVal = document.getElementById("energy-val");
        const selectedVal = document.getElementById("selected-val");
        const invGrass = document.getElementById("inv-grass");
        const invStone = document.getElementById("inv-stone");
        const invWood = document.getElementById("inv-wood");
        const invApple = document.getElementById("inv-apple");

        // Prevent standard right-click context menu from popping up
        document.addEventListener('contextmenu', e => e.preventDefault());

        const createScene = function () {
            scene = new BABYLON.Scene(engine);
            scene.clearColor = new BABYLON.Color4(0.53, 0.81, 0.92, 1.0); // Sky Blue
            scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
            scene.fogColor = new BABYLON.Color3(0.53, 0.81, 0.92);
            scene.fogDensity = 0.01;

            // 1. Enable Native Engine Collisions & Gravity
            scene.gravity = new BABYLON.Vector3(0, -9.81 / 60, 0);
            scene.collisionsEnabled = true;

            // 2. Setup FPS Camera with auto-configured pointer controls
            camera = new BABYLON.FreeCamera("fpsCamera", new BABYLON.Vector3(MAP_SIZE/2, 2, MAP_SIZE/2), scene);
            camera.attachControl(canvas, true);
            
            // Map movement commands to standard gaming conventions
            camera.keysUp.push(87);    // W
            camera.keysDown.push(83);  // S
            camera.keysLeft.push(65);  // A
            camera.keysRight.push(68); // D
            
            camera.speed = 0.5;
            camera.angularSensibility = 2000;

            // Apply body dimensions/hitbox to the player camera
            camera.ellipsoid = new BABYLON.Vector3(0.4, 1.0, 0.4);
            camera.checkCollisions = true;
            camera.applyGravity = true;

            // 3. Environment Lights
            const light = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
            light.intensity = 0.7;
            const dirLight = new BABYLON.DirectionalLight("sunlight", new BABYLON.Vector3(-1, -2, -1), scene);
            dirLight.intensity = 0.4;

            // 4. Ground Foundation Plane (100x100 Floor Grid)
            const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: MAP_SIZE, height: MAP_SIZE}, scene);
            ground.position.set(MAP_SIZE/2, 0, MAP_SIZE/2);
            ground.checkCollisions = true;
            
            const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
            groundMat.diffuseColor = new BABYLON.Color3(0.22, 0.37, 0.04);
            groundMat.specularColor = new BABYLON.Color3(0, 0, 0);
            ground.material = groundMat;

            // 5. Procedural Resource Generation
            for (let i = 0; i < 40; i++) {
                let rx = Math.floor(Math.random() * (MAP_SIZE - 10)) + 5;
                let rz = Math.floor(Math.random() * (MAP_SIZE - 10)) + 5;
                let type = Math.random() > 0.5 ? "Wood" : "Stone";
                spawnBlock(rx, 0.5, rz, type);
                if (type === "Wood") spawnBlock(rx, 1.5, rz, "Wood"); // Make trees taller
            }

            // 6. Spawn Evil Wandering Mobs (Magenta Columns)
            for (let i = 0; i < 5; i++) {
                let rx = Math.floor(Math.random() * (MAP_SIZE - 20)) + 10;
                let rz = Math.floor(Math.random() * (MAP_SIZE - 20)) + 10;
                spawnMob(rx, rz);
            }

            return scene;
        };

        function spawnBlock(x, y, z, type) {
            const block = BABYLON.MeshBuilder.CreateBox("voxel", {size: 1.0}, scene);
            block.position.set(x, y, z);
            block.checkCollisions = true;
            
            const mat = new BABYLON.StandardMaterial("blockMat", scene);
            mat.diffuseColor = blockColors[type];
            mat.specularColor = new BABYLON.Color3(0, 0, 0); // Flat finish
            block.material = mat;
            
            block.metadata = { type: type };
            blocksArray.push(block);
        }

        function spawnMob(x, z) {
