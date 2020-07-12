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
    fps.render();

    const ticks = Number(ticksRange.value);
    for (let i = 0; i < ticks; i++) {
        universe.tick();
    }

    draw();

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
    draw();
});

const randomButton = <HTMLButtonElement>document.getElementById("reset-random");

randomButton.addEventListener("click", event => {
    universe.randomize();
    draw();
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

const draw = () => {
    ctx.beginPath();
    ctx.fillStyle = DEAD_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.stroke();

    drawGrid();

    const cellsPtr = universe.cells();
    const cells = new Uint8Array(memory.buffer, cellsPtr, width * height);

    ctx.beginPath();

    ctx.fillStyle = ALIVE_COLOR;
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const idx = getIndex(row, col);

            if (cells[idx] === Cell.Dead) {
                continue
            }

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

    draw();
});

const fps = new class {
    fps: HTMLDivElement;
    frames: number[];
    lastFrameTimestamp: number;

    constructor() {
        this.fps = <HTMLDivElement>document.getElementById("fps");
        this.frames = [];
        this.lastFrameTimestamp = performance.now();
    }

    render() {
        // Convert the delta time since the last frame render into a measure
        // of frames per second.
        const now = performance.now();
        const delta = now - this.lastFrameTimestamp;
        this.lastFrameTimestamp = now;
        const fps = 1 / delta * 1000;

        // Save only the latest 100 timings.
        this.frames.push(fps);
        if (this.frames.length > 100) {
            this.frames.shift();
        }

        // Find the max, min, and mean of our 100 latest timings.
        let min = Infinity;
        let max = -Infinity;
        let mean = 0;
        let M2 = 0;
        for (let i = 0; i < this.frames.length; i++) {
            min = Math.min(this.frames[i], min);
            max = Math.max(this.frames[i], max);
            const count = i + 1;
            const delta = this.frames[i] - mean
            mean += delta / count;
            const delta2 = this.frames[i] - mean;
            M2 += delta * delta2;
        }
        const variance = M2 / this.frames.length;

        // Render the statistics.
        this.fps.textContent = `
  Frames per Second:
           latest = ${Math.round(fps)}
  avg of last 100 = ${Math.round(mean)} (σ = ${Math.round(Math.sqrt(variance))})
  min of last 100 = ${Math.round(min)}
  max of last 100 = ${Math.round(max)}
  `.trim();
    }
};

draw();
play();
// pause();
