<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JS 2D Minecraft Engine</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #87CEEB;
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: sans-serif;
        }
        canvas {
            background-color: #87CEEB;
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
        }
        #ui {
            position: absolute;
            bottom: 20px;
            background: rgba(0,0,0,0.6);
            color: white;
            padding: 10px;
            border-radius: 5px;
            pointer-events: none;
        }
    </style>
</head>
<body>

    <canvas id="gameCanvas" width="800" height="480"></canvas>
    <div id="ui">Selected Block: Dirt (Press 1: Dirt, 2: Stone, 3: Grass) | Left Click: Break | Right Click: Place</div>

    <!-- Links to the JavaScript code logic file -->
    <script src="game.js"></script>
</body>
</html>
