import { createSightingSchema, locationSchema, registerSchema } from "./schemas";

describe("registerSchema.username", () => {
  it.each([
    ["ab", false],
    ["abc", true],
    ["a".repeat(20), true],
    ["a".repeat(21), false],
    ["ana-aves", false],
    ["ana aves", false],
    ["ñandu", false],
  ])("%s -> %s", (username, success) => {
    expect(registerSchema.shape.username.safeParse(username).success).toBe(success);
  });
});

describe("registerSchema.password", () => {
  it.each([
    ["a".repeat(7), false],
    ["a".repeat(8), true],
  ])("length %s -> %s", (password, success) => {
    expect(registerSchema.shape.password.safeParse(password).success).toBe(success);
  });
});

describe("locationSchema", () => {
  it.each([
    [90, true],
    [-90, true],
    [90.0001, false],
    [-90.0001, false],
    [NaN, false],
  ])("latitude %s -> %s", (latitude, success) => {
    expect(locationSchema.shape.latitude.safeParse(latitude).success).toBe(success);
  });

  it.each([
    [180, true],
    [-180, true],
    [180.0001, false],
    [-180.0001, false],
  ])("longitude %s -> %s", (longitude, success) => {
    expect(locationSchema.shape.longitude.safeParse(longitude).success).toBe(success);
  });
});

describe("createSightingSchema.speciesId", () => {
  it("rejects an empty id", () => {
    expect(createSightingSchema.shape.speciesId.safeParse("").success).toBe(false);
  });
});
