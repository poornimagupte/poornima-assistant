"use client";

import { type ReactNode } from "react";

// Downloads a PDF URL to the app cache dir and opens it with the system's
// default PDF application (Acrobat if installed + set as default, else Preview).
async function openPdfNatively(url: string): Promise<void> {
  const { openPath } = await import("@tauri-apps/plugin-opener");
  const { appCacheDir } = await import("@tauri-apps/api/path");
  const { writeFile, mkdir } = await import("@tauri-apps/plugin-fs");

  const res = await fetch(url);
  if (!res.ok) throw new Error("fetch failed");
  const buf = await res.arrayBuffer();

  const cacheDir = await appCacheDir();
  const dir = `${cacheDir.replace(/\/$/, "")}/pdfs`;
  await mkdir(dir, { recursive: true }).catch(() => {});
  const path = `${dir}/pattern-${Date.now()}.pdf`;
  await writeFile(path, new Uint8Array(buf));
  await openPath(path);
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
        await openPdfNatively(href);
      } else {
        const { openUrl } = await import("@tauri-apps/plugin-opener");
        await openUrl(href);
      }
    } catch (err) {
      console.error("[ExternalAnchor] failed:", err);
      // Browser fallback.
      window.open(href, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
