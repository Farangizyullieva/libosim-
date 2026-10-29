import { Link } from 'react-router-dom';

export function Logo({ size = 'md', inverted = false }: { size?: 'sm' | 'md'; inverted?: boolean }) {
  const icon = size === 'sm' ? 22 : 26;
  return (
    <Link to="/" className="inline-flex items-center gap-2" aria-label="Libosim">
      <svg width={icon} height={icon} viewBox="0 0 32 32" className="shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
        <path
          d="M16 25 C10.5 23.5 8.5 18.5 9.2 13 C14 12.5 15.8 14.2 16.8 17 C18 14 20.6 11.8 23.4 11.8 C24 18.4 20.6 23.6 16 25 Z"
          fill="#fff"
        />
      </svg>
      <span
        className={`font-display tracking-tight ${inverted ? 'text-white' : 'text-text'} ${size === 'sm' ? 'text-lg' : 'text-xl'}`}
      >
        Libosim
      </span>
    </Link>
  );
}
