import { ProductPageFrame } from '@/components/ProductPageFrame';
import { formatDate, formatMoney } from '@/data/adapters';

function Section({ children, title }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-gray-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DefinitionList({ items }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{item.label}</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
            {item.value || '--'}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function StatusBadge({ kind, label }) {
  const className =
    kind === 'active'
      ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-400/30'
      : kind === 'exception'
        ? 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/30'
        : 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {label}
    </span>
  );
}

export function VendorProfilePage({ vendor }) {
  if (!vendor) {
    return (
      <ProductPageFrame page="vendor-profile.html" title="Vendor Profile">
        <section className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white px-6 py-6 shadow-xs dark:border-white/10 dark:bg-gray-900">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Vendor not found</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            This vendor profile route is active in React, but the requested vendor could not be
            found in the current data source.
          </p>
        </section>
      </ProductPageFrame>
    );
  }

  const paymentMethods = [
    ...(vendor.bankAccounts || []).map((bank) => ({
      id: bank.id,
      title: bank.label || bank.bankName || 'Bank account',
      subtitle: `${bank.maskedAccount || '--'} / ${bank.maskedRouting || '--'}`,
    })),
    ...(vendor.cards || []).map((card) => ({
      id: card.id,
      title: card.label || 'Card',
      subtitle: card.cardholderName || 'Cardholder',
    })),
    ...(vendor.checks || []).map((check) => ({
      id: check.id,
      title: check.label || 'Check address',
      subtitle: check.address || '--',
    })),
  ];

  return (
    <ProductPageFrame page="vendor-profile.html" title="Vendor Profile">
      <section className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-6 dark:border-white/10">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {vendor.legalName}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {vendor.displayName}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
                  {vendor.vendorId}
                </span>
                <StatusBadge kind={vendor.status} label={vendor.statusLabel} />
                <StatusBadge kind={vendor.verificationStatus} label={vendor.verificationStatusLabel} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
            <div className="flex flex-col gap-8 xl:col-span-2">
              <Section title="Overview">
                <DefinitionList
                  items={[
                    { label: 'Business Name', value: vendor.displayName },
                    { label: 'Vendor ID', value: vendor.vendorId },
                    { label: 'Payment Terms', value: vendor.paymentTerms },
                    { label: 'Tax ID', value: vendor.taxInfo?.einMasked || '--' },
                    { label: 'Billing Address', value: vendor.address },
                    { label: 'Source System', value: vendor.sourceSystem },
                  ]}
                />
              </Section>

              <Section title="Payment Methods">
                {paymentMethods.length ? (
                  <div className="space-y-3">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className="flex items-start justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-white/10"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {method.title}
                          </p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {method.subtitle}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No saved payment methods yet.
                  </p>
                )}
              </Section>

              <Section title="Linked Payables">
                <DefinitionList
                  items={[
                    { label: 'Open Bills', value: String(vendor.openBillsCount) },
                    { label: 'Outstanding', value: formatMoney(vendor.outstandingAmount) },
                    { label: 'Total Paid', value: formatMoney(vendor.totalPaid) },
                    { label: 'Last Payment Date', value: formatDate(vendor.lastPaymentDate) },
                  ]}
                />
              </Section>
            </div>

            <aside className="flex flex-col gap-8">
              <Section title="Contact Information">
                <DefinitionList
                  items={[
                    { label: 'Primary Contact', value: vendor.primaryContact?.name || '--' },
                    {
                      label: 'Email',
                      value: vendor.primaryContact?.email || vendor.remittanceEmails[0] || '--',
                    },
                    {
                      label: 'Phone',
                      value: vendor.primaryContact?.phone || vendor.remittancePhones[0] || '--',
                    },
                    { label: 'Default Method', value: vendor.defaultPaymentMethod },
                  ]}
                />
              </Section>

              <Section title="Recent Activity">
                {(vendor.activityLog || []).length ? (
                  <div className="space-y-4">
                    {vendor.activityLog.map((item) => (
                      <article
                        key={`${item.timestamp}-${item.title}`}
                        className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0 dark:border-white/10"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <strong className="text-sm text-gray-900 dark:text-white">
                            {item.title}
                          </strong>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(item.timestamp).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {item.description}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No activity recorded yet.
                  </p>
                )}
              </Section>
            </aside>
          </div>
        </div>
      </section>
    </ProductPageFrame>
  );
}
