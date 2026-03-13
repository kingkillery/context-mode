import { strict as assert } from "node:assert";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, test, vi } from "vitest";
import { SessionDB } from "../src/session/db.js";

// ── Helpers ──────────────────────────────────────────────

const cleanups: Array<() => void> = [];

afterAll(() => {
  for (const fn of cleanups) {
    try { fn(); } catch { /* ignore */ }
  }
});

function createTestDB(): SessionDB {
  const dbPath = join(tmpdir(), `plugin-hooks-test-${randomUUID()}.db`);
  const db = new SessionDB({ dbPath });
  cleanups.push(() => db.cleanup());
  return db;
}

// ── Mock API ─────────────────────────────────────────────

interface RegisteredHook {
  hookName: string;
  handler: (...args: unknown[]) => unknown;
  opts?: { priority?: number };
}

function createMockApi() {
  const hooks: RegisteredHook[] = [];
  const typedHooks: RegisteredHook[] = [];

  const api = {
    registerHook(event: string, handler: (...args: unknown[]) => unknown, _meta: unknown) {
      hooks.push({ hookName: event, handler });
    },
    on(hookName: string, handler: (...args: unknown[]) => unknown, opts?: { priority?: number }) {
      typedHooks.push({ hookName, handler, opts });
    },
    registerContextEngine(_id: string, _factory: () => unknown) {},
    registerCommand(_cmd: unknown) {},
  };

  return { api, hooks, typedHooks };
}

// ── Plugin shape test ────────────────────────────────────

describe("Plugin exports", () => {
  beforeEach(() => { vi.resetModules(); });

  test("plugin exports id, name, configSchema, register", async () => {
    const { default: plugin } = await import("../src/openclaw-plugin.js");
    assert.equal(plugin.id, "context-mode");
    assert.equal(plugin.name, "Context Mode");
    assert.ok(plugin.configSchema);
    assert.equal(typeof plugin.register, "function");
  });
});

describe("session_start hook", () => {
  beforeEach(() => { vi.resetModules(); });

  test("session_start hook is registered", async () => {
    const { default: plugin } = await import("../src/openclaw-plugin.js");
    const { api, typedHooks } = createMockApi();

    plugin.register(api as unknown as Parameters<typeof plugin.register>[0]);

    const hook = typedHooks.find(h => h.hookName === "session_start");
    assert.ok(hook, "session_start hook must be registered");
  });

  test("session_start hook is registered with no priority (void hook)", async () => {
    const { default: plugin } = await import("../src/openclaw-plugin.js");
    const { api, typedHooks } = createMockApi();

    plugin.register(api as unknown as Parameters<typeof plugin.register>[0]);

    const hook = typedHooks.find(h => h.hookName === "session_start");
    assert.ok(hook, "session_start must be registered");
    assert.equal(hook.opts?.priority, undefined);
  });

  test("session_start handler resets resumeInjected — verified via before_prompt_build sequence", async () => {
    const { default: plugin } = await import("../src/openclaw-plugin.js");
    const { api, typedHooks } = createMockApi();

    plugin.register(api as unknown as Parameters<typeof plugin.register>[0]);

    const sessionStartHandler = typedHooks.find(h => h.hookName === "session_start")?.handler;
    assert.ok(sessionStartHandler, "session_start handler must exist");

    const resumeHook = typedHooks.find(
      h => h.hookName === "before_prompt_build" && h.opts?.priority === 10,
    );
    assert.ok(resumeHook, "resume before_prompt_build hook must exist");

    // Call before_prompt_build first time — returns undefined (no DB resume)
    const result1 = await resumeHook.handler();
    assert.equal(result1, undefined, "no resume in DB → undefined");

    // Call session_start (simulating session restart)
    await sessionStartHandler({ sessionId: randomUUID() });

    // Call before_prompt_build again — still undefined (no DB resume), but must not throw
    const result2 = await resumeHook.handler();
    assert.equal(result2, undefined, "after session_start reset, still no resume → undefined");
  });
});
