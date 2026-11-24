// QA seed for src/pages/smart-enroll/application.html?tab=configuration (TCDM-5247):
// toggle on, account chosen, min/max saved, so the audits see the fields. Seeded once, before the page scripts run.
(function () {
  try {
    if (sessionStorage.getItem("se_cfg_seeded")) return;
    sessionStorage.setItem("se_cfg_seeded", "1");
    sessionStorage.setItem("se_status_v1", JSON.stringify("not-submitted"));
    // Key = SmartEnroll.storageKey("configuration");
    sessionStorage.setItem("se_tab_configuration", JSON.stringify({ enabled: true, account: "ba_chk_4821", min: "100.00", max: "5,000.00" }));
  } catch (e) { /* ignore */ }
})();
