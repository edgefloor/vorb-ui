import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { BrandContent } from "@/components/brand-mark";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="brand-mark">
          <BrandContent />
        </span>
      ),
      url: "/",
    },
    themeSwitch: {
      enabled: false,
    },
    links: [
      {
        text: "Playground",
        url: "/playground",
        active: "nested-url",
      },
    ],
  };
}
