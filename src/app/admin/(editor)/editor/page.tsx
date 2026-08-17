import { VisualEditor } from "@/components/editor/VisualEditor";
import { EditorProvider } from "@/components/editor/EditorProvider";
import { getAdminUser } from "@/lib/auth/admin";
import { getEditorBundle } from "@/lib/content/queries";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditorPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin");
  const initial = await getEditorBundle();

  return (
    <EditorProvider initial={initial} role={admin.role}>
      <VisualEditor />
    </EditorProvider>
  );
}
