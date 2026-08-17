import { getCustomCss, getTheme } from "@/lib/content/queries";
import { sanitizeCustomCss, themeToCssVars } from "@/lib/theme/theme";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [theme, customCss] = await Promise.all([getTheme(), getCustomCss()]);

  return (
    <div style={themeToCssVars(theme)}>
      {customCss ? <style>{sanitizeCustomCss(customCss)}</style> : null}
      {children}
    </div>
  );
}
