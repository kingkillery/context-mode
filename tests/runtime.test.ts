import { describe, expect, test } from "vitest";

import { buildCommand, getRuntimeSummary, type RuntimeMap } from "../src/runtime.js";

describe("runtime command handling", () => {
  const bunExe = "C:\\Users\\me\\AppData\\Roaming\\npm\\node_modules\\bun\\bin\\bun.exe";
  const runtimes: RuntimeMap = {
    javascript: bunExe,
    typescript: bunExe,
    python: null,
    shell: "cmd.exe",
    ruby: null,
    go: null,
    rust: null,
    php: null,
    perl: null,
    r: null,
    elixir: null,
  };

  test("buildCommand treats a Windows bun.exe path as Bun", () => {
    expect(buildCommand(runtimes, "javascript", "script.js")).toEqual([
      bunExe,
      "run",
      "script.js",
    ]);
    expect(buildCommand(runtimes, "typescript", "script.ts")).toEqual([
      bunExe,
      "run",
      "script.ts",
    ]);
  });

  test("getRuntimeSummary recognizes a Windows bun.exe path as preferred", () => {
    expect(getRuntimeSummary(runtimes)).not.toContain("Tip: Install Bun");
  });
});
