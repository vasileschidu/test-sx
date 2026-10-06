import * as Headless from '@headlessui/react';
import React, { forwardRef } from 'react';
import { toAppHref } from '@/lib/navigation';

export const Link = forwardRef(function Link({ href, onClick, ...props }, ref) {
  const resolvedHref = toAppHref(href);

  function handleClick(event) {
    if (typeof onClick === 'function') {
      onClick(event);
    }
  }

  return (
    <Headless.DataInteractive>
      <a {...props} href={resolvedHref} onClick={handleClick} ref={ref} />
    </Headless.DataInteractive>
  );
});
