import { describe, expect, it } from "vitest";
import { splitWordmark } from "@/lib/content/wordmark";

describe("splitWordmark", () => {
  it("splits a stored space or line break", () => {
    expect(splitWordmark("Vaikus ruum")).toEqual(["Vaikus", "ruum"]);
    expect(splitWordmark("Vaikus\nruum")).toEqual(["Vaikus", "ruum"]);
  });

  it("splits the compact brand without inventing other words", () => {
    expect(splitWordmark("VAIKUSRUUM")).toEqual(["VAIKUS", "RUUM"]);
    expect(splitWordmark("Vaikusruum")).toEqual(["Vaikus", "ruum"]);
  });

  it("leaves longer phrases and empty values alone", () => {
    expect(splitWordmark("Võta meiega ühendust")).toBeNull();
    expect(splitWordmark("")).toBeNull();
  });
});
