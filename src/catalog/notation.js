// Gothic Solve–style fullSetup notation → our domain lock shape.
// Positions use hole 1–7; matrix[reactor][turned] matches applyMove().

import { LINK, createMatrix, POS_MIN, POS_MAX, MIN_PLATES, MAX_PLATES } from "../core/domain.js";

const POSITION_TOKEN = /^P(\d+)=(\d+)$/i;
const LINK_TOKEN = /^P(\d+)>(.*)$/i;
const TARGET_TOKEN = /^P(\d+)([+-])?$/i;

function holeToPosition(hole) {
  const position = hole - 4;
  if (position < POS_MIN || position > POS_MAX) {
    throw new Error(`Hole ${hole} is out of range (1–7).`);
  }
  return position;
}

function parseTarget(token) {
  const match = token.trim().match(TARGET_TOKEN);
  if (!match) throw new Error(`Link targets must look like \`P2\` or \`P2-\`.`);
  return {
    plateNumber: Number.parseInt(match[1], 10),
    link: match[2] === "-" ? LINK.OPP : LINK.SAME,
  };
}

/**
 * @param {string} fullSetup
 * @returns {{ plateCount: number, positions: number[], matrix: number[][] }}
 */
export function parseFullSetup(fullSetup) {
  const tokens = String(fullSetup || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) throw new Error("Notation is empty.");

  const positionsByPlate = new Map();
  /** @type {{ plateNumber: number, targetsText: string }[]} */
  const linkRows = [];
  let linksStarted = false;

  for (const token of tokens) {
    const positionMatch = token.match(POSITION_TOKEN);
    if (!linksStarted && positionMatch) {
      const plateNumber = Number.parseInt(positionMatch[1], 10);
      const hole = Number.parseInt(positionMatch[2], 10);
      positionsByPlate.set(plateNumber, holeToPosition(hole));
      continue;
    }

    const linkMatch = token.match(LINK_TOKEN);
    if (linkMatch) {
      linksStarted = true;
      linkRows.push({
        plateNumber: Number.parseInt(linkMatch[1], 10),
        targetsText: linkMatch[2],
      });
      continue;
    }

    throw new Error(`Unrecognized notation token: ${token}`);
  }

  if (!positionsByPlate.size) {
    throw new Error("Notation must include plate positions like `P1=4`.");
  }

  const plateNumbers = new Set(positionsByPlate.keys());
  for (const row of linkRows) {
    plateNumbers.add(row.plateNumber);
    for (const part of row.targetsText.split(",").map((s) => s.trim()).filter(Boolean)) {
      plateNumbers.add(parseTarget(part).plateNumber);
    }
  }

  const plateCount = Math.max(...plateNumbers);
  if (!Number.isFinite(plateCount) || plateCount < MIN_PLATES || plateCount > MAX_PLATES) {
    throw new Error(`Notation must include ${MIN_PLATES}–${MAX_PLATES} plates.`);
  }

  const positions = Array.from({ length: plateCount }, (_, index) => {
    const plateNumber = index + 1;
    return positionsByPlate.has(plateNumber) ? positionsByPlate.get(plateNumber) : 0;
  });

  const matrix = createMatrix(plateCount);
  for (const row of linkRows) {
    const turned = row.plateNumber - 1;
    for (const part of row.targetsText.split(",").map((s) => s.trim()).filter(Boolean)) {
      const { plateNumber, link } = parseTarget(part);
      const reactor = plateNumber - 1;
      if (reactor === turned) continue;
      matrix[reactor][turned] = link;
    }
  }

  return { plateCount, positions, matrix };
}
