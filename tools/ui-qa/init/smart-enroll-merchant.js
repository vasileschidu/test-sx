// QA seed for SMART Enroll (src/pages/smart-enroll/application.html?tab=financial|business-plan):
// turns the Merchant Services add-on on so its Financial and Business Plan tabs render (TCDM-5248).
(function () {
  try {
    if (!sessionStorage.getItem("se_addons_v1")) sessionStorage.setItem("se_addons_v1", JSON.stringify({ merchant: true }));
  } catch (e) {
    /* storage blocked */
  }
})();
