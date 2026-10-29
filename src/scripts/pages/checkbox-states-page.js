/**
 * @file checkbox-states-page.js
 * @description Renders every <app-checkbox> state from the Figma "Checkbox + Text"
 * matrix (position × checked × state × error) for visual comparison.
 */
(function () {
  var DESCRIPTION = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

  var ROWS = [
    { title: "Default", attrs: "" },
    { title: "Disabled", attrs: " disabled" },
    { title: "Error", attrs: " error" },
  ];
  var VALUES = [
    { title: "Unchecked", attrs: "" },
    { title: "Checked", attrs: " checked" },
    { title: "Partial", attrs: " indeterminate" },
  ];
  var POSITIONS = ["left", "right"];

  function cell(position, row, value, withDescription) {
    return (
      '<app-checkbox label="Label" position="' + position + '"' +
      (withDescription ? ' description="' + DESCRIPTION + '"' : "") +
      row.attrs + value.attrs + "></app-checkbox>"
    );
  }

  function section(withDescription) {
    var head =
      '<div></div>' +
      POSITIONS.map(function (position) {
        return VALUES.map(function (value) {
          return (
            '<div class="text-xs font-medium text-violet-500 capitalize">' +
            position + " · " + value.title + "</div>"
          );
        }).join("");
      }).join("");

    var body = ROWS.map(function (row) {
      return (
        '<div class="text-xs font-medium text-violet-500">' + row.title + "</div>" +
        POSITIONS.map(function (position) {
          return VALUES.map(function (value) {
            return "<div>" + cell(position, row, value, withDescription) + "</div>";
          }).join("");
        }).join("")
      );
    }).join("");

    return (
      '<section class="flex flex-col gap-3">' +
      '<h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">Description: ' +
      (withDescription ? "True" : "False") + "</h2>" +
      '<div class="grid grid-cols-[5rem_repeat(6,minmax(11rem,1fr))] items-start gap-x-6 gap-y-6 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-gray-900">' +
      head + body + "</div></section>"
    );
  }

  var root = document.getElementById("checkbox-states");
  if (root) root.innerHTML = section(true) + section(false);
})();
