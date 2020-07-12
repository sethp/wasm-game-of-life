#!/usr/bin/env deno run --allow-net --allow-read --unstable --importmap import_map.json

import * as Colors from "https://deno.land/std@v0.60.0/fmt/colors.ts";
import { basename } from "https://deno.land/std@v0.60.0/path/mod.ts";

// This is a bad idea: https://github.com/denoland/deno/issues/4549#issuecomment-610023095
// > deno bundle will always be focused on creating workloads for Deno. The side-effect that
// > some of those workloads can be run in a browser is "nice". Deno.bundle() is what is intended
// > for building something for another runtime.
// But since we're building a quick and dirty dev server anyway, this won't be the last bad idea in this file.
const [diagnostics, emit] = await Deno.bundle("www/bootstrap.ts", undefined, {
  lib: ["esnext", "es2017", "dom", "dom.iterable"],
  target: "esnext",
  module: "es2015",
  experimentalDecorators: true,
  sourceMap: true,
});

if (diagnostics != null) {
  await diagnostics!
    .map(
      (d) =>
        `
${
          Colors.yellow(
            `${basename(d.scriptResourceName || "").trim()}:${
              d.lineNumber ? d.lineNumber + 1 : NaN
            }:${d.startColumn}-${d.endColumn}`,
          )
        } - ${Colors.red("error")} ${Colors.blue(`TS${d.code}`)}: ${d.message}
${
          Colors.bgWhite(
            Colors.black(`${d.lineNumber ? d.lineNumber + 1 : NaN}`),
          )
        } ${d.sourceLine}
`,
    )
    .forEach((m) => console.log(m));
  Deno.exit(5);
}
// console.log(emit);

import { serve } from "https://deno.land/std@v0.60.0/http/server.ts";
const s = serve({ port: 8000 });
console.log("http://localhost:8000/");
for await (const req of s) {
  if (req.url.match(/^\/$|^\/index.html$/)) {
    const filename = "www/index.html";
    const file = await Deno.open(filename);
    const headers = new Headers();
    // headers.set("Access-Control-Allow-Origin", "*");
    await req.respond({ headers: headers, body: file });
    file.close();
  } else if (req.url.match(/^\/game.wasm$/)) {
    const filename = "pkg/wasm_game_of_life_bg.wasm";
    const file = await Deno.open(filename);
    const headers = new Headers();
    headers.set("content-type", "application/wasm");
    await req.respond({ headers: headers, body: file });
    file.close();
  } else {
    req.respond({ body: emit });
  }
}
