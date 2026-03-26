import { Button, IconButton } from '@/components/app/Button';
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/components/app/DescriptionList';
import { Icon } from '@/components/app/Icon';
import { FormField } from '@/components/app/Input';
import { CUSTOM_ICON_NOTES, SYSTEM_ICON_NAMES } from '@/components/app/icon-registry';

const leftNav = [
  {
    label: 'Components',
    items: [
      { id: 'buttons', label: 'Buttons', current: true },
      { id: 'icons', label: 'Icons' },
      { id: 'inputs', label: 'Inputs' },
      { id: 'dialogs', label: 'Dialogs' },
      { id: 'dropdowns', label: 'Dropdowns' },
      { id: 'switches', label: 'Switches' },
      { id: 'description-lists', label: 'Description Lists' },
    ],
  },
];

const pageAnchors = [
  { id: 'button-rules', label: 'Usage rules' },
  { id: 'button-api', label: 'Component API' },
  { id: 'button-examples', label: 'Examples' },
  { id: 'button-notes', label: 'Approval notes' },
  { id: 'icon-rules', label: 'Icons' },
];

const buttonApi = [
  ['tone', '`secondary`', 'Chooses the button style used in the product.'],
  ['size', '`sm`', 'Controls compact or full-size spacing.'],
  ['type', '`button`', 'Use for normal, submit, or reset button behavior.'],
  ['href', '-', 'Turns the component into a link-style button when needed.'],
  ['disabled', '`false`', 'Use when the action is not yet available.'],
  ['block', '`false`', 'Makes the button stretch to the full available width.'],
  ['className', '-', 'Escape hatch for real migration edge cases.'],
];

function SectionShell({ children, description, id, title }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="px-0 py-0">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        ) : null}
      </div>
      <div className="mt-6 border-t border-gray-200 pt-6 dark:border-white/10">{children}</div>
    </section>
  );
}

function ExampleCard({ children, title }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-gray-900">
      <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">{children}</div>
    </div>
  );
}

function UsageRuleCard({ description, example, title }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-gray-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{description}</p>
        </div>
        <div className="shrink-0">{example}</div>
      </div>
    </div>
  );
}

function NavItem({ current = false, href, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={() => {
        const target = document.getElementById(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }}
      className={[
        'group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
        current
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white',
      ].join(' ')}
    >
      {Icon ? <Icon className="size-5 shrink-0" /> : <span className="size-5 shrink-0" aria-hidden="true" />}
      <span>{label}</span>
    </button>
  );
}

function ApiTable() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
      <table className="min-w-full table-fixed divide-y divide-gray-200 dark:divide-white/10">
        <thead className="bg-gray-50 dark:bg-white/5">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Prop</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Default</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-white/10 dark:bg-gray-900">
          <tr>
            <td className="px-4 py-4 align-top text-sm font-semibold text-gray-900 dark:text-white">Button</td>
            <td className="px-4 py-4 align-top text-sm text-gray-500 dark:text-gray-400">App wrapper</td>
            <td className="px-4 py-4 align-top text-sm text-gray-600 dark:text-gray-300">
              Uses Catalyst touch-target behavior underneath, but keeps the product’s current visual language.
            </td>
          </tr>
          {buttonApi.map(([prop, defaultValue, description]) => (
            <tr key={prop}>
              <td className="px-4 py-4 align-top text-sm font-mono font-medium text-gray-900 dark:text-white">{prop}</td>
              <td className="px-4 py-4 align-top text-sm font-mono text-gray-500 dark:text-gray-400">{defaultValue}</td>
              <td className="px-4 py-4 align-top text-sm text-gray-600 dark:text-gray-300">{description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-white font-['Inter'] text-gray-900 dark:bg-gray-950 dark:text-white">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex size-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white shadow-xs">
              DS
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">React design system</p>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Component Preview</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-8 px-6 py-8 xl:grid-cols-[240px_minmax(0,1fr)_220px]">
        <aside className="hidden xl:block">
          <div className="sticky top-24 space-y-8">
            {leftNav.map((section) => (
              <div key={section.label}>
                <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{section.label}</h2>
                <nav className="space-y-1">
                  {section.items.map((item) => (
                    <NavItem
                      key={item.id}
                      current={item.current}
                      href={item.id}
                      icon={item.icon}
                      label={item.label}
                    />
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </aside>

        <main className="min-w-0 space-y-8">
          <SectionShell
            id="buttons"
            title="Buttons"
            description="The first approved component family. The rules here should stay simple and product-facing."
          >
            <div className="space-y-10">
              <div id="button-rules" className="scroll-mt-24">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Usage rules</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Each rule includes a live preview so you can review the meaning and the visual at the same time.
                </p>
                <div className="mt-4 grid gap-4">
                  <UsageRuleCard
                    title="Primary"
                    description="Use for the main action on a page or modal."
                    example={<Button tone="primary">Confirm payment</Button>}
                  />
                  <UsageRuleCard
                    title="Secondary"
                    description="Use for supporting actions like Cancel, Back, or View."
                    example={<Button tone="secondary">Cancel</Button>}
                  />
                  <UsageRuleCard
                    title="Utility"
                    description="Use for compact header actions like Refresh or small tools."
                    example={<Button tone="utility"><Icon name="refresh" /> Refresh</Button>}
                  />
                  <UsageRuleCard
                    title="Danger"
                    description="Use only for destructive confirmations."
                    example={<Button tone="danger">Delete</Button>}
                  />
                  <UsageRuleCard
                    title="Link"
                    description="Use for inline actions like Reveal details or Add payer."
                    example={<Button tone="link"><Icon name="plus" /> Add payer</Button>}
                  />
                  <UsageRuleCard
                    title="Icon button"
                    description="Use for icon-only controls like Close, Back, or quick actions."
                    example={<IconButton aria-label="Close" tone="plain"><Icon className="size-5" name="close" /></IconButton>}
                  />
                </div>
              </div>

              <div id="button-api" className="scroll-mt-24">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Component API</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Keep the API compact. It should support real product usage, not become a generic component library surface.
                </p>
                <div className="mt-4">
                  <ApiTable />
                </div>
              </div>

              <div id="button-examples" className="scroll-mt-24 space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Examples</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    These are the real wrappers intended for migration, not preview-only markup.
                  </p>
                </div>

                <ExampleCard title="Button types">
                  <Button tone="primary">Confirm payment</Button>
                  <Button tone="secondary">Cancel</Button>
                  <Button tone="secondaryStrong">View</Button>
                  <Button tone="utility">Refresh</Button>
                  <Button tone="danger">Delete</Button>
                  <Button tone="link">Reveal details</Button>
                </ExampleCard>

                <ExampleCard title="Button sizes">
                  <Button size="sm" tone="primary">Apply</Button>
                  <Button size="md" tone="primary">Continue</Button>
                  <Button size="sm" tone="secondary">Back</Button>
                  <Button size="md" tone="secondary">Save changes</Button>
                </ExampleCard>

                <ExampleCard title="Disabled state">
                  <Button disabled tone="primary">Confirm payment</Button>
                  <Button disabled tone="secondary">Cancel</Button>
                  <Button disabled tone="utility">Refresh</Button>
                </ExampleCard>

                <ExampleCard title="With icon">
                  <Button tone="primary"><Icon name="check" /> Save changes</Button>
                  <Button tone="secondary"><Icon name="refresh" /> Refresh</Button>
                  <Button tone="link"><Icon name="plus" /> Add payer</Button>
                </ExampleCard>

                <ExampleCard title="As a link">
                  <Button tone="secondaryStrong">Link button example</Button>
                  <Button tone="link">Inline link example</Button>
                </ExampleCard>

                <ExampleCard title="Icon buttons">
                  <IconButton aria-label="Back" tone="plain"><Icon className="size-5" name="arrowLeft" /></IconButton>
                  <IconButton aria-label="Close" tone="plain"><Icon className="size-5" name="close" /></IconButton>
                  <IconButton aria-label="Quick action" tone="subtle"><Icon name="chevronRight" /></IconButton>
                </ExampleCard>

                <ExampleCard title="Full width">
                  <div className="w-full max-w-md space-y-3">
                    <Button block size="md" tone="primary">Submit</Button>
                    <Button block size="md" tone="secondary">Save as draft</Button>
                  </div>
                </ExampleCard>
              </div>

              <div id="button-notes" className="scroll-mt-24 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-300" name="danger" />
                  <div>
                    <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">Approval notes</h3>
                    <ul className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-200">
                      <li>Copy controls should stay separate for now.</li>
                      <li>Table filter triggers and segmented chips should not be forced into the main button API yet.</li>
                      <li>Only substitute buttons into product pages after these variants are approved visually.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div id="icon-rules" className="scroll-mt-24 space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Icons</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Heroicons are the default React system icon set. Product-specific payment and branded icons stay custom until reviewed.
                  </p>
                </div>

                <ExampleCard title="Approved system icons">
                  {SYSTEM_ICON_NAMES.map((name) => (
                    <div key={name} className="flex min-w-[120px] items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Icon className="size-5 text-gray-600 dark:text-gray-300" name={name} />
                      <span>{name}</span>
                    </div>
                  ))}
                </ExampleCard>

                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
                  <table className="min-w-full table-fixed divide-y divide-gray-200 dark:divide-white/10">
                    <thead className="bg-gray-50 dark:bg-white/5">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Examples</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Rule</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-white/10 dark:bg-gray-900">
                      <tr>
                        <td className="px-4 py-4 align-top text-sm font-semibold text-gray-900 dark:text-white">Use Heroicon</td>
                        <td className="px-4 py-4 align-top text-sm text-gray-600 dark:text-gray-300">close, chevrons, plus, refresh, copy, edit, trash, reveal</td>
                        <td className="px-4 py-4 align-top text-sm text-gray-600 dark:text-gray-300">Use for shared UI controls and standard product actions.</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-4 align-top text-sm font-semibold text-gray-900 dark:text-white">Keep custom</td>
                        <td className="px-4 py-4 align-top text-sm text-gray-600 dark:text-gray-300">branded payment marks, workflow-specific icons, decorative product icons</td>
                        <td className="px-4 py-4 align-top text-sm text-gray-600 dark:text-gray-300">Keep existing visuals where users already recognize the product pattern.</td>
                      </tr>
                      {Object.keys(CUSTOM_ICON_NOTES).map((name) => (
                        <tr key={name}>
                          <td className="px-4 py-4 align-top text-sm font-semibold text-gray-900 dark:text-white">Needs review</td>
                          <td className="px-4 py-4 align-top text-sm text-gray-600 dark:text-gray-300">
                            <div className="flex items-center gap-2">
                              <Icon className="size-5 text-gray-600 dark:text-gray-300" name={name} />
                              <span>{name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top text-sm text-gray-600 dark:text-gray-300">{CUSTOM_ICON_NOTES[name]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="inputs"
            title="Inputs"
            description="Early preview only. This section exists to show how the page can grow once button approval is done."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-gray-900">
                <FormField
                  label="Account nickname"
                  description="Example of the adapted field wrapper."
                  name="nickname"
                  placeholder="Primary operating account"
                />
              </div>
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500 dark:border-white/10 dark:bg-gray-900 dark:text-gray-400">
                Next candidate after buttons: inputs, selects, switches, dialogs, and dropdowns for Payment Preferences.
              </div>
            </div>
          </SectionShell>
        </main>

        <aside className="hidden xl:block">
          <div className="sticky top-24 p-1">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">On this page</h2>
            <nav className="mt-4 space-y-3">
              {pageAnchors.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    const target = document.getElementById(item.id);
                    if (target) {
                      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="block text-left text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}
