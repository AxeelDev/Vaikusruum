import { CmsPage, generateCmsMetadata } from "@/components/sections/CmsPage";

export async function generateMetadata() {
  return generateCmsMetadata("kontakt");
}

// ?teema=eratund is read by the contact form in the browser, so this page stays static.
export default async function Page() {
  return <CmsPage slug="kontakt" />;
}
