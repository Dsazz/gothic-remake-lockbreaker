import { LINK, createMatrix } from "./domain.js";

/** Verified Old Camp tower door (6 plates). */
export function oldCampExample() {
  const matrix = createMatrix(6);
  matrix[5][1] = LINK.SAME;
  matrix[5][2] = LINK.OPP;
  matrix[4][0] = LINK.OPP;
  matrix[4][5] = LINK.SAME;
  matrix[3][1] = LINK.SAME;
  matrix[2][0] = LINK.OPP;
  matrix[2][5] = LINK.SAME;
  matrix[1][0] = LINK.OPP;
  matrix[1][2] = LINK.SAME;
  matrix[0][4] = LINK.OPP;

  return {
    plateCount: 6,
    matrix,
    positions: [-3, -2, 3, 3, 2, 1],
  };
}
