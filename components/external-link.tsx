"use client";

import { type ReactNode } from "react";

// Detect if running inside Tauri
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

// Opens a PDF: downloads to cache and opens natively in Tauri,
// or opens in a new browser tab otherwise.
async function openPdf(url: string): Promise<void> {
  if (!isTauri()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const { openPath } = await import("@tauri-apps/plugin-opener");
  const { appCacheDir } = await import("@tauri-apps/api/path");
  const { writeFile, mkdir } = await import("@tauri-apps/plugin-fs");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch PDF (${res.status})`);
  const buf = await res.arrayBuffer();

  const cacheDir = await appCacheDir();
  const dir = `${cacheDir.replace(/\/$/, "")}/pdfs`;
  await mkdir(dir, { recursive: true }).catch(() => {});
  const path = `${dir}/pattern-${Date.now()}.pdf`;
  await writeFile(path, new Uint8Array(buf));
  await openPath(path);
}

// Opens a URL externally — in system browser (Tauri) or new tab (browser).
async function openExternal(url: string): Promise<void> {
  if (!isTauri()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}

export function ExternalAnchor({
  href,
  className,
  children,
  isPdf = false,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  isPdf?: boolean;
}) {
  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    try {
      if (isPdf) {
        await openPdf(href);
      } else {
        await openExternal(href);
      }
    } catch (err) {
      console.error("[ExternalAnchor] failed:", err);
      // Last-resort fallback
      window.open(href, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
