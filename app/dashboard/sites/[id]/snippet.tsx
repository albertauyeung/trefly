'use client';

import { useState } from 'react';

export function Snippet({ trackingId }: { trackingId: string }) {
  const origin =
    typeof window === 'undefined' ? '' : window.location.origin;
  const code = `<script defer data-site="${trackingId}" src="${origin || 'https://your-trefly-domain'}/t.js"></script>`;
  const [copied, setCopied] = useState(false);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        Install snippet
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Paste this into the <code>&lt;head&gt;</code> of your site.
      </p>
      <div className="flex flex-col gap-2">
        <pre className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-xs overflow-x-auto">
          <code>{code}</code>
        </pre>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="self-start text-sm text-zinc-700 dark:text-zinc-300 hover:underline"
        >
          {copied ? 'Copied!' : 'Copy snippet'}
        </button>
      </div>
    </section>
  );
}
