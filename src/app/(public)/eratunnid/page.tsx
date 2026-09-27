import { CmsPage, generateCmsMetadata } from "@/components/sections/CmsPage";

export async function generateMetadata() {
  return generateCmsMetadata("eratunnid");
}

export default async function Page() {
  return <CmsPage slug="eratunnid" />;
}
