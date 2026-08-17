import { CmsPage, generateCmsMetadata } from "@/components/sections/CmsPage";

export async function generateMetadata() {
  return generateCmsMetadata("avaleht");
}

export default async function HomePage() {
  return <CmsPage slug="avaleht" />;
}
