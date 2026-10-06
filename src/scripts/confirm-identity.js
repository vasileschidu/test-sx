/**
 * Confirm Identity page logic.
 *
 * Handles real-time uppercase formatting of the Invoice Number and Vendor ID
 * inputs, enables/disables the "Next" button based on whether both fields are
 * filled in, and navigates to the next onboarding step on click.
 */
document.addEventListener('DOMContentLoaded', () => {
  const invoiceInput = document.getElementById('invoice-number');
  const vendorInput = document.getElementById('vendor-id');
  const nextButton = document.getElementById('next-button');

  /**
   * Convert a string value to uppercase (free-form, no masking).
   *
   * @param {string} value - The raw input value.
   * @returns {string} The uppercased string.
   */
  function toUpperFreeForm(value) {
    return value.toUpperCase();
  }

  /**
   * Enable the "Next" button only when both the invoice number and vendor ID
   * inputs contain non-empty (trimmed) values; disable it otherwise.
   */
  function updateNextState() {
    const ready = invoiceInput.value.trim() !== '' && vendorInput.value.trim() !== '';
    nextButton.disabled = !ready;
  }

  invoiceInput.addEventListener('input', () => {
    invoiceInput.value = toUpperFreeForm(invoiceInput.value);
    updateNextState();
  });

  vendorInput.addEventListener('input', () => {
    vendorInput.value = toUpperFreeForm(vendorInput.value);
    updateNextState();
  });

  nextButton.addEventListener('click', () => {
    if (!nextButton.disabled) {
      window.location.href = 'confirm-business-details.html';
    }
  });

  updateNextState();
});
