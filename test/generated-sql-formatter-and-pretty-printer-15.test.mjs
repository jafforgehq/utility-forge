import test from "node:test";
import assert from "node:assert/strict";

import { runTool } from "../site/tools/sql-formatter-and-pretty-printer-15/logic.js";

test("generated tool returns output", () => {
  const output = runTool("hello world", "normalize");
  assert.equal(typeof output, "string");
  assert.ok(output.length > 0);
});

test("generated tool rejects empty input", () => {
  assert.throws(() => runTool("   ", "normalize"), /empty|invalid/i);
});
