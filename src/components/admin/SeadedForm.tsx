"use client";

import { useState } from "react";
import { createAdminAction, removeAdminAction } from "@/lib/actions/admin";
import type { AdminUser } from "@/lib/auth/admin";

export function SeadedForm({
  admin,
  users,
}: {
  admin: AdminUser;
  users: { user_id: string; role: string; display_name: string | null; created_at: string }[];
}) {
  const [message, setMessage] = useState("");

  return (
    <div>
      <h1 className="vr-admin-title">Seaded</h1>
      <p>
        Sisse logitud: {admin.email} ({admin.role === "owner" ? "omanik" : "toimetaja"})
      </p>
      {admin.role === "owner" ? (
        <>
          <h2 className="vr-heading">Haldurid</h2>
          <ul>
            {users.map((user) => (
              <li key={user.user_id}>
                {user.display_name || user.user_id} — {user.role}{" "}
                {user.user_id !== admin.id ? (
                  <button type="button" onClick={() => removeAdminAction(user.user_id)}>
                    Eemalda
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <form
            className="vr-form"
            action={async (formData) => {
              const result = await createAdminAction(
                String(formData.get("email")),
                String(formData.get("password")),
                formData.get("role") === "owner" ? "owner" : "editor",
              );
              setMessage(result && "error" in result ? result.error! : "Lisatud.");
            }}
          >
            <label className="vr-field">
              E-post
              <input name="email" type="email" required />
            </label>
            <label className="vr-field">
              Parool
              <input name="password" type="password" minLength={10} required />
            </label>
            <label className="vr-field">
              Roll
              <select name="role" defaultValue="editor">
                <option value="editor">Toimetaja</option>
                <option value="owner">Omanik</option>
              </select>
            </label>
            <button className="vr-cta" type="submit">
              Lisa haldur
            </button>
          </form>
          {message ? <p>{message}</p> : null}
        </>
      ) : (
        <p className="vr-muted">Toimetaja ei saa haldureid hallata.</p>
      )}
    </div>
  );
}
