import test from "node:test";
import assert from "node:assert/strict";

import { runTool } from "../site/tools/productownerdailytoolidea2026-02-27-1/logic.js";

test("generated tool returns output", () => {
  const output = runTool("hello world", "encode");
  assert.equal(typeof output, "string");
  assert.ok(output.length > 0);
});

test("generated tool rejects empty input", () => {
  assert.throws(() => runTool("   ", "encode"), /empty|invalid/i);
});
