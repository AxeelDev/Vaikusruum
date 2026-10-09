import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContactForm } from "@/components/forms/ContactForm";
import { RegistrationBlock } from "@/components/forms/RegistrationBlock";
import type { FormEdit } from "@/components/forms/form-edit";
import { ContactDetails } from "@/components/public/ContactDetails";
import { FORM_COPY_DEFAULTS, readFormCopy } from "@/lib/content/form-copy";
import { buildLessonOptions } from "@/lib/content/lesson-options";
import { DEFAULT_PRIVATE_LESSONS } from "@/lib/content/private-lessons";
import type { OfferingRow, SiteSettings } from "@/types/content";

const settings: SiteSettings = {
  id: 1,
  site_name: "Vaikusruum",
  contact_name: "Miina Laanesaar",
  contact_email: "miina@example.com",
  contact_phone: "55585161",
  company_name: "Kõlavõlu OÜ",
  registry_code: "14342017",
  iban: "EE827700771002774537",
  bank: "LHV",
  default_registration_email: null,
  social: {},
  footer_text: null,
};

const options = buildLessonOptions(
  [{ id: "o1", slug: "kundalini-jooga", title: "Kundalini jooga", short_title: "Kundalini jooga" }],
  DEFAULT_PRIVATE_LESSONS.map((lesson) => ({ ...lesson, sectionId: "lessons-section" })),
);

/** An `edit` that marks each text it is asked to wrap and records what it wrapped. */
function recorder() {
  const copy: string[] = [];
  const setting: string[] = [];
  const option: string[] = [];
  const email: string[] = [];
  const edit: FormEdit = {
    copy: (key, text): ReactNode => {
      copy.push(key);
      return createElement("mark", { "data-copy": key }, text);
    },
    setting: (key, text): ReactNode => {
      setting.push(key);
      return createElement("mark", { "data-setting": key }, text);
    },
    option: (item, label): ReactNode => {
      option.push(item.key);
      return createElement("mark", { "data-option": item.key }, label);
    },
    email: (address): ReactNode => {
      email.push(address);
      return createElement("mark", { "data-email": true }, address);
    },
  };
  return { edit, copy, setting, option, email };
}

const render = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node);

describe("every text of the contact form can be edited", () => {
  it("hands each label, button, sentence and contact line to the editor", () => {
    const spy = recorder();
    const markup = render(
      createElement(ContactForm, { kind: "private_lesson", settings, lessonOptions: options, edit: spy.edit, copy: readFormCopy({}) }),
    );
    for (const key of [
      "formKindLabel",
      "formKindContact",
      "formKindLesson",
      "formClassLabel",
      "formUnsure",
      "formName",
      "formEmail",
      "formPhone",
      "formMessage",
      "formConsent",
      "formPrivacyLink",
      "formSubmit",
      "contactRegistryLabel",
      "contactIbanLabel",
    ]) {
      expect(spy.copy, `copy ${key}`).toContain(key);
    }
    expect(spy.setting).toEqual(["contact_name", "contact_email", "contact_phone", "company_name", "registry_code", "iban", "bank"]);
    // Offerings and private-lesson types are edited where they are written; "pole veel kindel" is wording of this form.
    expect(spy.option).toEqual(["kundalini-jooga", "pehme-jooga-ja-gongilodvestus", "individuaaltund-rasedale"]);
    expect(markup).toContain("Milline tund?");
  });

  it("shows the class list in the editor even before Registreerumine is chosen, marked as hidden for visitors", () => {
    const spy = recorder();
    const markup = render(createElement(ContactForm, { settings, lessonOptions: options, edit: spy.edit }));
    expect(markup).toContain("Milline tund?");
    expect(markup).toContain("vr-editor-hidden");
    const visitors = render(createElement(ContactForm, { settings, lessonOptions: options }));
    expect(visitors).not.toContain("Milline tund?");
  });

  it("reads the saved wording instead of the defaults", () => {
    const copy = readFormCopy({ formName: "Sinu nimi", formSubmit: "Saada ära", formKindLesson: "Eratund kodus" });
    const markup = render(createElement(ContactForm, { settings, copy }));
    expect(markup).toContain("Sinu nimi");
    expect(markup).toContain("Saada ära");
    expect(markup).toContain("Eratund kodus");
    expect(markup).not.toContain(">Nimi<");
  });

  it("makes the registration button and the e-mail alternative editable", () => {
    const offering = {
      id: "o1",
      slug: "x",
      title: "X",
      short_title: null,
      location_name: null,
      address: null,
      schedule_summary: null,
      tasakaal: null,
      registration_mode: "external_link",
      registration_email: null,
      registration_url: "https://example.com",
      active: true,
    } as OfferingRow;
    const link = recorder();
    const linkMarkup = render(createElement(RegistrationBlock, { offering, fallbackEmail: null, edit: link.edit, copy: FORM_COPY_DEFAULTS }));
    expect(link.copy).toEqual(["registerCta"]);
    expect(linkMarkup).toContain("Registreeri");

    const mail = recorder();
    const mailMarkup = render(
      createElement(RegistrationBlock, { offering: { ...offering, registration_mode: "email", registration_email: "tund@example.com" }, fallbackEmail: null, edit: mail.edit }),
    );
    expect(mail.email).toEqual(["tund@example.com"]);
    expect(mailMarkup).toContain("tund@example.com");
  });
});

describe("contact details", () => {
  it("leaves empty lines out for visitors but keeps them, as placeholders, in the editor", () => {
    const sparse: SiteSettings = { ...settings, contact_name: null, company_name: null, registry_code: null, iban: null, bank: null };
    const visitors = render(createElement(ContactDetails, { settings: sparse }));
    expect(visitors).not.toContain("Registrikood");
    expect(visitors).toContain("miina@example.com");

    const spy = recorder();
    render(createElement(ContactDetails, { settings: sparse, edit: spy.edit }));
    expect(spy.setting).toEqual(["contact_name", "contact_email", "contact_phone", "company_name", "registry_code", "iban", "bank"]);
    const placeholders = render(createElement(ContactDetails, { settings: sparse, edit: spy.edit }));
    expect(placeholders).toContain("vr-editor-hidden");
    expect(placeholders).toContain(">Ettevõte<");
  });
});
