import { CmsPage, generateCmsMetadata } from "@/components/sections/CmsPage";

export async function generateMetadata() {
  return generateCmsMetadata("minust");
}

export default async function Page() {
  return <CmsPage slug="minust" />;
}
