import { test } from "node:test";
import assert from "node:assert/strict";

import { LINK } from "../src/core/domain.js";
import { parseFullSetup } from "../src/catalog/notation.js";
import { solve } from "../src/core/solver.js";

test("parseFullSetup maps holes and same/opposite links into domain coordinates", () => {
  // Armory 01 Chest: P1=front … P5=back in game labels.
  const parsed = parseFullSetup(
    "P5=4 P4=7 P3=2 P2=7 P1=7 P5>P1-,P2-,P3,P4 P4>P2,P5- P3>P4- P2>P1- P1>P2-,P3-",
  );

  assert.equal(parsed.plateCount, 5);
  // hole = position + 4 → P1=7,P2=7,P3=2,P4=7,P5=4
  assert.deepEqual(parsed.positions, [3, 3, -2, 3, 0]);
  // matrix[reactor][turned]: turning P5 (index 4) moves P1/P2 against, P3/P4 with
  assert.equal(parsed.matrix[0][4], LINK.OPP);
  assert.equal(parsed.matrix[1][4], LINK.OPP);
  assert.equal(parsed.matrix[2][4], LINK.SAME);
  assert.equal(parsed.matrix[3][4], LINK.SAME);
  assert.equal(parsed.matrix[4][4], LINK.NONE);
  // P2>P1- → turning P2 (1) moves P1 (0) against
  assert.equal(parsed.matrix[0][1], LINK.OPP);
});

test("Armory 01 fullSetup yields an edge-safe solution", () => {
  const { positions, matrix } = parseFullSetup(
    "P5=4 P4=7 P3=2 P2=7 P1=7 P5>P1-,P2-,P3,P4 P4>P2,P5- P3>P4- P2>P1- P1>P2-,P3-",
  );
  const path = solve(positions, matrix);
  assert.ok(Array.isArray(path));
  assert.ok(path.length > 0);
});

test("parseFullSetup rejects plate counts outside domain bounds", () => {
  assert.throws(
    () => parseFullSetup("P1=4 P2=4 P3=4 P1>P2"),
    /4–7 plates/,
  );
});
