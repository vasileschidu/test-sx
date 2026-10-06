import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/components/catalyst/dialog';

export function Modal({ children, description, open, title, ...props }) {
  return (
    <Dialog open={open} size="lg" {...props}>
      {title ? <DialogTitle>{title}</DialogTitle> : null}
      {description ? <DialogDescription>{description}</DialogDescription> : null}
      <DialogBody>{children}</DialogBody>
    </Dialog>
  );
}

export { DialogActions };
