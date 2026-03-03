import test from "node:test";
import assert from "node:assert/strict";

import { runTool } from "../site/tools/markdown-table-builder-from-csv-12/logic.js";

test("markdown table tool converts csv", () => {
  const input = "name,role\nAva,PO\nEve,SE";
  const output = runTool(input, "csv-comma");
  assert.equal(output, "| name | role |\n| --- | --- |\n| Ava | PO |\n| Eve | SE |");
});

test("markdown table tool converts tsv", () => {
  const input = "name\tteam\nNora\tQA";
  const output = runTool(input, "tsv-tab");
  assert.equal(output, "| name | team |\n| --- | --- |\n| Nora | QA |");
});

test("markdown table tool rejects insufficient rows", () => {
  assert.throws(() => runTool("name,role", "csv-comma"), /header row and one data row/i);
});
