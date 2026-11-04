/**
 * @file checkbox-component.js
 * @description <app-checkbox> web component (Figma SMART System, node 16:895).
 * Wraps a native <input type="checkbox"> so form, keyboard and a11y behaviour
 * stay native. Light DOM; visuals come from src/styles/checkbox.css (link it on the page).
 *
 * Attributes: checked, indeterminate, disabled, error, name, value, aria-label,
 *             label, description, position ("left" default | "right"),
 *             input-id (id for the inner input; `id` stays on the host)
 * Content:    child nodes of the element become the label (HTML allowed) when no
 *             `label` attribute is given.
 * Forwarded:  every data-* attribute moves to the inner input, so scripts that
 *             query `input[type="checkbox"][data-…]` keep working.
 * Properties: checked, indeterminate, disabled, error, input (native element)
 * Events:     native "change" / "input" bubble from the inner input.
 *
 * With `label` the component is the Figma "Checkbox + Text" variant (checkbox,
 * label and optional help text, clickable as one control); without it, the bare box.
 *
 * Usage:
 *   <app-checkbox name="agree" aria-label="Agree"></app-checkbox>
 *   <app-checkbox checked label="Label" description="Help text"></app-checkbox>
 *   <app-checkbox position="right" label="Label" error></app-checkbox>
 */

(function () {
  function boolAttr(el, name, on) {
    if (on) el.setAttribute(name, "");
    else el.removeAttribute(name);
  }

  class AppCheckbox extends HTMLElement {
    static get observedAttributes() {
      return [
        "checked",
        "indeterminate",
        "disabled",
        "error",
        "name",
        "value",
        "aria-label",
        "aria-describedby",
        "label",
        "description",
        "position",
      ];
    }

    connectedCallback() {
      if (this._input) return;
      var input = document.createElement("input");
      input.type = "checkbox";
      this._input = input;

      // Static setup: move data-* / input-id to the input, children to the label.
      Array.prototype.slice.call(this.attributes).forEach(function (attr) {
        if (attr.name.indexOf("data-") === 0) {
          input.setAttribute(attr.name, attr.value);
          this.removeAttribute(attr.name);
        }
      }, this);
      if (this.hasAttribute("input-id")) input.id = this.getAttribute("input-id");
      var parsing = document.readyState === "loading";

      // Box wrapper: `py-0.5` aligns the 16px box with the first text line (20px).
      this._box = document.createElement("span");
      this._box.className = "inline-grid size-4 shrink-0";
      this._box.appendChild(input);

      this._labelEl = document.createElement("span");
      this._descEl = document.createElement("span");
      this._text = document.createElement("span");
      this._text.appendChild(this._labelEl);
      this._text.appendChild(this._descEl);

      // <label> makes the text clickable and names the input for assistive tech.
      // While the page is still parsing, children may not have arrived yet, so
      // assume a label unless the author marked the element `bare`.
      this._wrap = document.createElement(
        this.hasAttribute("label") || (parsing && !this.hasAttribute("bare")) || this._hasChildContent()
          ? "label"
          : "span",
      );
      this._wrap.appendChild(this._box);
      this._wrap.appendChild(this._text);

      // The input must exist immediately (scripts look it up by id/data-*), but the
      // label text may still be streaming in: keep absorbing children until parsed.
      this._absorb();
      this.appendChild(this._wrap);
      if (parsing) {
        this._observer = new MutationObserver(() => this._absorb());
        this._observer.observe(this, { childList: true });
        document.addEventListener(
          "DOMContentLoaded",
          () => {
            this._absorb();
            this._observer.disconnect();
          },
          { once: true },
        );
      }

      // Clicking a partial checkbox resolves it to a plain checked/unchecked state.
      input.addEventListener("change", () => {
        // Update `checked` first: each attribute write re-syncs the input.
        boolAttr(this, "checked", input.checked);
        this.removeAttribute("indeterminate");
      });

      // Padding/background authored on the host should be clickable too.
      this.addEventListener("click", (e) => {
        if (this._wrap.contains(e.target) || input.disabled) return;
        if (e.target.closest("a, button")) return;
        input.click();
      });

      this._sync();
    }

    _hasChildContent() {
      return Array.prototype.some.call(this.childNodes, function (n) {
        return n.nodeType === 1 || (n.nodeType === 3 && /\S/.test(n.textContent));
      });
    }

    /** Move author-provided children (the label body) into the label element. */
    _absorb() {
      var moved = false;
      Array.prototype.slice.call(this.childNodes).forEach(function (n) {
        if (n === this._wrap) return;
        // <x slot="description"> carries rich help text (e.g. with a link).
        var isDesc = n.nodeType === 1 && n.getAttribute("slot") === "description";
        (isDesc ? this._descEl : this._labelEl).appendChild(n);
        if (isDesc) n.removeAttribute("slot");
        moved = true;
      }, this);
      this._hasContent = /\S/.test(this._labelEl.textContent) || !!this._labelEl.querySelector("*");
      if (moved && this._wrap.parentNode) this._syncLayout();
    }

    attributeChangedCallback() {
      if (this._input) this._sync();
    }

    _syncLayout() {
      var hasLabel = this._hasContent || this.hasAttribute("label");
      var right = this.getAttribute("position") === "right";
      var desc = this.getAttribute("description");

      var disabled = this.hasAttribute("disabled");
      // Display comes from checkbox.css (keyed on [bare]) so a `hidden` class still wins.
      this.toggleAttribute("bare", !hasLabel);
      this._wrap.className = hasLabel
        ? "group flex items-start " +
          (right ? "flex-row-reverse justify-between gap-4" : "gap-3") +
          (disabled ? " cursor-not-allowed" : " cursor-pointer")
        : "contents";
      this._box.className =
        "inline-grid size-4 shrink-0" + (hasLabel ? " mt-0.5" : "");

      this._text.className = hasLabel
        ? "flex min-w-0 flex-1 flex-col text-sm leading-5"
        : "hidden";
      if (!this._hasContent) this._labelEl.textContent = this.getAttribute("label") || "";
      this._labelEl.className =
        "font-medium " +
        (disabled
          ? "text-gray-500 dark:text-gray-500"
          : "text-gray-700 group-hover:text-gray-800 dark:text-gray-200 dark:group-hover:text-white");
      if (desc) this._descEl.textContent = desc;
      var hasDesc = !!desc || this._descEl.childNodes.length > 0;
      this._descEl.className = hasDesc
        ? "font-normal " +
          (disabled
            ? "text-gray-400 dark:text-gray-600"
            : "text-gray-500 dark:text-gray-400")
        : "hidden";
    }

    _sync() {
      var input = this._input;
      this._syncLayout();
      input.disabled = this.hasAttribute("disabled");
      input.checked = this.hasAttribute("checked");
      input.indeterminate = this.hasAttribute("indeterminate");
      ["name", "value", "aria-label", "aria-describedby"].forEach(function (attr) {
        if (this.hasAttribute(attr)) input.setAttribute(attr, this.getAttribute(attr));
        else input.removeAttribute(attr);
      }, this);
      if (this.hasAttribute("error")) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }

    get input() {
      return this._input;
    }
    get checked() {
      return this.hasAttribute("checked");
    }
    set checked(v) {
      boolAttr(this, "checked", v);
    }
    get indeterminate() {
      return this.hasAttribute("indeterminate");
    }
    set indeterminate(v) {
      boolAttr(this, "indeterminate", v);
    }
    get disabled() {
      return this.hasAttribute("disabled");
    }
    set disabled(v) {
      boolAttr(this, "disabled", v);
    }
    get error() {
      return this.hasAttribute("error");
    }
    set error(v) {
      boolAttr(this, "error", v);
    }
  }

  if (!customElements.get("app-checkbox")) {
    customElements.define("app-checkbox", AppCheckbox);
  }
})();
