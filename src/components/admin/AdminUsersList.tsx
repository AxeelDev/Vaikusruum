"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmButton } from "@/components/admin/AdminShell";
import { Field, SettingsCard } from "@/components/admin/ContactSettings";
import { createAdminAction, removeAdminAction } from "@/lib/actions/admin";
import type { AdminUser } from "@/lib/auth/admin";

export type AdminListRow = { user_id: string; role: string; label: string };

export function AdminUsersList({ admin, users }: { admin: AdminUser; users: AdminListRow[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <SettingsCard id="administraatorid" title="Administraatorid" description="Kes saavad halduses sisse logida. Toimetaja saab sisu muuta, omanik ka haldureid lisada.">
      <ul className="vr-admin-rows vr-admin-rows--flat">
        {users.map((user) => (
          <li key={user.user_id}>
            <div>
              <span>
                <strong>{user.label}</strong>
                <small>{user.role === "owner" ? "Omanik" : "Toimetaja"}</small>
              </span>
              {user.user_id === admin.id ? (
                <span className="vr-admin-status">
                  Sina
                </span>
              ) : (
                <ConfirmButton
                  label="Eemalda"
                  confirmLabel="Eemalda"
                  question="Eemaldada ligipääs?"
                  onConfirm={async () => {
                    const result = await removeAdminAction(user.user_id);
                    if (result && "error" in result && result.error) setStatus({ tone: "error", text: result.error });
                    else {
                      setStatus({ tone: "ok", text: "Ligipääs eemaldatud." });
                      router.refresh();
                    }
                  }}
                />
              )}
            </div>
          </li>
        ))}
      </ul>

      <details className="vr-admin-disclosure">
        <summary>Lisa administraator</summary>
        <form
          className="vr-admin-form"
          action={async (formData) => {
            setPending(true);
            const result = await createAdminAction(
              String(formData.get("email")),
              String(formData.get("password")),
              formData.get("role") === "owner" ? "owner" : "editor",
            );
            setPending(false);
            if (result && "error" in result && result.error) setStatus({ tone: "error", text: result.error });
            else {
              setStatus({ tone: "ok", text: "Administraator lisatud." });
              router.refresh();
            }
          }}
        >
          <div className="vr-admin-grid-2">
            <Field label="E-post">
              <input name="email" type="email" autoComplete="off" required />
            </Field>
            <Field label="Parool" hint="Vähemalt 10 märki.">
              <input name="password" type="password" autoComplete="new-password" minLength={10} required />
            </Field>
          </div>
          <Field label="Roll">
            <select name="role" defaultValue="editor">
              <option value="editor">Toimetaja</option>
              <option value="owner">Omanik</option>
            </select>
          </Field>
          <div>
            <button className="vr-admin-btn vr-admin-btn--primary" type="submit" disabled={pending}>
              {pending ? "Lisan…" : "Lisa administraator"}
            </button>
          </div>
        </form>
      </details>
      {status ? (
        <p className="vr-admin-inline-status" role="status" data-tone={status.tone}>
          {status.text}
        </p>
      ) : null}
    </SettingsCard>
  );
}
