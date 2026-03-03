import test from "node:test";
import assert from "node:assert/strict";

import { runTool } from "../site/tools/jwt-payload-decoder-and-expiry-checker-5/logic.js";

const validToken =
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjMiLCJuYW1lIjoiQXZhIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjQxMDI0NDQ4MDB9.";
const expiredToken = "eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjMiLCJleHAiOjEwMDB9.";

test("jwt tool decodes payload json", () => {
  const output = runTool(validToken, "decode-payload");
  assert.match(output, /"sub": "123"/);
  assert.match(output, /"name": "Ava"/);
});

test("jwt tool returns expiry status", () => {
  const valid = runTool(validToken, "expiry-report");
  assert.match(valid, /Status: VALID/);
  const expired = runTool(expiredToken, "expiry-report");
  assert.match(expired, /Status: EXPIRED/);
});

test("jwt tool rejects invalid token", () => {
  assert.throws(() => runTool("bad.token", "decode-payload"), /base64|json|jwt/i);
});
