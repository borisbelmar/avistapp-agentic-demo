import { isHidden, progress, userScore } from "./rules";

describe("isHidden", () => {
  it("is visible right above the threshold", () => {
    expect(isHidden(-4)).toBe(false);
  });

  it("is hidden at the threshold", () => {
    expect(isHidden(-5)).toBe(true);
  });
});

describe("userScore", () => {
  it("is zero with no votes and an empty collection", () => {
    expect(userScore(0, 0)).toBe(0);
  });

  it("adds the species bonus per collected species", () => {
    expect(userScore(-3, 2)).toBe(17);
  });
});

describe("progress", () => {
  it("is zero with an empty catalog", () => {
    expect(progress(0, 550)).toBe(0);
  });

  it("is the collection fraction of the catalog", () => {
    expect(progress(55, 550)).toBe(0.1);
  });
});
