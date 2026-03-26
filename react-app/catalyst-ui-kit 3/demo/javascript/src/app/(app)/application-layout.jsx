'use client'

import { Avatar } from '@/components/avatar'
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from '@/components/dropdown'
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from '@/components/navbar'
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
} from '@/components/sidebar'
import { SidebarLayout } from '@/components/sidebar-layout'
import {
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cog8ToothIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from '@heroicons/react/16/solid'
import {
  BanknotesIcon,
  BuildingOffice2Icon,
  CreditCardIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  Square2StackIcon,
  UserGroupIcon,
} from '@heroicons/react/20/solid'
import { usePathname } from 'next/navigation'

const MENU_ITEMS = [
  { label: 'Insights', href: '#', icon: SparklesIcon },
  { label: 'Bills/Payables', href: 'bills-and-payables.html', icon: BanknotesIcon },
  { label: 'Vendors', href: 'vendors.html', icon: UserGroupIcon },
  { label: 'Card Manager', href: '#', icon: CreditCardIcon },
  { label: 'Invoices/Receivables', href: '#', icon: Square2StackIcon },
  { label: 'Customers', href: '#', icon: BuildingOffice2Icon },
  {
    label: 'SMART Exchange',
    href: 'smart-exchange.html',
    icon: SparklesIcon,
    children: [{ label: 'Payment Preferences', href: 'payment-preferences.html' }],
  },
  { label: 'My Company Profile', href: 'my-company-profile.html', icon: UserCircleIcon },
  {
    label: 'Settings',
    icon: Cog8ToothIcon,
    children: [{ label: 'User Management', href: '#' }],
  },
  {
    label: 'Transcard Only',
    icon: ShieldCheckIcon,
    children: [
      { label: 'Businesses', href: '#' },
      { label: 'SMART Exchange Recipients', href: '#' },
      { label: 'Tenants', href: '#' },
      { label: 'Connections', href: '#' },
      { label: 'Connectors', href: '#' },
      { label: 'Integrations', href: '#' },
      { label: 'Message Templates', href: '#' },
      { label: 'Statement Templates', href: '#' },
      { label: 'Reports', href: '#' },
    ],
  },
  { label: 'Help from Transcard', href: '#', icon: QuestionMarkCircleIcon },
]

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') return ''
  return pathname.replace(/^\//, '')
}

function isCurrentPath(pathname, href) {
  if (!href || href === '#') return false
  const normalizedPath = normalizePathname(pathname)
  return normalizedPath === href
}

function AccountDropdownMenu({ anchor }) {
  return (
    <DropdownMenu className="min-w-64" anchor={anchor}>
      <DropdownItem href="#">
        <UserCircleIcon />
        <DropdownLabel>My account</DropdownLabel>
      </DropdownItem>
      <DropdownDivider />
      <DropdownItem href="#">
        <ShieldCheckIcon />
        <DropdownLabel>Privacy policy</DropdownLabel>
      </DropdownItem>
      <DropdownItem href="#">
        <LightBulbIcon />
        <DropdownLabel>Share feedback</DropdownLabel>
      </DropdownItem>
      <DropdownDivider />
      <DropdownItem href="/login">
        <ArrowRightStartOnRectangleIcon />
        <DropdownLabel>Sign out</DropdownLabel>
      </DropdownItem>
    </DropdownMenu>
  )
}

function MenuRow({ pathname, item, nested = false }) {
  const current = isCurrentPath(pathname, item.href)
  const className = nested ? 'pl-11' : undefined

  if (item.href) {
    const Icon = item.icon

    return (
      <SidebarItem href={item.href} current={current} className={className}>
        {Icon ? <Icon /> : null}
        <SidebarLabel>{item.label}</SidebarLabel>
      </SidebarItem>
    )
  }

  const Icon = item.icon

  return (
    <SidebarItem className={className}>
      {Icon ? <Icon /> : null}
      <SidebarLabel>{item.label}</SidebarLabel>
    </SidebarItem>
  )
}

export function ApplicationLayout({ children }) {
  const pathname = usePathname()

  return (
    <SidebarLayout
      navbar={
        <Navbar>
          <NavbarSpacer />
          <NavbarSection>
            <Dropdown>
              <DropdownButton as={NavbarItem}>
                <Avatar initials="JA" className="bg-zinc-950 text-white" square />
              </DropdownButton>
              <AccountDropdownMenu anchor="bottom end" />
            </Dropdown>
          </NavbarSection>
        </Navbar>
      }
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <Dropdown>
              <DropdownButton as={SidebarItem}>
                <Avatar initials="TC" className="bg-zinc-950 text-white" />
                <SidebarLabel>Transcard</SidebarLabel>
                <ChevronDownIcon />
              </DropdownButton>
              <DropdownMenu className="min-w-64" anchor="bottom start">
                <DropdownItem href="bills-and-payables.html">
                  <BanknotesIcon />
                  <DropdownLabel>Bills/Payables</DropdownLabel>
                </DropdownItem>
                <DropdownItem href="vendors.html">
                  <UserGroupIcon />
                  <DropdownLabel>Vendors</DropdownLabel>
                </DropdownItem>
                <DropdownItem href="payment-preferences.html">
                  <Cog8ToothIcon />
                  <DropdownLabel>Payment Preferences</DropdownLabel>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </SidebarHeader>

          <SidebarBody>
            <SidebarSection>
              {MENU_ITEMS.map((item) => (
                <div key={item.label} className="flex flex-col">
                  <MenuRow pathname={pathname} item={item} />
                  {item.children?.map((child) => (
                    <MenuRow key={child.label} pathname={pathname} item={child} nested />
                  ))}
                </div>
              ))}
            </SidebarSection>

            <SidebarSpacer />
          </SidebarBody>

          <SidebarFooter className="max-lg:hidden">
            <Dropdown>
              <DropdownButton as={SidebarItem}>
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar initials="JA" className="size-10 bg-zinc-950 text-white" square alt="" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm/5 font-medium text-zinc-950 dark:text-white">Johnny</span>
                    <span className="block truncate text-xs/5 font-normal text-zinc-500 dark:text-zinc-400">
                      johnny@example.com
                    </span>
                  </span>
                </span>
                <ChevronUpIcon />
              </DropdownButton>
              <AccountDropdownMenu anchor="top start" />
            </Dropdown>
          </SidebarFooter>
        </Sidebar>
      }
    >
      {children}
    </SidebarLayout>
  )
}
