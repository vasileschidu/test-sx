import { useMemo, useState } from 'react';
import { ProductPageFrame } from '@/components/ProductPageFrame';
import { formatDate, formatMoney } from '@/data/adapters';

function badgeClass(kind) {
  if (kind === 'active') {
    return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-400/30';
  }

  if (kind === 'needs_verification') {
    return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30';
  }

  if (kind === 'verified') {
    return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/30';
  }

  if (kind === 'exception') {
    return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/30';
  }

  return 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-300 dark:bg-white/5 dark:text-gray-300 dark:ring-white/10';
}

function FilterPill({ children, onRemove }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-white/15"
    >
      <span>{children}</span>
      <span aria-hidden="true">×</span>
    </button>
  );
}

export function VendorsPage({ vendors }) {
  const [query, setQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedVerification, setSelectedVerification] = useState([]);
  const [selectedMethods, setSelectedMethods] = useState([]);

  const options = useMemo(() => {
    const sources = [...new Set(vendors.map((vendor) => vendor.sourceSystem).filter(Boolean))].sort();
    const statuses = [...new Set(vendors.map((vendor) => vendor.status).filter(Boolean))];
    const verification = [...new Set(vendors.map((vendor) => vendor.verificationStatus).filter(Boolean))];
    const methods = [
      ...new Set(vendors.flatMap((vendor) => vendor.supportedPaymentMethods || []).filter(Boolean)),
    ].sort();

    return { methods, sources, statuses, verification };
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return vendors.filter((vendor) => {
      if (normalizedQuery) {
        const matches = [
          vendor.displayName,
          vendor.legalName,
          vendor.vendorId,
          vendor.sourceSystem,
          ...(vendor.supportedPaymentMethods || []),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));

        if (!matches) return false;
      }

      if (selectedSources.length && !selectedSources.includes(vendor.sourceSystem)) return false;
      if (selectedStatuses.length && !selectedStatuses.includes(vendor.status)) return false;
      if (
        selectedVerification.length &&
        !selectedVerification.includes(vendor.verificationStatus)
      ) {
        return false;
      }
      if (
        selectedMethods.length &&
        !selectedMethods.some((method) => (vendor.supportedPaymentMethods || []).includes(method))
      ) {
        return false;
      }

      return true;
    });
  }, [
    query,
    selectedMethods,
    selectedSources,
    selectedStatuses,
    selectedVerification,
    vendors,
  ]);

  function toggleValue(setter, value) {
    setter((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  return (
    <ProductPageFrame page="vendors.html" title="Vendors">
      <div className="rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900 overflow-clip">
        <div className="border-b border-gray-200 px-4 py-4 dark:border-white/10 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex max-w-2xl flex-col gap-2">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Vendors</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage vendor health, payment setup, remittance destinations, and linked payable
                activity from one operational view.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="grid grid-cols-1">
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search vendors..."
                  className="col-start-1 row-start-1 block w-full rounded-md bg-white py-1.5 pr-3 pl-10 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:w-72 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-blue-500"
                />
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                  className="pointer-events-none col-start-1 row-start-1 ml-3 size-5 self-center text-gray-400 sm:size-4 dark:text-gray-500"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              <div className="relative inline-block w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setFilterOpen((current) => !current)}
                  className="whitespace-nowrap inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:hover:bg-white/10 cursor-pointer sm:w-auto"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="size-4"
                  >
                    <path d="M10 4.75a.75.75 0 0 1 .75.75v3.75h3.75a.75.75 0 0 1 0 1.5h-3.75v3.75a.75.75 0 0 1-1.5 0v-3.75H5.5a.75.75 0 0 1 0-1.5h3.75V5.5a.75.75 0 0 1 .75-.75Z" />
                  </svg>
                  Filter
                </button>

                {filterOpen ? (
                  <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-md bg-white shadow-lg outline-1 outline-black/5 dark:bg-gray-800 dark:-outline-offset-1 dark:outline-white/10">
                    <div className="grid gap-4 p-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">By source</p>
                        {options.sources.map((source) => (
                          <label
                            key={source}
                            className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
                          >
                            <input
                              type="checkbox"
                              checked={selectedSources.includes(source)}
                              onChange={() => toggleValue(setSelectedSources, source)}
                            />
                            <span>{source}</span>
                          </label>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">By status</p>
                        {options.statuses.map((status) => (
                          <label
                            key={status}
                            className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
                          >
                            <input
                              type="checkbox"
                              checked={selectedStatuses.includes(status)}
                              onChange={() => toggleValue(setSelectedStatuses, status)}
                            />
                            <span>{vendors.find((vendor) => vendor.status === status)?.statusLabel || status}</span>
                          </label>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          By verification
                        </p>
                        {options.verification.map((status) => (
                          <label
                            key={status}
                            className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
                          >
                            <input
                              type="checkbox"
                              checked={selectedVerification.includes(status)}
                              onChange={() => toggleValue(setSelectedVerification, status)}
                            />
                            <span>
                              {vendors.find((vendor) => vendor.verificationStatus === status)
                                ?.verificationStatusLabel || status}
                            </span>
                          </label>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          By payment method
                        </p>
                        {options.methods.map((method) => (
                          <label
                            key={method}
                            className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
                          >
                            <input
                              type="checkbox"
                              checked={selectedMethods.includes(method)}
                              onChange={() => toggleValue(setSelectedMethods, method)}
                            />
                            <span>{method}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-gray-200">
              {filteredVendors.length} vendor{filteredVendors.length === 1 ? '' : 's'}
            </span>
            {selectedSources.map((value) => (
              <FilterPill key={`source-${value}`} onRemove={() => toggleValue(setSelectedSources, value)}>
                Source: {value}
              </FilterPill>
            ))}
            {selectedStatuses.map((value) => (
              <FilterPill key={`status-${value}`} onRemove={() => toggleValue(setSelectedStatuses, value)}>
                Status: {vendors.find((vendor) => vendor.status === value)?.statusLabel || value}
              </FilterPill>
            ))}
            {selectedVerification.map((value) => (
              <FilterPill
                key={`verification-${value}`}
                onRemove={() => toggleValue(setSelectedVerification, value)}
              >
                Verification:{' '}
                {vendors.find((vendor) => vendor.verificationStatus === value)
                  ?.verificationStatusLabel || value}
              </FilterPill>
            ))}
            {selectedMethods.map((value) => (
              <FilterPill key={`method-${value}`} onRemove={() => toggleValue(setSelectedMethods, value)}>
                Method: {value}
              </FilterPill>
            ))}
          </div>
        </div>

        <div className="px-0 sm:px-4">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full table-fixed border-separate border-spacing-0 divide-y divide-gray-200 dark:divide-white/10">
                <thead>
                  <tr>
                    {[
                      'Vendor',
                      'Vendor ID',
                      'Status',
                      'Verification',
                      'Default Method',
                      'Outstanding',
                      'Total Paid',
                      'Last Payment',
                    ].map((label) => (
                      <th
                        key={label}
                        scope="col"
                        className="bg-white px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-white/10 dark:bg-gray-900">
                  {filteredVendors.length ? (
                    filteredVendors.map((vendor) => (
                      <tr key={vendor.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-4 py-3 align-top">
                          <a
                            href={`#/vendors/${vendor.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-blue-700 dark:text-white dark:hover:text-blue-300"
                          >
                            {vendor.displayName}
                          </a>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {vendor.legalName}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {vendor.vendorId}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${badgeClass(
                              vendor.status,
                            )}`}
                          >
                            {vendor.statusLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${badgeClass(
                              vendor.verificationStatus,
                            )}`}
                          >
                            {vendor.verificationStatusLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {vendor.defaultPaymentMethod}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {formatMoney(vendor.outstandingAmount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {formatMoney(vendor.totalPaid)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {formatDate(vendor.lastPaymentDate)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No vendors match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-20 rounded-b-xl border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-gray-900 dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] sm:px-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredVendors.length} of {vendors.length} vendors.
          </p>
        </div>
      </div>
    </ProductPageFrame>
  );
}
