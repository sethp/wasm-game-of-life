import init from "wasm-game-of-life";

export let memory: WebAssembly.Memory;

(async () =>
  memory = <WebAssembly.Memory> (await init(
    "http://localhost:8000/game.wasm",
  )).memory)();
