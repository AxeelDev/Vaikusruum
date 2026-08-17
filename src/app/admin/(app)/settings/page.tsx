import { ContactSettings } from "@/components/admin/ContactSettings";
import { getSiteSettings } from "@/lib/content/queries";

export default async function SettingsPage() {
  const settings = await getSiteSettings();
  return <ContactSettings settings={settings} />;
}
