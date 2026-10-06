/**
 * Signature page script for the onboarding flow.
 *
 * Provides two signature-capture modes:
 *   - "Draw" — freehand drawing on an HTML canvas via pointer events.
 *   - "Type" — renders the user's typed full name in a cursive font on the canvas.
 *
 * Manages tab switching between modes, canvas sizing for HiDPI displays,
 * clearing the signature, and enabling/disabling the "Next" button based on
 * whether a signature is present.
 */
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('signature-canvas');
  const clearButton = document.getElementById('clear-signature');
  const nextButton = document.getElementById('next-button');
  const context = canvas.getContext('2d');

  const tabDraw = document.getElementById('tab-draw');
  const tabType = document.getElementById('tab-type');
  const typeWrap = document.getElementById('type-input-wrap');
  const fullNameInput = document.getElementById('fullName');

  let isDrawing = false;
  let hasSignature = false;
  let mode = 'draw'; // 'draw' | 'type'

  /**
   * Sets the canvas dimensions to match its CSS layout size multiplied by the
   * device pixel ratio, then configures stroke styles for drawing. If the
   * current mode is "type", redraws the typed signature so it is not lost on
   * resize.
   */
  function setCanvasSize() {
    const ratio = window.devicePixelRatio || 1;
    const bounds = canvas.getBoundingClientRect();
    canvas.width = Math.floor(bounds.width * ratio);
    canvas.height = Math.floor(bounds.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = 2.5;
    context.strokeStyle = '#111827';

    // redraw typed name if in type mode
    if (mode === 'type') drawTypedSignature(fullNameInput.value || '');
  }

  /**
   * Enables or disables the "Next" button depending on whether a signature
   * (drawn or typed) currently exists.
   */
  function updateNextButtonState() {
    nextButton.disabled = !hasSignature;
  }

  /**
   * Returns the pointer position relative to the canvas element.
   * @param {PointerEvent} event - The pointer event.
   * @returns {{ x: number, y: number }} Canvas-relative coordinates.
   */
  function getPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  /**
   * Begins a new drawing path when the user presses down on the canvas
   * (draw mode only).
   * @param {PointerEvent} event
   */
  function handlePointerDown(event) {
    if (mode !== 'draw') return;
    event.preventDefault();
    isDrawing = true;
    const point = getPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  /**
   * Extends the current drawing path as the pointer moves, and marks the
   * signature as present on the first stroke.
   * @param {PointerEvent} event
   */
  function handlePointerMove(event) {
    if (mode !== 'draw' || !isDrawing) return;
    event.preventDefault();
    const point = getPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
    if (!hasSignature) {
      hasSignature = true;
      updateNextButtonState();
    }
  }

  /**
   * Ends the current drawing path when the pointer is released or leaves the
   * canvas (draw mode only).
   */
  function handlePointerUp() {
    if (mode !== 'draw') return;
    isDrawing = false;
    context.closePath();
  }

  /**
   * Clears the entire canvas surface.
   */
  function clearCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  /**
   * Renders the given text onto the canvas in a cursive font, auto-sizing
   * to fit the available width. Updates the hasSignature flag accordingly.
   * @param {string} text - The name to render as a signature.
   */
  function drawTypedSignature(text) {
    clearCanvas();

    const safe = (text || '').trim();
    if (!safe) {
      hasSignature = false;
      updateNextButtonState();
      return;
    }

    // "script" vibe using common cursive stack
    context.save();
    context.fillStyle = '#111827';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // pick a font size that fits width
    const maxWidth = canvas.getBoundingClientRect().width - 48; // padding-ish
    let fontSize = 72;
    const fontStack = "'Meow Script', cursive";

    while (fontSize > 24) {
      context.font = `${fontSize}px ${fontStack}`;
      if (context.measureText(safe).width <= maxWidth) break;
      fontSize -= 2;
    }

    const cx = canvas.getBoundingClientRect().width / 2;
    const cy = canvas.getBoundingClientRect().height / 2;

    context.fillText(safe, cx, cy);
    context.restore();

    hasSignature = true;
    updateNextButtonState();
  }

  /**
   * Switches between "draw" and "type" signature modes, updating tab styles,
   * toggling the type-input visibility, and enabling/disabling canvas pointer
   * events as appropriate.
   * @param {'draw'|'type'} nextMode - The mode to activate.
   */
  function setMode(nextMode) {
    mode = nextMode;

    // Tabs styling
    if (mode === 'draw') {
      tabDraw.className = "rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900";
      tabDraw.setAttribute('aria-current', 'page');

      tabType.className = "rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700";
      tabType.removeAttribute('aria-current');

      typeWrap.classList.add('hidden');

      // enable drawing behavior
      canvas.style.pointerEvents = 'auto';
      // keep whatever was drawn before
    } else {
      tabType.className = "rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900";
      tabType.setAttribute('aria-current', 'page');

      tabDraw.className = "rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700";
      tabDraw.removeAttribute('aria-current');

      typeWrap.classList.remove('hidden');

      // disable drawing interaction
      canvas.style.pointerEvents = 'none';

      drawTypedSignature(fullNameInput.value || '');
    }
  }

  // Events
  tabDraw.addEventListener('click', () => setMode('draw'));
  tabType.addEventListener('click', () => setMode('type'));

  fullNameInput?.addEventListener('input', (e) => {
    if (mode !== 'type') return;
    drawTypedSignature(e.target.value);
  });

  clearButton.addEventListener('click', () => {
    clearCanvas();
    hasSignature = false;
    updateNextButtonState();
    if (mode === 'type') {
      fullNameInput.value = '';
    }
  });

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointerleave', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerUp);

  window.addEventListener('resize', setCanvasSize);

  // init
  setCanvasSize();
  updateNextButtonState();
  setMode('draw');

  nextButton.addEventListener('click', () => {
    if (!nextButton.disabled) {
      window.location.href = 'paywall.html';
    }
  });
  updateNextButtonState();
});
