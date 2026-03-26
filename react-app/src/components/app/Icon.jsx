import clsx from 'clsx';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/16/solid';
import { ExclamationTriangleIcon, BuildingLibraryIcon, CreditCardIcon } from '@heroicons/react/20/solid';
import { CUSTOM_ICON_NOTES } from '@/components/app/icon-registry';

const SYSTEM_ICONS = {
  arrowLeft: ArrowLeftIcon,
  refresh: ArrowPathIcon,
  check: CheckIcon,
  chevronDown: ChevronDownIcon,
  chevronLeft: ChevronLeftIcon,
  chevronRight: ChevronRightIcon,
  chevronUp: ChevronUpIcon,
  close: XMarkIcon,
  copy: DocumentDuplicateIconFallback,
  danger: ExclamationTriangleIcon,
  edit: PencilSquareIcon,
  ellipsis: EllipsisHorizontalIcon,
  eye: EyeIcon,
  eyeSlash: EyeSlashIcon,
  info: InformationCircleIcon,
  plus: PlusIcon,
  trash: TrashIcon,
};

function DocumentDuplicateIconFallback(props) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M5.25 4A2.25 2.25 0 0 0 3 6.25v8.5A2.25 2.25 0 0 0 5.25 17h6.5A2.25 2.25 0 0 0 14 14.75v-8.5A2.25 2.25 0 0 0 11.75 4h-6.5Z" />
      <path d="M7.5 2A2.25 2.25 0 0 1 9.75 4.25V4h2A3.75 3.75 0 0 1 15.5 7.75v5A2.25 2.25 0 0 0 17 10.65v-5.4A3.25 3.25 0 0 0 13.75 2h-6.25Z" />
    </svg>
  );
}

export function Icon({ className, name, title }) {
  if (name === 'bank') {
    return <BuildingLibraryIcon aria-hidden="true" className={clsx('size-4', className)} title={title} />;
  }

  if (name === 'card') {
    return <CreditCardIcon aria-hidden="true" className={clsx('size-4', className)} title={title} />;
  }

  const Component = SYSTEM_ICONS[name];

  if (!Component) {
    return null;
  }

  return <Component aria-hidden="true" className={clsx('size-4', className)} title={title} />;
}
