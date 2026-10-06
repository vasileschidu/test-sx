/**
 * Confirm Business Details page scripts.
 *
 * Handles the TIN (Taxpayer Identification Number) visibility toggle,
 * allowing the user to reveal or mask the TIN value by clicking the
 * eye icon button.
 */

document.addEventListener('DOMContentLoaded', () => {
  const tinValue = document.getElementById('tin-value');
  const tinToggle = document.getElementById('tin-toggle');
  const tinEye = document.getElementById('tin-eye');
  const tinEyeSlash = document.getElementById('tin-eye-slash');

  const maskedTin = '\u2022\u2022\u2022\u2022\u2022 0001';
  const fullTin = '98-7650001';

  /**
   * Toggles the TIN between its masked and fully-visible states.
   * Updates the displayed text, ARIA attributes, and swaps the
   * eye / eye-slash icons accordingly.
   */
  tinToggle.addEventListener('click', () => {
    const showingMasked = tinValue.textContent === maskedTin;

    tinValue.textContent = showingMasked ? fullTin : maskedTin;
    tinToggle.setAttribute('aria-label', showingMasked ? 'Hide TIN' : 'Show TIN');
    tinToggle.setAttribute('aria-pressed', showingMasked ? 'true' : 'false');
    tinEye.classList.toggle('hidden', showingMasked);
    tinEyeSlash.classList.toggle('hidden', !showingMasked);
  });
});
