// QA seed for the SMART Enroll Ownership tab (src/pages/smart-enroll/application.html?tab=ownership):
// two saved owners (Individual 10%, Legal Entity 25% with Additional Details) and the second one opened,
// so the audits reach the owner rows, Remove, the expand toggle, radios, selects, Save changes and Cancel.
(function () {
  try {
    sessionStorage.setItem(
      "se_tab_ownership",
      JSON.stringify({
        owners: [
          { id: "qa1", type: "individual", firstName: "Johnny", lastName: "Anderson", legalName: "", answer: "no", share: "10", details: {}, govId: [] },
          {
            id: "qa2", type: "legal", firstName: "", lastName: "", legalName: "ABC Industries Inc.", answer: "yes", share: "25",
            details: { address: "One Liberty Plaza", zip: "10006", city: "New York", building: "", apt: "", state: "NY", country: "US", bizPhone: "+1 (555) 987-6543", bizEmail: "", incCountry: "US" },
            govId: [],
          },
        ],
        doc: [],
      }),
    );
  } catch (e) {}
  window.addEventListener("load", function () {
    setTimeout(function () {
      var btn = document.querySelector('[data-own-toggle="qa2"]');
      if (btn && btn.getAttribute("aria-expanded") !== "true") btn.click();
    }, 600);
  });
})();
