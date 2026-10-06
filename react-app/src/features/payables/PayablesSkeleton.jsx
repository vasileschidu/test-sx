import { SkeletonBlock } from '@/components/loading/SkeletonBlock';

function TableHeaderCell({ width }) {
  return (
    <th className="h-14 border-b border-gray-200 px-2 py-4 align-middle dark:border-white/10">
      <div className="flex items-center gap-2">
        <SkeletonBlock className={`h-4 ${width}`} />
        <SkeletonBlock className="size-6 rounded-md" />
      </div>
    </th>
  );
}

function TableRow({ showAction = true }) {
  return (
    <tr className="group">
      <td className="h-12 w-10 border-b border-gray-200 px-0 py-2 align-middle text-center dark:border-white/10">
        <div className="flex h-6 items-center justify-center">
          <SkeletonBlock className="size-4 rounded-sm" />
        </div>
      </td>
      <td className="h-12 w-10 border-b border-gray-200 px-0 py-2 align-middle text-center dark:border-white/10">
        <div className="flex h-6 items-center justify-center">
          <SkeletonBlock className="size-4 rounded-sm" />
        </div>
      </td>
      <td className="h-12 border-b border-gray-200 px-2 py-2 align-middle dark:border-white/10">
        <SkeletonBlock className="h-5 w-28" />
      </td>
      <td className="h-12 border-b border-gray-200 px-2 py-2 align-middle dark:border-white/10">
        <SkeletonBlock className="h-5 w-20" />
      </td>
      <td className="h-12 border-b border-gray-200 px-2 py-2 align-middle dark:border-white/10">
        <SkeletonBlock className="h-5 w-48" />
      </td>
      <td className="h-12 border-b border-gray-200 px-2 py-2 align-middle dark:border-white/10">
        <SkeletonBlock className="h-5 w-40" />
      </td>
      <td className="h-12 border-b border-gray-200 px-2 py-2 align-middle dark:border-white/10">
        <SkeletonBlock className="h-5 w-24" />
      </td>
      <td className="h-12 border-b border-gray-200 px-2 py-2 align-middle dark:border-white/10">
        <SkeletonBlock className="h-6 w-24 rounded-full" />
      </td>
      <td className="h-12 w-px border-b border-gray-200 px-3 py-2 align-middle text-right dark:border-white/10 sm:pr-2">
        {showAction ? <SkeletonBlock className="ml-auto h-8 w-16 rounded-md" /> : null}
      </td>
    </tr>
  );
}

export function PayablesSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-10 rounded-xl bg-white dark:bg-gray-900"
    >
      <div className="rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-gray-900 overflow-clip mb-4">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-white/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <SkeletonBlock className="h-6 w-40" />
              <SkeletonBlock className="h-8 w-24 rounded-md" />
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <SkeletonBlock className="h-9 w-full rounded-md sm:w-[240px]" />
              <div className="flex w-full gap-3 sm:w-auto">
                <SkeletonBlock className="h-9 flex-1 rounded-md sm:w-24" />
                <SkeletonBlock className="h-9 flex-1 rounded-md sm:w-24" />
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <SkeletonBlock className="h-7 w-24 rounded-full" />
            <SkeletonBlock className="h-7 w-20 rounded-full" />
          </div>
        </div>

        <div className="border-b border-gray-200 px-4 py-4 dark:border-white/10">
          <div className="hidden gap-4 sm:flex">
            <SkeletonBlock className="h-9 w-32 rounded-md" />
            <SkeletonBlock className="h-9 w-32 rounded-md" />
            <SkeletonBlock className="h-9 w-24 rounded-md" />
            <SkeletonBlock className="h-9 w-28 rounded-md" />
          </div>
          <div className="sm:hidden">
            <SkeletonBlock className="h-10 w-full rounded-md" />
          </div>
        </div>

        <div className="px-0 sm:px-4">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full table-fixed border-separate border-spacing-0 divide-y divide-gray-200 dark:divide-white/10">
                <thead className="bg-white dark:bg-gray-900">
                  <tr className="h-14">
                    <th className="h-14 w-10 border-b border-gray-200 px-0 py-4 dark:border-white/10">
                      <div className="flex justify-center">
                        <SkeletonBlock className="size-4 rounded-sm" />
                      </div>
                    </th>
                    <th className="h-14 w-10 border-b border-gray-200 px-0 py-4 dark:border-white/10">
                      <div className="flex justify-center">
                        <SkeletonBlock className="size-4 rounded-sm" />
                      </div>
                    </th>
                    <TableHeaderCell width="w-20" />
                    <TableHeaderCell width="w-12" />
                    <TableHeaderCell width="w-16" />
                    <TableHeaderCell width="w-16" />
                    <TableHeaderCell width="w-20" />
                    <TableHeaderCell width="w-14" />
                    <th className="h-14 w-px border-b border-gray-200 px-3 py-4 dark:border-white/10 sm:pr-2">
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900">
                  <TableRow />
                  <TableRow />
                  <TableRow />
                  <TableRow />
                  <TableRow showAction={false} />
                  <TableRow />
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-20 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-gray-900 sm:px-6">
          <SkeletonBlock className="h-5 w-36" />
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-8 w-20 rounded-md" />
            <SkeletonBlock className="h-8 w-20 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
