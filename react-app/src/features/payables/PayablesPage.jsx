import { useEffect, useState } from 'react';
import { ProductPageFrame } from '@/components/ProductPageFrame';
import billsPayablesDataUrl from '../../../../src/data/bills-payables.json?url';
import payeesDataUrl from '../../../../src/data/payees.json?url';
import mastercardSymbolUrl from '../../../../src/assets/illustrations/ma_symbol.svg?url';
import { PayablesSkeleton } from '@/features/payables/PayablesSkeleton';

export function PayablesPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    window.__BP_JSON_PATHS = [billsPayablesDataUrl];
    window.__BP_PAYEES_PATHS = [payeesDataUrl];
    window.__BP_ASSET_URLS = { mastercardSymbol: mastercardSymbolUrl };

    function handleLoadingStart() {
      if (active) setIsLoading(true);
    }

    function handleLoadingEnd() {
      if (active) setIsLoading(false);
    }

    window.addEventListener('bp:loading-start', handleLoadingStart);
    window.addEventListener('bp:loading-end', handleLoadingEnd);

    async function loadRouteScripts() {
      await import('../../../../src/scripts/table-skeleton.js');

      if (!window.__bpExactScriptLoaded) {
        await import('../../../../src/scripts/bills-payables-table.js');
        window.__bpExactScriptLoaded = true;
      } else if (active && typeof window.initBillsPayablesTable === 'function') {
        window.initBillsPayablesTable();
      }
    }

    loadRouteScripts();

    return () => {
      active = false;
      window.removeEventListener('bp:loading-start', handleLoadingStart);
      window.removeEventListener('bp:loading-end', handleLoadingEnd);
    };
  }, []);

  return (
    <ProductPageFrame>
          <div className="relative rounded-xl border border-gray-200 dark:border-white/10 bg-white shadow-xs dark:bg-gray-900 overflow-clip mb-4">
            {isLoading ? <PayablesSkeleton /> : null}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                    Bills and Payables
                  </h3>

                  <button
                    id="bp-refresh-btn"
                    type="button"
                    className="inline-flex items-center gap-x-1.5 rounded-md bg-gray-100 px-2.5 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20 dark:focus-visible:outline-blue-500 transition-colors cursor-pointer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="size-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Refresh
                  </button>
                </div>

                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                  <div className="w-full sm:w-auto">
                    <div className="grid grid-cols-1">
                      <input
                        id="bp-search-input"
                        type="text"
                        placeholder="Search payables..."
                        className="col-start-1 row-start-1 block w-full rounded-md bg-white py-1.5 pr-3 pl-10 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:pl-9 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-blue-500"
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
                        />
                      </svg>
                    </div>
                  </div>

                  <div className="flex w-full gap-3 sm:w-auto">
                    <div id="bp-table-filter-dropdown" className="relative inline-block w-full sm:w-auto">
                      <button
                        id="bp-table-filter-btn"
                        type="button"
                        className="whitespace-nowrap inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/5 dark:text-white dark:inset-ring-white/10 dark:hover:bg-white/10 cursor-pointer sm:w-auto"
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
                      <div
                        id="bp-table-filter-menu"
                        className="pointer-events-none invisible absolute right-0 z-30 mt-2 origin-top-right overflow-hidden rounded-md bg-white opacity-0 shadow-lg outline-1 outline-black/5 transition-[width,height,opacity] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10"
                      >
                        <div
                          id="bp-table-filter-track"
                          className="flex w-max items-start transition-transform duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]"
                          style={{ transform: 'translateX(0)' }}
                        >
                          <div
                            id="bp-table-filter-panel-root"
                            className="w-full min-w-0 shrink-0 py-1 sm:w-fit sm:min-w-[168px]"
                          >
                            <div role="button" tabIndex={0} data-filter-open="source" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5">
                              <span className="min-w-0 flex-1">By source</span>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-gray-500 dark:text-gray-400"><path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
                            </div>
                            <div role="button" tabIndex={0} data-filter-open="status" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5">
                              <span className="min-w-0 flex-1">By status</span>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-gray-500 dark:text-gray-400"><path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
                            </div>
                            <div role="button" tabIndex={0} data-filter-open="method" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5">
                              <span className="min-w-0 flex-1">By method of payment</span>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-gray-500 dark:text-gray-400"><path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
                            </div>
                            <div role="button" tabIndex={0} data-filter-open="initiated_date" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5">
                              <span className="min-w-0 flex-1">By initiated date</span>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-gray-500 dark:text-gray-400"><path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
                            </div>
                          </div>
                          <div id="bp-table-filter-detail-slot" className="w-full shrink-0 sm:w-72">
                            <div id="bp-table-filter-panel-source" className="hidden w-full shrink-0 flex-col sm:w-72">
                              <div role="button" tabIndex={0} data-filter-back className="flex w-full cursor-pointer items-center gap-3 self-stretch border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4"><path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" /></svg>
                                By source
                              </div>
                              <div id="bp-table-filter-sources" className="grow max-h-[60vh] overflow-auto px-2 py-2 sm:max-h-56" />
                              <div className="border-t border-gray-200 p-2 dark:border-white/10">
                                <button id="bp-table-filter-apply-source-btn" type="button" disabled className="rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300 cursor-pointer">Apply</button>
                              </div>
                            </div>
                            <div id="bp-table-filter-panel-status" className="hidden w-full shrink-0 flex-col sm:w-72">
                              <div role="button" tabIndex={0} data-filter-back className="flex w-full cursor-pointer items-center gap-3 self-stretch border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4"><path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" /></svg>
                                By status
                              </div>
                              <div id="bp-table-filter-statuses" className="max-h-56 grow overflow-auto px-2 py-2" />
                              <div className="border-t border-gray-200 p-2 dark:border-white/10">
                                <button id="bp-table-filter-apply-status-btn" type="button" disabled className="rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300 cursor-pointer">Apply</button>
                              </div>
                            </div>
                            <div id="bp-table-filter-panel-method" className="hidden w-full shrink-0 flex-col sm:w-72">
                              <div role="button" tabIndex={0} data-filter-back className="flex w-full cursor-pointer items-center gap-3 self-stretch border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4"><path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" /></svg>
                                By method of payment
                              </div>
                              <div id="bp-table-filter-methods" className="max-h-56 grow overflow-auto px-2 py-2" />
                              <div className="border-t border-gray-200 p-2 dark:border-white/10">
                                <button id="bp-table-filter-apply-method-btn" type="button" disabled className="rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300 cursor-pointer">Apply</button>
                              </div>
                            </div>
                            <div id="bp-table-filter-panel-initiated-date" className="hidden w-full shrink-0 flex-col sm:w-72">
                              <div role="button" tabIndex={0} data-filter-back className="flex w-full cursor-pointer items-center gap-3 self-stretch border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4"><path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" /></svg>
                                By initiated date
                              </div>
                              <div className="space-y-2 p-2">
                                <div>
                                  <label className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">From</label>
                                  <div className="relative mt-2">
                                    <input id="bp-table-filter-date-from-input" type="text" inputMode="numeric" placeholder="MM / DD / YYYY" className="relative z-10 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500" />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">To</label>
                                  <div className="relative mt-2">
                                    <input id="bp-table-filter-date-to-input" type="text" inputMode="numeric" placeholder="MM / DD / YYYY" className="relative z-10 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500" />
                                  </div>
                                </div>
                              </div>
                              <div className="border-t border-gray-200 p-2 dark:border-white/10">
                                <button id="bp-table-filter-apply-date-btn" type="button" disabled className="rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300 cursor-pointer">Apply</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div id="bp-table-filter-backdrop" className="pointer-events-none invisible fixed inset-0 z-40 bg-gray-900/50 opacity-0 transition-opacity duration-200 ease-out" />
                    </div>

                    <button id="bp-export-btn" className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-xs inset-ring-1 inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20 sm:w-auto cursor-pointer">
                      Export
                    </button>
                  </div>
                </div>
              </div>
              <div
                id="bp-table-active-filters"
                className={`mt-3 flex flex-wrap items-center justify-end gap-2 ${isLoading ? 'hidden' : ''}`}
              />
            </div>

            <div className="border-b border-gray-200 px-4 py-4 dark:border-white/10">
              <div className="grid grid-cols-1 sm:hidden">
                <select id="bp-tab-select" aria-label="Select a tab" className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-2 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-gray-800/50 dark:text-gray-100 dark:*:bg-gray-800 dark:outline-white/10 dark:focus:outline-indigo-500">
                  <option value="ready_to_pay">Ready to Pay</option>
                  <option value="in_progress">In Progress</option>
                  <option value="paid">Paid</option>
                  <option value="exception">Exceptions</option>
                </select>
                <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end fill-gray-500 dark:fill-gray-400">
                  <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" fillRule="evenodd" />
                </svg>
              </div>

              <div className="hidden sm:block">
                <nav id="bp-tab-nav" aria-label="Tabs" className="flex space-x-4">
                  <a href="#" data-tab="ready_to_pay" aria-current="page" className="inline-flex items-center gap-2 rounded-md bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                    <span>Ready to Pay</span>
                    <span data-tab-count="ready_to_pay" className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 inset-ring inset-ring-blue-700/10 dark:bg-blue-400/10 dark:text-blue-400 dark:inset-ring-blue-400/30">0</span>
                  </a>
                  <a href="#" data-tab="in_progress" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <span>In Progress</span>
                    <span data-tab-count="in_progress" className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 inset-ring inset-ring-gray-500/10 dark:bg-gray-400/10 dark:text-gray-400 dark:inset-ring-gray-400/20">0</span>
                  </a>
                  <a href="#" data-tab="paid" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <span>Paid</span>
                    <span data-tab-count="paid" className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 inset-ring inset-ring-gray-500/10 dark:bg-gray-400/10 dark:text-gray-400 dark:inset-ring-gray-400/20">0</span>
                  </a>
                  <a href="#" data-tab="exception" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <span>Exceptions</span>
                    <span data-tab-count="exception" className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 inset-ring inset-ring-gray-500/10 dark:bg-gray-400/10 dark:text-gray-400 dark:inset-ring-gray-400/20">0</span>
                  </a>
                </nav>
              </div>
            </div>

            <div className={`px-0 sm:px-4 ${isLoading ? 'invisible' : ''}`}>
              <div data-table-scroll className="overflow-x-auto">
                <div className="inline-block min-w-full align-middle">
                  <table id="bills-payables-table" className="min-w-full table-fixed border-separate border-spacing-0 divide-y divide-gray-200 dark:divide-white/10" />
                </div>
              </div>
            </div>

            <div
              data-pagination
              className={`sticky bottom-0 z-20 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-gray-900 dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] sm:px-6 rounded-b-xl ${isLoading ? 'invisible' : ''}`}
            />
          </div>
      

      <dialog
        id="bp-schedule-cancel-dialog"
        className="fixed inset-0 size-auto max-h-none max-w-none overflow-y-auto bg-transparent backdrop:bg-gray-900/75"
      >
        <div tabIndex={0} className="flex min-h-full items-end justify-center p-4 text-center focus:outline-none sm:items-center sm:p-6">
          <div className="relative w-full max-w-lg transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all dark:bg-gray-900 dark:ring-1 dark:ring-white/10">
            <div className="flex self-stretch flex-col items-end justify-end px-4 pt-4">
              <button type="button" data-bp-cancel-close className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300 cursor-pointer">
                <span className="sr-only">Close</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-6 p-6 px-8 pt-0">
              <div className="flex flex-col items-center text-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#EF4444" className="size-11" aria-hidden="true">
                  <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clipRule="evenodd" />
                </svg>
                <div className="mt-6 flex flex-col items-center gap-2">
                  <h2 className="text-center text-lg/6 font-semibold text-gray-900 dark:text-white">Cancel Scheduled Payment</h2>
                  <p className="text-center text-sm/5 font-normal text-gray-500 dark:text-gray-400">
                    This will cancel the scheduled payment and move it back to Ready to Pay. Are you sure you want to continue?
                  </p>
                </div>
              </div>
            </div>
            <div className="flex w-full gap-3 border-t border-gray-200 px-6 py-5 dark:border-white/10">
              <button type="button" data-bp-cancel-close className="w-full rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:hover:bg-white/10 cursor-pointer">
                Keep Scheduled
              </button>
              <button type="button" id="bp-schedule-cancel-confirm-btn" className="w-full rounded-md bg-red-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 cursor-pointer">
                Cancel Schedule
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </ProductPageFrame>
  );
}
