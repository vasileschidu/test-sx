// QA seed for SMART Enroll Speedy Sign up (src/pages/smart-enroll/sign-up.html?step=2|3):
// Step 1 filled and both consents accepted, so ?step=2 / ?step=3 open directly (shape: smart-enroll/sign-up.js).
(function () {
  try {
    if (sessionStorage.getItem("se_signup_v1")) return;
    sessionStorage.setItem(
      "se_signup_v1",
      JSON.stringify({
        version: 1,
        step: 1,
        reached: 3,
        business: { legalName: "Brightline Supply Co", legalAddress: "120 Harbor View Drive", country: "United States", city: "Portland", state: "Oregon", zip: "97209", email: "office@brightline.example", phone: "+1 (503) 555-0147" },
        consents: { terms: true, privacy: true },
        matchId: "match_1",
        match: null,
        manualReview: false,
        contact: { firstName: "", lastName: "", role: "", email: "", phone: "" },
        prefill: null,
        submittedAt: null,
      }),
    );
  } catch (e) {}
})();
