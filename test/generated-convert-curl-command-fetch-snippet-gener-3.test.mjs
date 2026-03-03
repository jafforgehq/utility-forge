import test from "node:test";
import assert from "node:assert/strict";

import { runTool } from "../site/tools/convert-curl-command-fetch-snippet-gener-3/logic.js";

test("curl tool generates fetch snippet", () => {
  const curl = `curl -X POST "https://api.example.com/users" -H "Content-Type: application/json" -d '{"name":"Ava"}'`;
  const output = runTool(curl, "fetch-snippet");
  assert.match(output, /fetch\("https:\/\/api\.example\.com\/users"/);
  assert.match(output, /"method": "POST"/);
  assert.match(output, /"Content-Type": "application\/json"/);
  assert.match(output, /"body": "\{\\"name\\":\\"Ava\\"\}"/);
});

test("curl tool generates request init", () => {
  const curl = `curl https://api.example.com/ping -H "Authorization: Bearer abc"`;
  const output = runTool(curl, "request-init");
  assert.match(output, /const requestOptions = \{/);
  assert.match(output, /"Authorization": "Bearer abc"/);
});

test("curl tool rejects invalid input", () => {
  assert.throws(() => runTool("   ", "fetch-snippet"), /empty|url/i);
});
