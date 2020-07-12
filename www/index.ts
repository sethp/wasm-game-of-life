import { Universe, Cell } from "wasm-game-of-life";
import { memory } from "wasm-game-of-life/wasm_game_of_life_bg";
import { dirxml } from "console";

const CELL_SIZE = 5; // px
const GRID_COLOR = "#CCCCCC";
const DEAD_COLOR = "#FFFFFF";
const ALIVE_COLOR = "#000000";
// Construct the universe, and get its width and height.
const universe = Universe.new();
const width = universe.width();
const height = universe.height();

// Give the canvas room for all of our cells and a 1px border
// around each of them.
const canvas = <HTMLCanvasElement>document.getElementById("game-of-life-canvas");
canvas.height = (CELL_SIZE + 1) * height + 1;
canvas.width = (CELL_SIZE + 1) * width + 1;

const ticksRange = <HTMLInputElement>document.getElementById("ticks-per-frame");

const ctx = canvas.getContext('2d')!;

let animationId: number | null = null;
const renderLoop = () => {
    const ticks = Number(ticksRange.value);
    for (let i = 0; i < ticks; i++) {
        universe.tick();
    }

    drawGrid();
    drawCells();

    animationId = requestAnimationFrame(renderLoop);
};

const isPaused = () => {
    return animationId === null;
};

const playPauseButton = <HTMLButtonElement>document.getElementById("play-pause");

const play = () => {
    playPauseButton.textContent = "⏸";
    renderLoop();
};

const pause = () => {
    playPauseButton.textContent = "▶";
    if (animationId) {
        cancelAnimationFrame(animationId!);
    }
    animationId = null;
};

playPauseButton.addEventListener("click", event => {
    if (isPaused()) {
        play();
    } else {
        pause();
    }
});

const resetButton = <HTMLButtonElement>document.getElementById("reset-all");

resetButton.addEventListener("click", event => {
    universe.reset();
    drawGrid();
    drawCells();
});

const randomButton = <HTMLButtonElement>document.getElementById("reset-random");

randomButton.addEventListener("click", event => {
    universe.randomize();
    drawGrid();
    drawCells();
});

const drawGrid = () => {
    ctx.beginPath();
    ctx.strokeStyle = GRID_COLOR;

    // Vertical lines.
    for (let i = 0; i <= width; i++) {
        ctx.moveTo(i * (CELL_SIZE + 1) + 1, 0);
        ctx.lineTo(i * (CELL_SIZE + 1) + 1, (CELL_SIZE + 1) * height + 1);
    }

    // Horizontal lines.
    for (let j = 0; j <= height; j++) {
        ctx.moveTo(0, j * (CELL_SIZE + 1) + 1);
        ctx.lineTo((CELL_SIZE + 1) * width + 1, j * (CELL_SIZE + 1) + 1);
    }

    ctx.stroke();
};

const getIndex = (row: number, column: number) => {
    return row * width + column;
};

const drawCells = () => {
    const cellsPtr = universe.cells();
    const cells = new Uint8Array(memory.buffer, cellsPtr, width * height);

    ctx.beginPath();

    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const idx = getIndex(row, col);

            ctx.fillStyle = cells[idx] === Cell.Dead
                ? DEAD_COLOR
                : ALIVE_COLOR;

            ctx.fillRect(
                col * (CELL_SIZE + 1) + 1,
                row * (CELL_SIZE + 1) + 1,
                CELL_SIZE,
                CELL_SIZE
            );
        }
    }

    ctx.stroke();
};

canvas.addEventListener("click", event => {
    const boundingRect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / boundingRect.width;
    const scaleY = canvas.height / boundingRect.height;

    const canvasLeft = (event.clientX - boundingRect.left) * scaleX;
    const canvasTop = (event.clientY - boundingRect.top) * scaleY;

    const row = Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), height - 1);
    const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), width - 1);


    if (event.altKey) {
        // glider
        for (let [dx, dy] of [
            [0, -1],
            [1, 0],
            [-1, 1], [0, 1], [1, 1],
        ]) {
            universe.toggle_cell(row + dy, col + dx);
        }
    } else if (event.shiftKey) {
        // pulsar
        for (let [dx, dy] of [
            [-4, -6], [-3, -6], [-2, -6],
            [-6, -4], [-1, -4],
            [-6, -3], [-1, -3],
            [-6, -2], [-1, -2],
            [-4, -1], [-3, -1], [-2, -1],
        ]) {
            for (let t = 0; t < 4; t++) {
                const TAU = 2 * Math.PI;
                const r = row + (dx * Math.sin(t * TAU / 4) + dy * Math.cos(t * TAU / 4));
                const c = col + (dx * Math.cos(t * TAU / 4) - dy * Math.sin(t * TAU / 4));

                universe.toggle_cell(r, c);
            }
        }
    } else {
        universe.toggle_cell(row, col);
    }

    drawGrid();
    drawCells();
});

drawGrid();
drawCells();
play();
// pause();
