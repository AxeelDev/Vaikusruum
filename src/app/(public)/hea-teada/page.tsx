import { CmsPage, generateCmsMetadata } from "@/components/sections/CmsPage";

export async function generateMetadata() {
  return generateCmsMetadata("hea-teada");
}

export default async function Page() {
  return <CmsPage slug="hea-teada" />;
}
