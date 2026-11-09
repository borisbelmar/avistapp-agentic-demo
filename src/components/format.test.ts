import { formatRelativeDate, formatScore, normalizeForSearch } from "./format";

// Constructor local: el resultado no depende de la zona horaria de quien ejecuta la prueba.
const now = new Date(2026, 9, 19, 12, 0);

function isoBefore(ms: number): string {
  return new Date(now.getTime() - ms).toISOString();
}

describe("formatRelativeDate", () => {
  it.each([
    [59 * 1000, "ahora"],
    [60 * 1000, "hace 1 min"],
    [59 * 60 * 1000, "hace 59 min"],
    [60 * 60 * 1000, "hace 1 h"],
    [23 * 60 * 60 * 1000, "hace 23 h"],
    [24 * 60 * 60 * 1000, "hace 1 d"],
    [6 * 24 * 60 * 60 * 1000, "hace 6 d"],
    [7 * 24 * 60 * 60 * 1000, "12 oct 2026"],
  ])("%s ms ago -> %s", (ms, expected) => {
    expect(formatRelativeDate(isoBefore(ms), now)).toBe(expected);
  });
});

describe("formatScore", () => {
  it.each([
    [12, "+12"],
    [0, "0"],
    [-3, "\u22123"],
  ])("%s -> %s", (score, expected) => {
    expect(formatScore(score)).toBe(expected);
  });
});

describe("normalizeForSearch", () => {
  it("strips accents and lowercases", () => {
    expect(normalizeForSearch("Cóndor")).toBe("condor");
  });
});
