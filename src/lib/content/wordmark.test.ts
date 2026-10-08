import { describe, expect, it } from "vitest";
import { splitWordmark } from "@/lib/content/wordmark";

describe("splitWordmark", () => {
  it("splits only on a stored line break", () => {
    expect(splitWordmark("Vaikus\nruum")).toEqual(["Vaikus", "ruum"]);
  });

  it("keeps the brand as one word", () => {
    expect(splitWordmark("VAIKUSRUUM")).toBeNull();
    expect(splitWordmark("Vaikusruum")).toBeNull();
    expect(splitWordmark("Vaikus ruum")).toBeNull();
  });

  it("leaves longer phrases and empty values alone", () => {
    expect(splitWordmark("Võta meiega ühendust")).toBeNull();
    expect(splitWordmark("")).toBeNull();
  });
});
