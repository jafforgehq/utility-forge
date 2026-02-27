import test from "node:test";
import assert from "node:assert/strict";

import {
  countChars,
  formatJson,
  minifyJson,
  parseJson,
  sortJsonKeys
} from "../site/json-tools.js";

test("parseJson parses valid JSON", () => {
  const parsed = parseJson('{"name":"forge","active":true}');
  assert.deepEqual(parsed, { name: "forge", active: true });
});

test("formatJson formats with indentation", () => {
  const output = formatJson('{"b":1,"a":2}', 2);
  assert.equal(output, '{\n  "b": 1,\n  "a": 2\n}');
});

test("minifyJson compacts JSON", () => {
  const output = minifyJson('{\n  "x": 1,\n  "y": [1, 2]\n}');
  assert.equal(output, '{"x":1,"y":[1,2]}');
});

test("sortJsonKeys sorts deeply", () => {
  const output = sortJsonKeys('{"b":{"z":1,"a":2},"a":1}');
  assert.equal(output, '{\n  "a": 1,\n  "b": {\n    "a": 2,\n    "z": 1\n  }\n}');
});

test("parseJson throws on empty input", () => {
  assert.throws(() => parseJson("   "), /Input JSON is empty/);
});

test("countChars counts string length", () => {
  assert.equal(countChars("abc"), 3);
  assert.equal(countChars(""), 0);
  assert.equal(countChars(null), 0);
});

