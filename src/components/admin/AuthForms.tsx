"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { loginAction } from "@/lib/actions/admin";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form className="vr-form" action={action}>
      <label className="vr-field">
        E-post
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label className="vr-field">
        Parool
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {state?.error ? <p className="vr-form-error">{state.error}</p> : null}
      <button className="vr-cta" type="submit">
        Logi sisse
      </button>
    </form>
  );
}

export function BootstrapForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError("");
    const response = await fetch("/api/admin/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
        displayName: formData.get("displayName"),
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Loomine ebaõnnestus.");
      setPending(false);
      return;
    }
    router.push("/admin/sisu");
    router.refresh();
  }

  return (
    <form className="vr-form" action={onSubmit}>
      <label className="vr-field">
        Nimi
        <input name="displayName" />
      </label>
      <label className="vr-field">
        E-post
        <input name="email" type="email" required autoComplete="username" />
      </label>
      <label className="vr-field">
        Parool
        <input name="password" type="password" required minLength={10} autoComplete="new-password" />
      </label>
      {error ? <p className="vr-form-error">{error}</p> : null}
      <button className="vr-cta" type="submit" disabled={pending}>
        Loo esimene administraator
      </button>
    </form>
  );
}
