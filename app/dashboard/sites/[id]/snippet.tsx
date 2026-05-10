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
      <div className="relative">
        <pre className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 pr-12 text-xs overflow-x-auto">
          <code>{code}</code>
        </pre>
        <button
          type="button"
          aria-label={copied ? 'Copied' : 'Copy snippet'}
          title={copied ? 'Copied' : 'Copy snippet'}
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
    </section>
  );
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-emerald-600 dark:text-emerald-400"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
