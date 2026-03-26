import payablesFile from '../../../src/data/bills-payables.json';
import payeesFile from '../../../src/data/payees.json';
import vendorProfilesFile from '../../../src/data/vendor-profiles.json';
import paymentPreferencesFile from '../../../src/data/payment-preferences-data.json';
import exchangesFile from '../../../src/data/exchanges.json';
import customersFile from '../../../src/data/customers.json';
import bankAccountsFile from '../../../src/data/bank-accounts.json';
import checkAddressesFile from '../../../src/data/check-addresses.json';

export const payablesData = payablesFile?.data ?? [];
export const payeesData = payeesFile?.data ?? [];
export const vendorProfilesData = vendorProfilesFile?.data ?? [];
export const paymentPreferencesData = paymentPreferencesFile ?? {};
export const exchangesData = exchangesFile ?? {};
export const customersData = Array.isArray(customersFile) ? customersFile : [];
export const bankAccountsData = Array.isArray(bankAccountsFile) ? bankAccountsFile : [];
export const checkAddressesData = Array.isArray(checkAddressesFile) ? checkAddressesFile : [];
