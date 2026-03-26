export function SkeletonBlock({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-gray-200/90 dark:bg-white/10 ${className}`.trim()}
    />
  );
}
