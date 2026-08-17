import { CmsPage, generateCmsMetadata } from "@/components/sections/CmsPage";

export async function generateMetadata() {
  return generateCmsMetadata("pehme-jooga-ja-gong");
}

export default async function Page() {
  return <CmsPage slug="pehme-jooga-ja-gong" />;
}
