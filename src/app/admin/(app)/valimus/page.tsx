import { ThemeEditor } from "@/components/admin/ThemeEditor";
import { getTheme } from "@/lib/content/queries";

export default async function ValimusPage() {
  const theme = await getTheme();
  return <ThemeEditor initial={theme} />;
}
