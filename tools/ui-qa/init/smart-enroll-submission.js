// QA seed for SMART Enroll Submission (T11): an open authorized-signer request for the default business, so
// application.html shows the "Waiting for signature" box (Resend, Open the email (demo)) and sign.html?token=qa-token
// (and ?view=email) renders the signer's review page / demo email instead of "This link has expired".
(function () {
  try {
    var now = new Date().toISOString();
    localStorage.setItem(
      "se_sign_v1",
      JSON.stringify({
        requests: {
          "qa-token": {
            token: "qa-token",
            businessId: "biz_brightline",
            businessName: "Brightline Supply Company LLC",
            signer: { firstName: "Michelle", lastName: "Jackson", email: "michelle.jackson@brightline-supply.example" },
            note: "Please review and sign by Friday.",
            requestedBy: { name: "Jordan Ellis", role: "CFO", email: "jordan.ellis@brightline-supply.example" },
            sentAt: now,
            summary: [
              { title: "Products", rows: [["AP/AR Payments", "Requested"]] },
              { title: "Business Information", rows: [["Business Legal Name", "Brightline Supply Company LLC"], ["Legal Address", "120 Harbor View Drive, Suite 400, Portland, OR 97209"]] },
              { title: "Ownership", rows: [["Johnny Anderson", "60% ownership"], ["ABC Industries Inc.", "40% ownership"]] },
            ],
            status: "pending",
          },
        },
      }),
    );
    sessionStorage.setItem("se_status_v1", JSON.stringify("not-submitted"));
  } catch (e) {}
})();
