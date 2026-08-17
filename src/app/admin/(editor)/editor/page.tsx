import { VisualEditor } from "@/components/editor/VisualEditor";
import { EditorProvider } from "@/components/editor/EditorProvider";
import { getAdminUser } from "@/lib/auth/admin";
import { getEditorBundle } from "@/lib/content/queries";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ debugEditor?: string }>;
}) {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin");

  const { debugEditor } = await searchParams;
  const debug = process.env.NODE_ENV !== "production" && debugEditor === "1";

  let initial;
  try {
    initial = await getEditorBundle();
  } catch (error) {
    console.error("[editor] failed to load bundle:", error);
    return (
      <div className="vr-editor-boot-error">
        <p className="vr-wordmark vr-wordmark--header">VAIKUSRUUM</p>
        <p>Sisu laadimine ebaõnnestus.</p>
        <p>Proovi uuesti.</p>
      </div>
    );
  }

  return (
    <EditorProvider initial={initial} role={admin.role}>
      <VisualEditor debug={debug} />
    </EditorProvider>
  );
}
