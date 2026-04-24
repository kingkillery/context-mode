import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("MCP startup network behavior", () => {
  test("latest-version check is opt-in, not automatic", () => {
    const source = readFileSync(join(process.cwd(), "src", "server.ts"), "utf8");
    const startupSection = source.slice(source.indexOf("// Server startup"));
    const beforeOptInGuard = startupSection.slice(
      0,
      startupSection.indexOf("if (process.env.CONTEXT_MODE_CHECK_LATEST"),
    );

    expect(startupSection).toContain('process.env.CONTEXT_MODE_CHECK_LATEST === "1"');
    expect(beforeOptInGuard).not.toContain("fetchLatestVersion()");
  });
});
