export function isInternalAppHref(href) {
  return typeof href === 'string' && href.startsWith('/');
}

export function toAppHref(href) {
  return isInternalAppHref(href) ? `#${href}` : href;
}
