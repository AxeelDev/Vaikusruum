import Link from "next/link";
import { PagesManager } from "@/components/admin/PagesManager";
import { getSiteSettings } from "@/lib/content/queries";
import { createServerSupabase } from "@/lib/supabase/server";
import type { PageRow } from "@/types/content";

export default async function SeoPage() {
  const [settings, supabase] = await Promise.all([getSiteSettings(), createServerSupabase()]);
  const { data } = await supabase.from("pages").select("*").order("nav_order", { ascending: true });

  return (
    <div className="vr-admin-panel">
      <h1 className="vr-admin-title">SEO</h1>
      <section className="vr-admin-section">
        <h2>Globaalne</h2>
        <p className="vr-admin-note">
          Saidi nimi on praegu SEO pealkirjade vaikimisi järelliide: <strong>{settings.site_name}</strong>.
          Muuda seda <Link href="/admin/settings">üldseadetes</Link>. Lehepõhised SEO väljad on all.
        </p>
      </section>
      <PagesManager pages={(data ?? []) as PageRow[]} />
    </div>
  );
}
