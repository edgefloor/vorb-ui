import Link from "next/link";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand-mark" href="/" aria-label="vorb-ui home">
      <span className="brand-mark__glyph" aria-hidden="true">
        v
      </span>
      {!compact && <span>vorb-ui</span>}
    </Link>
  );
}
