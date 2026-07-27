import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="brand-mark">
          <span className="brand-mark__glyph" aria-hidden="true">
            v
          </span>
          <span>vorb-ui</span>
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
