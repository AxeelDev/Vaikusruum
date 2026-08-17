import { CmsPage, generateCmsMetadata } from "@/components/sections/CmsPage";

export async function generateMetadata() {
  return generateCmsMetadata("joogatunni-kkk");
}

export default async function Page() {
  return <CmsPage slug="joogatunni-kkk" />;
}
