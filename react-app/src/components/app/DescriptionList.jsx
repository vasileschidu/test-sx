import clsx from 'clsx';
import {
  DescriptionDetails as CatalystDescriptionDetails,
  DescriptionList as CatalystDescriptionList,
  DescriptionTerm as CatalystDescriptionTerm,
} from '@/components/catalyst/description-list';

export function DescriptionList({ className, ...props }) {
  return <CatalystDescriptionList {...props} className={clsx('w-full', className)} />;
}

export function DescriptionTerm({ className, ...props }) {
  return <CatalystDescriptionTerm {...props} className={clsx('font-medium text-gray-900 dark:text-white', className)} />;
}

export function DescriptionDetails({ className, ...props }) {
  return <CatalystDescriptionDetails {...props} className={clsx('text-gray-700 dark:text-gray-300', className)} />;
}
