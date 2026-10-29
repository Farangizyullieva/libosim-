import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

// Shared by <Button> and by router <Link>s that should look like buttons,
// so a "button" looks the same whether it submits a form or navigates.
export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
) {
  return clsx(
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60',
    {
      'bg-accent text-white hover:bg-accent-hover': variant === 'primary',
      'border border-border bg-surface text-text hover:border-border-strong hover:bg-surface-muted':
        variant === 'secondary',
      'bg-transparent text-text-muted hover:bg-surface-muted hover:text-text': variant === 'ghost',
      'bg-danger text-white hover:opacity-90': variant === 'danger',
    },
    {
      'h-8 px-3 text-sm': size === 'sm',
      'h-10 px-4 text-sm': size === 'md',
      'h-12 px-6 text-base': size === 'lg',
    },
    className,
  );
}
