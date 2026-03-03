import test from "node:test";
import assert from "node:assert/strict";

import { runTool } from "../site/tools/http-status-code-lookup-assistant-6/logic.js";

test("http status tool looks up single code", () => {
  const output = runTool("404", "lookup-single");
  assert.match(output, /404 Not Found/);
  assert.match(output, /Category: Client Error/);
});

test("http status tool looks up batch codes", () => {
  const output = runTool("200 503", "lookup-batch");
  assert.match(output, /200 OK/);
  assert.match(output, /503 Service Unavailable/);
});

test("http status tool rejects invalid code", () => {
  assert.throws(() => runTool("hello", "lookup-single"), /invalid/i);
});
