import { ContactSettings } from "@/components/admin/ContactSettings";
import { getSiteSettings } from "@/lib/content/queries";

export default async function KontaktAdminPage() {
  const settings = await getSiteSettings();
  return <ContactSettings settings={settings} />;
}
