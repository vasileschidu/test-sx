export function ProductPageFrame({ children, flushMobile = false }) {
  return (
    <main
      className={`flex w-full justify-center ${
        flushMobile ? 'p-0 sm:p-2 lg:p-4' : 'p-2 sm:p-2 lg:p-4'
      }`}
    >
      <div className="flex w-full max-w-[1280px] flex-col gap-5">{children}</div>
    </main>
  );
}
