import { useMemo, useState } from 'react';
import { Avatar } from '@/components/avatar';
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from '@/components/catalyst/dropdown';
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from '@/components/navbar';
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarHeading,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
} from '@/components/sidebar';
import { SidebarLayout } from '@/components/sidebar-layout';
import {
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cog8ToothIcon,
  LightBulbIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserIcon,
} from '@heroicons/react/16/solid';
import {
  BellIcon,
  BuildingOffice2Icon,
  Cog6ToothIcon,
  CreditCardIcon,
  InboxIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  Square2StackIcon,
  UserGroupIcon,
} from '@heroicons/react/20/solid';

function routeMatches(route, page) {
  if (page === 'vendors') {
    return route.page === 'vendors' || route.page === 'vendor-profile';
  }

  return route.page === page;
}

function linkIsActive(route, href) {
  if (href === '/payables') return routeMatches(route, 'payables');
  if (href === '/vendors') return routeMatches(route, 'vendors');
  if (href === '/payment-preferences') return routeMatches(route, 'payment-preferences');
  return false;
}

function NestedShellLink({ href, label, route }) {
  return (
    <SidebarItem
      href={href}
      current={linkIsActive(route, href)}
      className="pl-11 text-zinc-600 dark:text-zinc-300"
    >
      <SidebarLabel>{label}</SidebarLabel>
    </SidebarItem>
  );
}

function ProductShellTitle({ route }) {
  const title = useMemo(() => {
    if (route.page === 'payables') return 'Bills and Payables';
    if (route.page === 'vendors') return 'Vendors';
    if (route.page === 'vendor-profile') return 'Vendor Profile';
    if (route.page === 'payment-preferences') return 'Payment Preferences';
    return 'Transcard';
  }, [route.page]);

  return (
    <div className="hidden min-w-0 lg:block">
      <p className="truncate text-sm/5 font-medium text-zinc-500 dark:text-zinc-400">Workspace</p>
      <p className="truncate text-base/6 font-semibold text-zinc-950 dark:text-white">{title}</p>
    </div>
  );
}

export function AppShell({ route, children }) {
  const [smartExchangeOpen, setSmartExchangeOpen] = useState(() => routeMatches(route, 'payment-preferences'));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [transcardOpen, setTranscardOpen] = useState(false);
  const smartExchangeExpanded = smartExchangeOpen || routeMatches(route, 'payment-preferences');

  const navbar = (
    <Navbar>
      <ProductShellTitle route={route} />
      <NavbarSpacer />
      <NavbarSection>
        <NavbarItem type="button" aria-label="Search">
          <MagnifyingGlassIcon data-slot="icon" />
        </NavbarItem>
        <NavbarItem type="button" aria-label="Inbox">
          <InboxIcon data-slot="icon" />
        </NavbarItem>
        <NavbarItem type="button" aria-label="Notifications">
          <BellIcon data-slot="icon" />
        </NavbarItem>
        <Dropdown>
          <DropdownButton as={NavbarItem} aria-label="Open account menu">
            <Avatar initials="JA" className="bg-zinc-950 text-white" square />
          </DropdownButton>
          <DropdownMenu className="min-w-64" anchor="bottom end">
            <DropdownItem href="#/my-profile">
              <UserIcon data-slot="icon" />
              <DropdownLabel>My profile</DropdownLabel>
            </DropdownItem>
            <DropdownItem href="/payment-preferences">
              <Cog8ToothIcon data-slot="icon" />
              <DropdownLabel>Settings</DropdownLabel>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem href="#/privacy-policy">
              <ShieldCheckIcon data-slot="icon" />
              <DropdownLabel>Privacy policy</DropdownLabel>
            </DropdownItem>
            <DropdownItem href="#/feedback">
              <LightBulbIcon data-slot="icon" />
              <DropdownLabel>Share feedback</DropdownLabel>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem href="#/logout">
              <ArrowRightStartOnRectangleIcon data-slot="icon" />
              <DropdownLabel>Sign out</DropdownLabel>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </NavbarSection>
    </Navbar>
  );

  const sidebar = (
    <Sidebar className="border-r border-zinc-950/5 bg-white dark:border-white/10 dark:bg-zinc-900">
      <SidebarHeader>
        <Dropdown>
          <DropdownButton as={SidebarItem} className="lg:mb-2.5">
            <Avatar initials="TC" className="bg-zinc-950 text-white" />
            <SidebarLabel>Transcard</SidebarLabel>
            <ChevronDownIcon data-slot="icon" />
          </DropdownButton>
          <DropdownMenu className="min-w-80 lg:min-w-64" anchor="bottom start">
            <DropdownItem href="/payables">
              <Avatar slot="icon" initials="BP" className="bg-blue-600 text-white" />
              <DropdownLabel>Bills and Payables</DropdownLabel>
            </DropdownItem>
            <DropdownItem href="/vendors">
              <Avatar slot="icon" initials="VN" className="bg-zinc-800 text-white" />
              <DropdownLabel>Vendors</DropdownLabel>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem href="/payment-preferences">
              <Cog8ToothIcon data-slot="icon" />
              <DropdownLabel>Payment Preferences</DropdownLabel>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem href="#/workspace-create">
              <PlusIcon data-slot="icon" />
              <DropdownLabel>New workspace…</DropdownLabel>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>

        <SidebarSection className="max-lg:hidden">
          <SidebarItem type="button">
            <MagnifyingGlassIcon data-slot="icon" />
            <SidebarLabel>Search</SidebarLabel>
          </SidebarItem>
          <SidebarItem type="button">
            <InboxIcon data-slot="icon" />
            <SidebarLabel>Inbox</SidebarLabel>
          </SidebarItem>
        </SidebarSection>
      </SidebarHeader>

      <SidebarBody>
        <SidebarSection>
          <SidebarItem href="/payables" current={routeMatches(route, 'payables')}>
            <Square2StackIcon data-slot="icon" />
            <SidebarLabel>Bills/Payables</SidebarLabel>
          </SidebarItem>
          <SidebarItem href="/vendors" current={routeMatches(route, 'vendors')}>
            <UserGroupIcon data-slot="icon" />
            <SidebarLabel>Vendors</SidebarLabel>
          </SidebarItem>
          <SidebarItem type="button" onClick={() => setSmartExchangeOpen((value) => !value)} current={routeMatches(route, 'payment-preferences')}>
            <CreditCardIcon data-slot="icon" />
            <SidebarLabel>SMART Exchange</SidebarLabel>
            <ChevronDownIcon
              data-slot="icon"
              className={smartExchangeExpanded ? 'rotate-180 transition-transform' : 'transition-transform'}
            />
          </SidebarItem>
          {smartExchangeExpanded ? (
            <>
              <NestedShellLink href="/smart-exchange" label="Overview" route={route} />
              <NestedShellLink href="/payment-preferences" label="Payment Preferences" route={route} />
            </>
          ) : null}
        </SidebarSection>

        <SidebarSection className="max-lg:hidden">
          <SidebarHeading>Administration</SidebarHeading>
          <SidebarItem href="#/my-company-profile">
            <BuildingOffice2Icon data-slot="icon" />
            <SidebarLabel>My Company Profile</SidebarLabel>
          </SidebarItem>
          <SidebarItem type="button" onClick={() => setSettingsOpen((value) => !value)}>
            <Cog6ToothIcon data-slot="icon" />
            <SidebarLabel>Settings</SidebarLabel>
            <ChevronDownIcon
              data-slot="icon"
              className={settingsOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
            />
          </SidebarItem>
          {settingsOpen ? (
            <>
              <NestedShellLink href="#/user-management" label="User Management" route={route} />
              <NestedShellLink href="#/approval-workflows" label="Approval Workflows" route={route} />
            </>
          ) : null}
          <SidebarItem type="button" onClick={() => setTranscardOpen((value) => !value)}>
            <ShieldCheckIcon data-slot="icon" />
            <SidebarLabel>Transcard Only</SidebarLabel>
            <ChevronDownIcon
              data-slot="icon"
              className={transcardOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
            />
          </SidebarItem>
          {transcardOpen ? (
            <>
              <NestedShellLink href="#/businesses" label="Businesses" route={route} />
              <NestedShellLink href="#/recipients" label="SMART Exchange Recipients" route={route} />
              <NestedShellLink href="#/reports" label="Reports" route={route} />
            </>
          ) : null}
        </SidebarSection>

        <SidebarSpacer />

        <SidebarSection>
          <SidebarItem href="#/support">
            <QuestionMarkCircleIcon data-slot="icon" />
            <SidebarLabel>Support</SidebarLabel>
          </SidebarItem>
          <SidebarItem href="#/changelog">
            <MegaphoneIcon data-slot="icon" />
            <SidebarLabel>Changelog</SidebarLabel>
          </SidebarItem>
          <SidebarItem href="#/release-notes">
            <SparklesIcon data-slot="icon" />
            <SidebarLabel>What&apos;s New</SidebarLabel>
          </SidebarItem>
        </SidebarSection>
      </SidebarBody>

      <SidebarFooter className="max-lg:hidden">
        <Dropdown>
          <DropdownButton as={SidebarItem}>
            <span className="flex min-w-0 items-center gap-3">
              <Avatar initials="JA" className="size-10 bg-zinc-950 text-white" square alt="" />
              <span className="min-w-0">
                <span className="block truncate text-sm/5 font-medium text-zinc-950 dark:text-white">
                  Johnny Anderson
                </span>
                <span className="block truncate text-xs/5 font-normal text-zinc-500 dark:text-zinc-400">
                  johnny@example.com
                </span>
              </span>
            </span>
            <ChevronUpIcon data-slot="icon" />
          </DropdownButton>
          <DropdownMenu className="min-w-64" anchor="top start">
            <DropdownItem href="#/my-profile">
              <UserIcon data-slot="icon" />
              <DropdownLabel>My profile</DropdownLabel>
            </DropdownItem>
            <DropdownItem href="/payment-preferences">
              <Cog8ToothIcon data-slot="icon" />
              <DropdownLabel>Settings</DropdownLabel>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem href="#/privacy-policy">
              <ShieldCheckIcon data-slot="icon" />
              <DropdownLabel>Privacy policy</DropdownLabel>
            </DropdownItem>
            <DropdownItem href="#/feedback">
              <LightBulbIcon data-slot="icon" />
              <DropdownLabel>Share feedback</DropdownLabel>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem href="#/logout">
              <ArrowRightStartOnRectangleIcon data-slot="icon" />
              <DropdownLabel>Sign out</DropdownLabel>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </SidebarFooter>
    </Sidebar>
  );

  return (
    <SidebarLayout navbar={navbar} sidebar={sidebar}>
      {children}
    </SidebarLayout>
  );
}
