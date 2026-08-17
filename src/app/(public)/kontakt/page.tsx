import { CmsPage, generateCmsMetadata } from "@/components/sections/CmsPage";

export async function generateMetadata() {
  return generateCmsMetadata("kontakt");
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ teema?: string }>;
}) {
  const { teema } = await searchParams;
  return <CmsPage slug="kontakt" teema={teema} />;
}
