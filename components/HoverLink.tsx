"use client";
import Link from 'next/link';

export default function HoverLink({ href, children, style, hoverStyle, className }: {
  href: string; children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties; hoverStyle?: React.CSSProperties;
}) {
  return (
    <Link href={href} style={style} className={className}
      onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, hoverStyle)}
      onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, style)}
    >{children}</Link>
  );
}
