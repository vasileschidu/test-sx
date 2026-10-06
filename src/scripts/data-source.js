/**
 * data-source.js
 * The one place the prototype loads its data from.
 *
 * Every table and page used to carry its own copy of a "try these three paths"
 * JSON loader — six near-identical implementations, each with its own path
 * constants. They are now thin wrappers around this module, so there is a
 * single seam to change when the data moves off static JSON.
 *
 * Swapping to an API is a one-line change here:
 *
 *   DataSource.configure({ apiBaseUrl: 'https://…workers.dev/api' });
 *
 * With that set, load() requests `<apiBaseUrl>/<dataset>` instead of the JSON
 * file, where <dataset> is the filename without its extension. Callers keep
 * passing whatever they pass today — path arrays are still accepted and the
 * dataset name is derived from them — so nothing downstream has to change.
 */
window.DataSource = (function () {
  "use strict";

  var apiBaseUrl = "";
  var inFlight = {};

  /** Dataset name from a path or name: '../src/data/payees.json' -> 'payees'. */
  function datasetName(value) {
    var last = String(value || "")
      .split("?")[0]
      .split("/")
      .pop();
    return last.replace(/\.json$/i, "");
  }

  function toCandidates(input) {
    if (Array.isArray(input)) return input.filter(Boolean);
    if (typeof input === "string" && input) {
      // A bare dataset name resolves against the usual locations.
      if (input.indexOf("/") === -1) {
        var file = /\.json$/i.test(input) ? input : input + ".json";
        return [
          "../../../src/data/" + file,
          "/src/data/" + file,
          "./src/data/" + file,
          "../../src/data/" + file,
        ];
      }
      return [input];
    }
    return [];
  }

  function fetchJson(url, init) {
    return fetch(url, init).then(function (response) {
      if (!response.ok)
        throw new Error("HTTP " + response.status + " for " + url);
      return response.json();
    });
  }

  /** Try each candidate in turn; the first that responds wins. */
  function loadFromPaths(paths) {
    var index = 0;
    function tryNext() {
      if (index >= paths.length) {
        return Promise.reject(
          new Error("Failed to load data from: " + paths.join(", ")),
        );
      }
      return fetchJson(paths[index++], { cache: "no-store" }).catch(tryNext);
    }
    return tryNext();
  }

  /**
   * @param {string|string[]} source dataset name, a path, or path candidates
   * @returns {Promise<any>}
   */
  function load(source) {
    var candidates = toCandidates(source);
    if (!candidates.length)
      return Promise.reject(new Error("No data source given."));
    var name = datasetName(candidates[0]);

    // Several scripts ask for the same dataset on one page; share the request
    // rather than fetching bills-payables.json three times over.
    if (inFlight[name]) return inFlight[name];

    var request = apiBaseUrl
      ? fetchJson(apiBaseUrl.replace(/\/$/, "") + "/" + name, {
          cache: "no-store",
        })
      : loadFromPaths(candidates);

    inFlight[name] = request;
    request
      .catch(function () {})
      .then(function () {
        delete inFlight[name];
      });
    return request;
  }

  function configure(options) {
    if (options && typeof options.apiBaseUrl === "string")
      apiBaseUrl = options.apiBaseUrl;
  }

  return { load: load, configure: configure, datasetName: datasetName };
})();
