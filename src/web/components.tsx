import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { toSegments } from '../engine';

export function RichText({ text, className, testId }: { text: string; className?: string; testId?: string }) {
  let segs;
  try {
    segs = toSegments(text);
  } catch {
    segs = [{ text, bold: false }];
  }
  return (
    <p className={['rich', className].filter(Boolean).join(' ')} data-testid={testId}>
      {segs.map((s, i) => (s.bold ? <strong key={i}>{s.text}</strong> : <span key={i}>{s.text}</span>))}
    </p>
  );
}

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';

export function Button({
  variant = 'primary',
  big,
  className,
  testId,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; big?: boolean; testId?: string }) {
  return (
    <button
      type="button"
      data-testid={testId}
      className={['btn', `btn-${variant}`, big ? 'btn-big' : '', className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}

export function LinkButton({
  href,
  variant = 'primary',
  big,
  testId,
  children,
  className,
}: {
  href: string;
  variant?: Variant;
  big?: boolean;
  testId?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a href={href} data-testid={testId} className={['btn', `btn-${variant}`, big ? 'btn-big' : '', className].filter(Boolean).join(' ')}>
      {children}
    </a>
  );
}

export function Screen({
  title,
  back,
  right,
  footer,
  children,
  testId,
  onPointerDown,
}: {
  title?: string;
  back?: string;
  right?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  testId?: string;
  onPointerDown?: () => void;
}) {
  return (
    <div className="screen" data-testid={testId} onPointerDown={onPointerDown}>
      <header className="topbar">
        {back ? (
          <a className="back" href={back} aria-label="戻る" data-testid="back">
            <span aria-hidden="true">‹</span> 戻る
          </a>
        ) : null}
        {title ? <h1 className="topbar-title">{title}</h1> : <span className="topbar-title" />}
        {right ? <div className="topbar-right">{right}</div> : null}
      </header>
      <main className="content">{children}</main>
      {footer ? <footer className="footer">{footer}</footer> : null}
    </div>
  );
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  testIdPrefix,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; sub?: string }[];
  onChange: (v: T) => void;
  testIdPrefix?: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          data-testid={testIdPrefix ? `${testIdPrefix}-${o.value}` : undefined}
          className={o.value === value ? 'seg seg-on' : 'seg'}
          onClick={() => onChange(o.value)}
        >
          <span>{o.label}</span>
          {o.sub ? <small>{o.sub}</small> : null}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Loading() {
  return (
    <div className="loading" role="status">
      読み込み中…
    </div>
  );
}

export const CHUNK_SIZE_OPTIONS = [
  { value: 'short' as const, label: '短め', sub: '約15秒' },
  { value: 'normal' as const, label: '標準', sub: '約30秒' },
  { value: 'long' as const, label: '長め', sub: '約1分' },
];

export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
