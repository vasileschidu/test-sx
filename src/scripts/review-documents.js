/**
 * Review Documents page logic.
 *
 * Manages the document-review workflow on the onboarding "Review Documents" step.
 * Each document has a "Review" button that opens a modal dialog. When the user
 * clicks "I have read", the review button is replaced with a checked checkbox.
 * The "Next" navigation button is enabled only after every document has been
 * marked as read.
 */
document.addEventListener('DOMContentLoaded', () => {
  /** @type {string|null} The data-doc-id of the document currently being reviewed */
  let activeDocId = null;

  /** @type {NodeListOf<HTMLButtonElement>} All "Review" trigger buttons */
  const reviewButtons = document.querySelectorAll('.review-trigger');

  /** @type {HTMLButtonElement} The "I have read" button inside the review dialog */
  const markReadButton = document.getElementById('mark-read-btn');

  /** @type {HTMLButtonElement} The "Next" navigation button */
  const nextButton = document.getElementById('next-button');

  /** @type {HTMLInputElement[]} Checkboxes that track read-status for each document */
  const checkboxes = [
    document.getElementById('doc-1-checkbox'),
    document.getElementById('doc-2-checkbox'),
    document.getElementById('doc-3-checkbox'),
  ];

  /**
   * Enable or disable the "Next" button based on whether every document
   * checkbox is checked.
   */
  function updateNextButtonState() {
    nextButton.disabled = !checkboxes.every((checkbox) => checkbox.checked);
  }

  // When a review button is clicked, record which document is being reviewed.
  reviewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeDocId = button.dataset.docId;
    });
  });

  // When the user confirms they have read the document, hide the review button,
  // show the checkbox status, check the checkbox, and re-evaluate the Next button.
  markReadButton.addEventListener('click', () => {
    if (!activeDocId) return;

    const reviewButton = document.querySelector(`.review-trigger[data-doc-id="${activeDocId}"]`);
    const status = document.getElementById(`${activeDocId}-status`);
    const checkbox = document.getElementById(`${activeDocId}-checkbox`);
    if (!reviewButton || !status) return;

    reviewButton.classList.add('hidden');
    status.classList.remove('hidden');
    if (checkbox) checkbox.checked = true;
    activeDocId = null;
    updateNextButtonState();
  });

  // Allow manual toggling of checkboxes to also update the Next button state.
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', updateNextButtonState);
  });

  // Navigate to the next step when the Next button is clicked (and enabled).
  nextButton.addEventListener('click', () => {
    if (!nextButton.disabled) {
      window.location.href = 'signature.html';
    }
  });

  // Set the initial state of the Next button on page load.
  updateNextButtonState();
});
