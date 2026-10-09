import { describe, expect, it } from "vitest";
import {
  UNSURE_KEY,
  UNSURE_LABEL,
  buildLessonOptions,
  findLessonOption,
  lessonKey,
  lessonsFromSections,
  privateLessonHref,
  resolveLessonParam,
  submissionClassLabel,
} from "@/lib/content/lesson-options";
import { DEFAULT_PRIVATE_LESSONS } from "@/lib/content/private-lessons";

const offerings = [
  { id: "o1", slug: "kundalini-jooga", title: "Kundalini jooga", short_title: "Kundalini jooga" },
  { id: "o2", slug: "pehme-jooga-ja-gong", title: "Pehme jooga ja gong", short_title: "Pehme jooga ja lõõgastus Veenuse gongiga" },
];

describe("buildLessonOptions", () => {
  it("lists offerings, then lesson types no offering covers, then 'Pole veel kindel'", () => {
    const options = buildLessonOptions(offerings, DEFAULT_PRIVATE_LESSONS);
    expect(options.map((option) => option.label)).toEqual([
      "Kundalini jooga",
      "Pehme jooga ja lõõgastus Veenuse gongiga",
      "Pehme jooga ja gongilõdvestus",
      "Individuaaltund rasedale",
      UNSURE_LABEL,
    ]);
    expect(options.at(-1)?.key).toBe(UNSURE_KEY);
  });

  it("keeps the offering version when a lesson type has the same title", () => {
    const options = buildLessonOptions(offerings, [{ title: "  kundalini   JOOGA " }]);
    const matches = options.filter((option) => option.label.toLowerCase().includes("kundalini"));
    expect(matches).toEqual([{ key: "kundalini-jooga", label: "Kundalini jooga", offeringId: "o1" }]);
  });

  it("also matches a lesson against an offering's full title", () => {
    const options = buildLessonOptions(offerings, [{ title: "Pehme jooga ja gong" }]);
    expect(options.map((option) => option.label)).not.toContain("Pehme jooga ja gong");
  });

  it("drops blank and repeated lesson titles and keeps keys unique", () => {
    const options = buildLessonOptions([], [{ title: "" }, { title: "Rasedale" }, { title: "rasedale" }, { title: "Pole veel kindel" }]);
    expect(options.map((option) => option.label)).toEqual(["Rasedale", "Pole veel kindel", UNSURE_LABEL]);
    expect(new Set(options.map((option) => option.key)).size).toBe(options.length);
  });

  it("offers only the unsure choice when nothing else exists", () => {
    expect(buildLessonOptions([], [])).toEqual([{ key: UNSURE_KEY, label: UNSURE_LABEL, offeringId: null }]);
  });
});

describe("lesson keys and lookup", () => {
  it("makes a URL-safe key from Estonian text", () => {
    expect(lessonKey("Pehme jooga ja gongilõdvestus")).toBe("pehme-jooga-ja-gongilodvestus");
    expect(lessonKey("Individuaaltund rasedale!")).toBe("individuaaltund-rasedale");
  });

  it("finds an option by key and rejects unknown ones", () => {
    const options = buildLessonOptions(offerings, DEFAULT_PRIVATE_LESSONS);
    expect(findLessonOption(options, "individuaaltund-rasedale")?.label).toBe("Individuaaltund rasedale");
    expect(findLessonOption(options, "kundalini-jooga")?.offeringId).toBe("o1");
    expect(findLessonOption(options, "nope")).toBeUndefined();
    expect(findLessonOption(options, null)).toBeUndefined();
  });

  it("reads lessons from enabled private_lessons sections only", () => {
    const lessons = lessonsFromSections([
      { section_type: "private_lessons", content: { lessons: [{ title: "A" }] } },
      { section_type: "private_lessons", enabled: false, content: { lessons: [{ title: "B" }] } },
      { section_type: "contact", content: { lessons: [{ title: "C" }] } },
    ]);
    expect(lessons.map((lesson) => lesson.title)).toEqual(["A"]);
  });
});

describe("submissionClassLabel", () => {
  it("prefers the offering title, then the topic", () => {
    expect(submissionClassLabel({ offeringTitle: "Kundalini jooga", topic: "x" })).toBe("Kundalini jooga");
    expect(submissionClassLabel({ topic: "Individuaaltund rasedale" })).toBe("Individuaaltund rasedale");
    expect(submissionClassLabel({})).toBeNull();
  });
});

describe("class links", () => {
  it("adds the class to the default contact link only", () => {
    expect(privateLessonHref({}, "Individuaaltund rasedale")).toBe("/kontakt?teema=eratund&tund=individuaaltund-rasedale");
    expect(privateLessonHref({ actionHref: "/kontakt" }, "Kundalini jooga")).toBe("/kontakt?tund=kundalini-jooga");
    expect(privateLessonHref({ actionHref: "https://example.com/book" }, "Kundalini jooga")).toBe("https://example.com/book");
    expect(privateLessonHref({ actionHref: "/minust" }, "Kundalini jooga")).toBe("/minust");
  });

  it("resolves a link to an option by key or by the key of its label", () => {
    const options = buildLessonOptions(offerings, DEFAULT_PRIVATE_LESSONS);
    expect(resolveLessonParam(options, "pehme-jooga-ja-gongilodvestus")?.label).toBe("Pehme jooga ja gongilõdvestus");
    expect(resolveLessonParam(options, "pehme-jooga-ja-loogastus-veenuse-gongiga")?.key).toBe("pehme-jooga-ja-gong");
    expect(resolveLessonParam(options, "unknown")).toBeUndefined();
    expect(resolveLessonParam(options, null)).toBeUndefined();
  });
});
