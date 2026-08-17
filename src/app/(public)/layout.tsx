import { PublicHeader } from "@/components/public/PublicHeader";
import { getCustomCss, getNavItems, getSiteSettings, getTheme } from "@/lib/content/queries";
import { sanitizeCustomCss, themeToCssVars } from "@/lib/theme/theme";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [theme, nav, settings, customCss] = await Promise.all([
    getTheme(),
    getNavItems(),
    getSiteSettings(),
    getCustomCss(),
  ]);

  return (
    <div className="vr-site" style={themeToCssVars(theme)}>
      {customCss ? <style>{sanitizeCustomCss(customCss)}</style> : null}
      <PublicHeader items={nav} />
      <main className="vr-main">{children}</main>
      <footer className="vr-footer">
        <p>{settings.footer_text ?? settings.site_name}</p>
      </footer>
    </div>
  );
}
