import { BrandMark } from "./brand-mark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <BrandMark />
      <p>Voice-state primitives for React.</p>
      <span>Built for realtime interfaces.</span>
    </footer>
  );
}
