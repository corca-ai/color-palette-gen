import assert from "node:assert/strict";
import test from "node:test";
import { createPaletteRuntime } from "../v2/lib/palette-runtime.js";

const resultFor = (primary) => ({ input: { primary }, modes: {} });

test("palette runtime uses the synchronous fallback and remembers results", async () => {
  let calls = 0;
  const runtime = createPaletteRuntime({
    WorkerClass: undefined,
    generate: ({ primary }) => {
      calls += 1;
      return resultFor(primary);
    },
    now: (() => {
      const values = [10, 14];
      return () => values.shift();
    })(),
  });

  const calculated = await runtime.calculate("#507096");
  assert.equal(calculated.duration, 4);
  assert.equal(calculated.cached, false);
  runtime.remember(calculated.result);

  const cached = await runtime.calculate("#507096");
  assert.equal(cached.cached, true);
  assert.equal(cached.result, calculated.result);
  assert.equal(calls, 1);
});

test("palette runtime correlates worker success and failure responses", async () => {
  class FakeWorker {
    static instance;

    constructor(url, options) {
      this.url = url;
      this.options = options;
      FakeWorker.instance = this;
    }

    addEventListener(_type, listener) {
      this.listener = listener;
    }

    postMessage(message) {
      this.message = message;
    }

    respond(data) {
      this.listener({ data: { id: this.message.id, ...data } });
    }
  }

  const runtime = createPaletteRuntime({ WorkerClass: FakeWorker });
  const success = runtime.calculate("#507096");
  assert.equal(FakeWorker.instance.message.variant, "current");
  FakeWorker.instance.respond({ result: resultFor("#507096"), duration: 2 });
  assert.equal((await success).result.input.primary, "#507096");
  assert.equal(FakeWorker.instance.options.type, "module");

  const failure = runtime.calculate("#FF0000");
  FakeWorker.instance.respond({ error: "worker failed" });
  await assert.rejects(failure, /worker failed/);

  const preview = runtime.calculate("#663300", {
    variant: "mode-relative",
  });
  assert.equal(FakeWorker.instance.message.variant, "mode-relative");
  FakeWorker.instance.respond({ result: resultFor("#663300"), duration: 3 });
  assert.equal((await preview).duration, 3);
});
