/**
 * Review Documents page logic.
 *
 * Manages the document-review workflow on the onboarding "Review Documents" step.
 * Each document has a "Review" button that opens a modal dialog. When the user
 * clicks "Done", the review button is replaced with a green check icon.
 * The "Next" navigation button is enabled only after every document has been
 * marked as read.
 */
document.addEventListener('DOMContentLoaded', () => {
  /** @type {string|null} The data-doc-id of the document currently being reviewed */
  let activeDocId = null;

  /** @type {NodeListOf<HTMLButtonElement>} All "Review" trigger buttons */
  const reviewButtons = document.querySelectorAll('.review-trigger');

  /** @type {HTMLButtonElement} The "Done" button inside the review dialog */
  const markReadButton = document.getElementById('mark-read-btn');

  /** @type {HTMLButtonElement} The "Next" navigation button */
  const nextButton = document.getElementById('next-button');

  /** @type {HTMLElement[]} Read-status indicators for each document */
  const statuses = Array.from(document.querySelectorAll('[id$="-status"]'));

  /**
   * Enable or disable the "Next" button based on whether every visible
   * document has been marked as read.
   */
  function updateNextButtonState() {
    const visible = statuses.filter((status) => {
      const row = status.closest('li');
      return !(row && row.classList.contains('hidden'));
    });
    nextButton.disabled = !visible.length || !visible.every((status) => !status.classList.contains('hidden'));
  }

  // When a review button is clicked, record which document is being reviewed.
  reviewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeDocId = button.dataset.docId;
    });
  });

  // When the user confirms they have read the document, hide the review button,
  // show the check icon, and re-evaluate the Next button.
  markReadButton.addEventListener('click', () => {
    if (!activeDocId) return;

    const reviewButton = document.querySelector(`.review-trigger[data-doc-id="${activeDocId}"]`);
    const status = document.getElementById(`${activeDocId}-status`);
    if (!reviewButton || !status) return;

    reviewButton.classList.add('hidden');
    status.classList.remove('hidden');
    activeDocId = null;
    updateNextButtonState();
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
