"use client";

import { useState, useTransition } from "react";
import { sendMagicLink } from "./actions";

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign in with magic link
          </h1>
          <p className="text-sm text-zinc-600">
            We’ll email you a link to sign in. No passwords.
          </p>
        </div>

        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setMessage(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await sendMagicLink(formData);
              setMessage(res.message);
            });
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Email</span>
            <input
              className="h-11 rounded-md border border-zinc-200 bg-white px-3 outline-none ring-zinc-900/10 focus:ring-4"
              type="email"
              name="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <button
            className="mt-1 inline-flex h-11 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Sending…" : "Send magic link"}
          </button>

          {message ? (
            <p className="text-sm text-zinc-700" role="status">
              {message}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
