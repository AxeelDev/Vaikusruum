import { ThemeEditor } from "@/components/admin/ThemeEditor";
import { getTheme } from "@/lib/content/queries";

export default async function DesignPage() {
  const theme = await getTheme();
  return (
    <div className="vr-admin-panel">
      <ThemeEditor initial={theme} />
    </div>
  );
}
