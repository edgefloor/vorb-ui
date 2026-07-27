import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
  const options = baseOptions();
  return (
    <DocsLayout {...options} nav={{ ...options.nav, mode: "top" }} tree={source.getPageTree()}>
      {children}
    </DocsLayout>
  );
}
