import { getCustomCss, getTheme } from "@/lib/content/queries";
import { sanitizeCustomCss, themeToCssVars } from "@/lib/theme/theme";

// Pages are prerendered and served from cache. Saving in the admin revalidates them at once;
// the hourly refresh is only a safety net for anything changed outside the admin.
export const revalidate = 3600;

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [theme, customCss] = await Promise.all([getTheme(), getCustomCss()]);

  return (
    <div className="vr-public" style={themeToCssVars(theme)}>
      {customCss ? <style>{sanitizeCustomCss(customCss)}</style> : null}
      {children}
    </div>
  );
}
