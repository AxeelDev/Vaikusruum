/**
 * Sends a plain-text e-mail through Resend. The sender must be on a domain verified in Resend
 * (RESEND_FROM, e.g. "Vaikusruum <teavitus@vaikusruum.ee>"); Resend's test sender only reaches the account owner.
 */
export async function sendMail({ to, subject, text, replyTo }: { to: string; subject: string; text: string; replyTo?: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) {
    console.error("[mail] RESEND_API_KEY or RESEND_FROM is not set; e-mail not sent:", subject);
    return false;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    console.error("[mail] Resend rejected the message:", response.status, await response.text().catch(() => ""));
    return false;
  }
  return true;
}
