import { type ReactNode } from "react";
import { TopNav } from "@/components/top-nav";

// Shared page chrome: top nav + centered main column.
// maxWidth lets wide views (planner, pipeline) stretch further.
export function AppShell({
  name,
  children,
  maxWidth = "max-w-4xl",
}: {
  name: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav name={name} />
      <main className={`w-full mx-auto flex-1 px-6 py-8 md:px-10 ${maxWidth}`}>
        {children}
      </main>
    </div>
  );
}
