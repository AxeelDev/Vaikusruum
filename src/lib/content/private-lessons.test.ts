import { describe, expect, it } from "vitest";
import { readPrivateLessons, readPrivatePrices } from "@/lib/content/private-lessons";

describe("private lesson rows", () => {
  // The inspector edits through these readers: a trimmed value would swallow Enter or a space as it is typed.
  it("keep a line break or space typed at the end", () => {
    const lessons = readPrivateLessons({ lessons: [{ title: "Tund ", duration: "1 h\n", description: "Rida\n" }] });
    expect(lessons[0]).toEqual({ title: "Tund ", duration: "1 h\n", description: "Rida\n" });
    const prices = readPrivatePrices({ prices: [{ label: "Hind\n", amount: "80 € " }] });
    expect(prices[0]).toEqual({ label: "Hind\n", amount: "80 € " });
  });

  it("read missing values as empty text", () => {
    expect(readPrivateLessons({ lessons: [{}] })[0]).toEqual({ title: "", duration: "", description: "" });
    expect(readPrivateLessons({})).toEqual([]);
  });
});
