import { CmsPage, generateCmsMetadata } from "@/components/sections/CmsPage";

export async function generateMetadata() {
  return generateCmsMetadata("kundalini-jooga");
}

export default async function Page() {
  return <CmsPage slug="kundalini-jooga" />;
}
