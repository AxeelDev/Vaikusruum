import { CmsPage, generateCmsMetadata } from "@/components/sections/CmsPage";

export async function generateMetadata() {
  return generateCmsMetadata("tagasiside");
}

export default async function Page() {
  return <CmsPage slug="tagasiside" />;
}
