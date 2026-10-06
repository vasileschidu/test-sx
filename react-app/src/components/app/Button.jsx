import clsx from 'clsx';
import { TouchTarget } from '@/components/catalyst/button';
import { toAppHref } from '@/lib/navigation';

const BASE_BUTTON =
  'relative inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const SIZE_STYLES = {
  sm: 'gap-1.5 px-2.5 py-1.5',
  md: 'gap-x-2 px-3.5 py-2.5',
};

const TONE_STYLES = {
  primary:
    'bg-blue-600 text-white shadow-xs hover:bg-blue-500 focus-visible:outline-blue-600 disabled:bg-blue-300 disabled:hover:bg-blue-300 dark:bg-blue-600 dark:hover:bg-blue-500 dark:disabled:bg-blue-900/40 dark:disabled:text-white/90',
  secondary:
    'bg-white text-gray-700 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-blue-600 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:hover:bg-white/10',
  secondaryStrong:
    'bg-white text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-blue-600 dark:bg-white/5 dark:text-white dark:inset-ring-white/10 dark:hover:bg-white/10',
  utility:
    'bg-gray-100 text-gray-700 hover:bg-gray-200 focus-visible:outline-blue-600 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20 dark:focus-visible:outline-blue-500',
  danger:
    'bg-red-600 text-white shadow-xs hover:bg-red-500 focus-visible:outline-red-600 disabled:bg-red-300 dark:disabled:bg-red-900/40',
  link:
    'bg-transparent text-blue-600 hover:bg-blue-600/10 focus-visible:outline-blue-600 dark:bg-blue-600/10 dark:text-blue-400 dark:hover:bg-blue-600/20',
};

const BASE_ICON_BUTTON =
  'relative inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50';

const ICON_SIZE_STYLES = {
  xs: 'size-6',
  sm: 'h-8 w-8 p-1',
  md: 'size-7',
};

const ICON_TONE_STYLES = {
  plain:
    'text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-300',
  subtle:
    'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20',
};

function renderButtonElement({ children, className, href, type, ...props }) {
  if (typeof href === 'string') {
    return (
      <a {...props} className={className} href={toAppHref(href)}>
        <TouchTarget>{children}</TouchTarget>
      </a>
    );
  }

  return (
    <button {...props} className={className} type={type || 'button'}>
      <TouchTarget>{children}</TouchTarget>
    </button>
  );
}

export function Button({
  block = false,
  children,
  className,
  href,
  size = 'sm',
  tone = 'secondary',
  type,
  ...props
}) {
  const classes = clsx(
    BASE_BUTTON,
    block && 'w-full',
    SIZE_STYLES[size] || SIZE_STYLES.sm,
    TONE_STYLES[tone] || TONE_STYLES.secondary,
    className,
  );

  return renderButtonElement({ ...props, children, className: classes, href, type });
}

export function IconButton({
  children,
  className,
  href,
  size = 'sm',
  tone = 'plain',
  type,
  ...props
}) {
  const classes = clsx(
    BASE_ICON_BUTTON,
    ICON_SIZE_STYLES[size] || ICON_SIZE_STYLES.sm,
    ICON_TONE_STYLES[tone] || ICON_TONE_STYLES.plain,
    className,
  );

  return renderButtonElement({ ...props, children, className: classes, href, type });
}
