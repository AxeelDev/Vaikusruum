import type { ReactNode } from "react";
import type { ContactSettingKey, FormCopyKey } from "@/lib/content/form-copy";
import type { LessonOption } from "@/lib/content/lesson-options";

/**
 * How the editor makes the texts around a form clickable and editable.
 * Each function wraps a text the visitor reads; on the public site none of this exists and the plain text shows.
 */
export type FormEdit = {
  /** A label, button or sentence kept in the section's content. */
  copy: (key: FormCopyKey, text: string) => ReactNode;
  /** A contact detail from the site settings; `text` is already a placeholder when the detail is empty. */
  setting: (key: ContactSettingKey, text: string) => ReactNode;
  /** One choice in the class list. */
  option: (option: LessonOption, label: string) => ReactNode;
  /** The e-mail address offered as an alternative to the form. */
  email: (email: string) => ReactNode;
};
