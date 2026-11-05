// QA seed for the other signer's page (src/pages/sx-enroll/sign-agreement.html?case=SX-QA-B):
// enrolment branch B with a signing request sent and STP at agreement_signature_pending.
(function () {
  try {
    var c = JSON.parse(localStorage.getItem("sx_demo_case_v1") || "null");
    if (c && c.id === "SX-QA-B") return;
    localStorage.setItem(
      "sx_demo_case_v1",
      JSON.stringify({
        id: "SX-QA-B",
        createdAt: "2026-11-05T09:00:00.000Z",
        supplier: { name: "Pinnacle Group", address: "2972 Westheimer Rd\nChicago, Illinois 85486", tin: "12-3450001", contactFirst: "Johnny", contactLast: "Anderson", email: "johnny@hotmail.com", phone: "+1 (555) 987-6543" },
        payer: { name: "Horizon Inc", address: "3476 Orphan Road\nHayward, Wisconsin 54843" },
        payment: { amount: 3526, currency: "USD", invoice: "PG-3526", dateInitiated: "2026-11-05", cardBrand: "Visa", cardNumber: "5444123400005612", expires: "12/2026", cvc: "999" },
        signer: { firstName: "Michelle", lastName: "Jackson", email: "demo.signer@example.com" },
        scenario: "B",
        enrol: { stp: "on", signer: "other", agreementSigned: false, agreement: { delegatedTo: "Michelle Jackson", email: "demo.signer@example.com", sentAt: "2026-11-05T09:10:00.000Z", delivered: false } },
        stp: { mid: null, tid: null },
      }),
    );
    localStorage.setItem("sx_global_stp_state_v3", JSON.stringify({ stpStatus: "in_progress", stpStep: "agreement_signature_pending" }));
    localStorage.setItem("sx_stp_agreement_request_v1", JSON.stringify({ email: "demo.signer@example.com", sentAt: "2026-11-05T09:10:00.000Z", delivered: false }));
  } catch (e) {}
})();
