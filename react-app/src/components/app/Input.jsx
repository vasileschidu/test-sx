import clsx from 'clsx';
import { Description, ErrorMessage, Field, FieldGroup, Label } from '@/components/catalyst/fieldset';

const INPUT_CLASSES =
  'block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-blue-500';

export function FormField({
  className,
  description,
  error,
  label,
  inputClassName,
  ...props
}) {
  return (
    <Field className={className}>
      {label ? <Label>{label}</Label> : null}
      {description ? <Description>{description}</Description> : null}
      <input {...props} className={clsx(INPUT_CLASSES, inputClassName)} />
      {error ? <ErrorMessage>{error}</ErrorMessage> : null}
    </Field>
  );
}

export { Field, FieldGroup, Label, Description, ErrorMessage };
