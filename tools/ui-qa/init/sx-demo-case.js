// QA seed for the SMART Exchange enrolment pages (src/pages/sx-enroll/*.html?case=SX-QA):
// a demo case with STP on (self-signed) and an account, so every step renders with data.
(function () {
  try {
    if (localStorage.getItem("sx_demo_case_v1")) return;
    localStorage.setItem(
      "sx_demo_case_v1",
      JSON.stringify({
        id: "SX-QA",
        createdAt: "2026-11-05T09:00:00.000Z",
        supplier: { name: "Pinnacle Group", address: "2972 Westheimer Rd\nSuite 1010\nChicago, Illinois 85486\nUnited States", tin: "12-3450001", contactFirst: "Johnny", contactLast: "Anderson", email: "johnny@hotmail.com", phone: "+1 (555) 987-6543" },
        payer: { name: "Horizon Inc", address: "3476 Orphan Road\nSuite 1010\nHayward, Wisconsin 54843\nUnited States" },
        payment: { amount: 3526, currency: "USD", invoice: "PG-3526", dateInitiated: "2026-11-05", cardBrand: "Visa", cardNumber: "5444123400005612", expires: "12/2026", cvc: "999" },
        signer: { firstName: "Michelle", lastName: "Jackson", email: "demo.signer@example.com" },
        scenario: "A",
        enrol: { stp: "on", signer: "self", agreementSigned: true, agreement: { signedBy: "Johnny Anderson", confirmedAt: "2026-11-05T09:10:00.000Z" }, cardProcessed: null, account: { username: "johnny@hotmail.com" }, completedAt: null },
        stp: { mid: null, tid: null },
      }),
    );
    sessionStorage.setItem("sx-enroll-state:SX-QA", JSON.stringify({ signature: { method: "type", name: "Johnny Anderson", signedAt: "2026-11-05T09:05:00.000Z" } }));
  } catch (e) {}
})();
