import type { Instrumentation } from "next";

// Every server error lands in the Vercel logs as one searchable line ("[server-error]"),
// so a log alert or drain can pick it up.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const err = error as Error & { digest?: string };
  console.error(
    "[server-error]",
    JSON.stringify({
      message: err.message,
      digest: err.digest,
      path: request.path,
      method: request.method,
      route: context.routePath,
      kind: context.routeType,
    }),
  );
};
