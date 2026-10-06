/**
 * sd-uk-claim.js
 * Profile + sample data for the UK SMART Disburse demo (insurance claim payout).
 *
 * Everything the UK flow shows that is not static copy lives here, so the same
 * pages can be re-skinned for another client or claim by editing one file.
 * Kept as a script (not JSON) so the flow renders without a fetch and works
 * from any static host.
 */
window.SD_UK_CLAIM = {
  locale: 'en-GB',
  currency: 'GBP',

  payer: {
    name: 'AT Insurance Ltd.',
    email: 'claims@atinsurance.co.uk',
    phone: '+44 (0) 20 7946 0958'
  },

  claimant: {
    firstName: 'Charles',
    lastName: 'Calderon',
    phone: '+44 (0) 161 942 4700',
    phoneMasked: '+44 016****00',
    email: 'charles.calderon@mail.com',
    address: {
      line1: '1 Ashley Rd',
      line2: '',
      city: 'Altrincham',
      region: 'Cheshire',
      postcode: 'WA14 2DT',
      country: 'United Kingdom of Great Britain and Northern Ireland',
      countryShort: 'United Kingdom'
    }
  },

  claim: {
    number: '123456789',
    amount: 475,
    message: 'Your claim AI431794 for medical expenses has been approved. Please review the claim form and choose how you would like to receive your payment.',
    expires: 'Wed, Nov 4 2026',
    document: {
      title: 'Insurance claim',
      intro: 'Please ensure the details of the document are accurate and accept below to proceed with the payment.',
      fileName: 'claim_form_-_globecover_-_medical_expenses_ai431794_1212_tcm2538-446920',
      type: 'PDF',
      size: '146.5 KB',
      pages: 5
    }
  },

  // The demo accepts any 6 digits; this is what "Request Code" pre-fills on tap.
  otp: '594382',

  card: {
    number: '5115-9502-8176-1020',
    cvc: '911',
    expiry: '04/27'
  },

  bank: {
    sortCode: '401255',
    bankName: 'Barclays Bank PLC',
    accountNumber: '31926819'
  },

  receipt: {
    date: 'Tue, Feb 18 2025 01:12:01 PM (ET)',
    cardTransactionId: '233DFERDRGRG54EV45GT',
    bankTransactionId: '4fe52d3-e584-4c24-a1b4-f2849b12126',
    clientReferenceId: '0f54da0c-90b4-4059-a3e2-30c0957c46ec'
  },

  regions: [
    'Cheshire', 'Greater London', 'Greater Manchester', 'Merseyside', 'West Midlands',
    'West Yorkshire', 'South Yorkshire', 'Lancashire', 'Kent', 'Essex', 'Surrey',
    'Hampshire', 'Devon', 'Edinburgh', 'Glasgow', 'Cardiff', 'Belfast'
  ]
};

/** Stepper for the UK flow, read by onboarding-stepper.js (sidebar + mobile header). */
window.OB_FLOW_STEPS = [
  { id: 'verify', label: 'Verification', href: 'verify.html' },
  { id: 'claim', label: 'Confirm Identity', href: 'claim.html' },
  { id: 'review', label: 'Review Documents', href: 'review.html' },
  { id: 'sign', label: 'Provide Signature', href: 'sign.html' },
  { id: 'payment', label: 'Receive Payment', href: 'payment.html',
    alsoMatches: ['card', 'card-summary', 'bank', 'bank-billing', 'bank-summary'] },
  { id: 'complete', label: 'Complete', href: '#', alsoMatches: ['card-done', 'bank-done'] }
];
