"use client";

import { useState } from "react";
import { createAdminAction, removeAdminAction } from "@/lib/actions/admin";
import type { AdminUser } from "@/lib/auth/admin";

export function AdminUsersList({
  admin,
  users,
}: {
  admin: AdminUser;
  users: { user_id: string; role: string; display_name: string | null; created_at: string }[];
}) {
  const [message, setMessage] = useState("");

  return (
    <div className="vr-admin-panel">
      <h1 className="vr-admin-title">Administraatorid</h1>
      <div className="vr-admin-list">
        {users.map((user) => (
          <div key={user.user_id} className="vr-admin-list-row">
            <span>
              <strong>{user.display_name || user.user_id}</strong>
              <small>{user.role === "owner" ? "Owner" : "Editor"}</small>
            </span>
            {user.user_id !== admin.id ? (
              <button type="button" onClick={() => removeAdminAction(user.user_id)}>
                Eemalda
              </button>
            ) : (
              <small className="vr-admin-note">Praegune kasutaja</small>
            )}
          </div>
        ))}
      </div>
      <section className="vr-admin-section">
        <h2>Lisa administraator</h2>
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
      </section>
    </div>
  );
}
