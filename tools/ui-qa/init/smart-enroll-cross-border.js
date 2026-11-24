// QA seed for src/pages/smart-enroll/application.html (TCDM-5249, T9): Cross-Border Payments add-on added,
// API data source + one Connected bank (so the FX Provider section sits under "Your Bank Accounts").
// Use with ?tab=transactional or ?tab=connectors (&fx=existing|new for the In Progress card).
(function () {
  try {
    if (sessionStorage.getItem("se_qa_cross_border")) return;
    sessionStorage.setItem("se_qa_cross_border", "1");
    sessionStorage.setItem("se_addons_v1", JSON.stringify({ "cross-border": true }));
    sessionStorage.setItem(
      "se_tab_connectors",
      JSON.stringify({
        source: "api",
        view: "choices",
        erp: null,
        api: null,
        banks: [{ id: "qa-bank", bankId: "boa", name: "Operating account", holder: "Operating account", routing: "123456789", account: "999991231", status: "connected" }],
      }),
    );
  } catch (e) {
    /* private mode */
  }
})();
