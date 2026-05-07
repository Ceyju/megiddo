"use client";
import Link from 'next/link';

export default function HoverLink({ href, children, style, hoverStyle }: {
  href: string; children: React.ReactNode;
  style?: React.CSSProperties; hoverStyle?: React.CSSProperties;
}) {
  return (
    <Link href={href} style={style}
      onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, hoverStyle)}
      onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, style)}
    >{children}</Link>
  );
}