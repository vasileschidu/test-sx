import {
  bankAccountsData,
  checkAddressesData,
  customersData,
  exchangesData,
  payablesData,
  payeesData,
  paymentPreferencesData,
  vendorProfilesData,
} from './source';

export function formatMoney(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

export function formatDate(value) {
  if (!value) return '--';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toTitleCase(value) {
  return String(value || '')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getPayables() {
  return [...payablesData];
}

function sumAmounts(rows) {
  return rows.reduce((total, row) => total + Number(row.amount || 0), 0);
}

function collectPaymentMethods(payee) {
  const methods = payee?.paymentMethods ?? {};
  const labels = [];

  if ((methods.ach ?? []).length) labels.push('ACH');
  if ((methods.card ?? []).length) labels.push('Card');
  if ((methods.check ?? []).length) labels.push('Check');
  if ((methods.smartDisburse ?? []).length) labels.push('SMART Disburse');
  if ((methods.smartExchange ?? []).length) labels.push('SMART Exchange');
  if ((methods.wire ?? []).length) labels.push('Wire');

  return labels;
}

function buildVendorEntity(profile, payee, linkedPayables) {
  const bankAccounts = payee?.paymentMethods?.ach ?? [];
  const cards = payee?.paymentMethods?.card ?? [];
  const checks = payee?.paymentMethods?.check ?? [];
  const outstandingRows = linkedPayables.filter((row) => row.status !== 'paid');

  return {
    id: payee?.id ?? profile?.payeeId,
    vendorId: payee?.vendorId ?? '--',
    displayName: profile?.displayName ?? payee?.name ?? '--',
    legalName: profile?.legalName ?? payee?.name ?? '--',
    status: profile?.status ?? 'active',
    statusLabel: profile?.statusLabel ?? toTitleCase(profile?.status ?? 'active'),
    verificationStatus: profile?.verificationStatus ?? 'pending',
    verificationStatusLabel:
      profile?.verificationStatusLabel ?? toTitleCase(profile?.verificationStatus ?? 'pending'),
    sourceSystem: profile?.sourceSystem ?? 'Manual',
    paymentTerms: profile?.paymentTerms ?? '--',
    defaultPaymentMethod: profile?.defaultPaymentMethod ?? '--',
    supportedPaymentMethods: collectPaymentMethods(payee),
    primaryContact: payee?.contact ?? null,
    remittanceEmails: [
      payee?.contact?.email,
      ...(payee?.paymentMethods?.smartDisburse ?? []).flatMap((entry) =>
        (entry.contacts ?? [])
          .filter((contact) => contact.type === 'email')
          .map((contact) => contact.value),
      ),
    ].filter(Boolean),
    remittancePhones: [
      payee?.contact?.phone,
      ...(payee?.paymentMethods?.smartDisburse ?? []).flatMap((entry) =>
        (entry.contacts ?? [])
          .filter((contact) => contact.type === 'phone')
          .map((contact) => contact.value),
      ),
    ].filter(Boolean),
    taxInfo: profile?.taxInfo ?? null,
    notes: profile?.notes ?? '',
    documents: profile?.documents ?? [],
    activityLog: profile?.activityLog ?? [],
    address: payee?.accountInformation
      ? [
          payee.accountInformation.addressLine1,
          payee.accountInformation.addressLine2,
          [payee.accountInformation.city, payee.accountInformation.state, payee.accountInformation.zipCode]
            .filter(Boolean)
            .join(', '),
          payee.accountInformation.country,
        ]
          .filter(Boolean)
          .join('\n')
      : '--',
    bankAccounts,
    cards,
    checks,
    linkedPayables,
    openBillsCount: outstandingRows.length,
    outstandingAmount: sumAmounts(outstandingRows),
    totalPaid: sumAmounts(linkedPayables.filter((row) => row.status === 'paid')),
    lastPaymentDate:
      linkedPayables.find((row) => row.processedDate)?.processedDate ||
      linkedPayables.find((row) => row.adDate)?.adDate ||
      '',
  };
}

export function getVendors() {
  const payeesById = new Map(payeesData.map((payee) => [payee.id, payee]));
  const linkedRowsByPayee = payablesData.reduce((acc, row) => {
    const key = row.payeeId;
    if (!key) return acc;
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(row);
    return acc;
  }, new Map());

  return vendorProfilesData.map((profile) =>
    buildVendorEntity(profile, payeesById.get(profile.payeeId), linkedRowsByPayee.get(profile.payeeId) ?? []),
  );
}

export function getVendorById(vendorId) {
  return getVendors().find((vendor) => vendor.id === vendorId) ?? null;
}

function getPaymentPreferencesCompanyProfile() {
  const fallbackBank = bankAccountsData[0] ?? paymentPreferencesData?.bankAccounts?.[0] ?? null;
  const fallbackAddress = checkAddressesData[0] ?? null;

  return {
    displayName: fallbackBank?.name ?? fallbackAddress?.name ?? 'Nexus Financial Group',
    address: fallbackBank?.address ?? fallbackAddress?.address ?? '1200 Market Street\nSuite 400\nSan Francisco, CA 94102\nUnited States',
  };
}

function getExchangeEntries() {
  if (Array.isArray(exchangesData?.entries)) return exchangesData.entries;
  if (Array.isArray(exchangesData?.data)) return exchangesData.data;
  return [];
}

function getDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatCardNumber(value) {
  return getDigits(value).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function getPaymentMethodCards() {
  const company = getPaymentPreferencesCompanyProfile();

  return getExchangeEntries()
    .filter((entry) => entry?.paymentMethod === 'Card')
    .map((entry, index) => {
      const paymentInfo = entry?.details?.paymentInfo ?? {};
      const endingDigits = getDigits(paymentInfo.cardNumber || entry.paymentMethodEnding);
      const last4 = endingDigits.slice(-4) || '0000';
      const fullNumber = getDigits(paymentInfo.fullCardNumber || '') || `${last4}${last4}${last4}${last4}`;
      const expiration = String(paymentInfo.expires || '');
      const cvc = String(paymentInfo.cvcFull || paymentInfo.cvc || '999').slice(0, 3);
      const status = ['failed', 'exception'].includes(String(entry.status || '').toLowerCase())
        ? 'inactive'
        : 'active';

      return {
        id: String(entry.invoice || `card-${index + 1}`),
        vendorName: String(entry.customer || paymentInfo.cardholderName || 'Customer'),
        holderName: company.displayName,
        fullNumber: formatCardNumber(fullNumber),
        last4,
        expiration,
        cvc,
        pendingAmount: formatMoney(entry.amount, entry.currency),
        billingAddress: company.address,
        status,
      };
    });
}

export function getPaymentPreferences() {
  return {
    stp: {
      status: 'disabled',
      step: 'opt_in_required',
      fullyAutomated: false,
    },
    company: getPaymentPreferencesCompanyProfile(),
    cards: getPaymentMethodCards(),
    customers:
      paymentPreferencesData?.customers?.length ? paymentPreferencesData.customers : customersData,
    bankAccounts:
      paymentPreferencesData?.bankAccounts?.length
        ? paymentPreferencesData.bankAccounts
        : bankAccountsData,
    checkAddresses:
      paymentPreferencesData?.checkAddresses?.length
        ? paymentPreferencesData.checkAddresses
        : checkAddressesData,
  };
}
