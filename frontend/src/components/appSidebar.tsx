import { NavMain } from '@/components/navMain';
import { NavUser } from '@/components/navUser';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/shadcn/sidebar';
import { Link } from '@tanstack/react-router';
import { BanknoteIcon, BookHeartIcon, CarIcon, HeartPulseIcon, ListTodoIcon, SignatureIcon } from 'lucide-react';
import * as React from 'react';

const data = {
  user: {
    name: 'shadcn',
    email: 'm@example.com',
    avatar_url: 'https://github.com/shadcn.png',
  },
  navMain: [
    {
      title: 'ToDos',
      url: '/todo',
      icon: ListTodoIcon,
      isActive: true,
    },
    {
      title: 'Budgeting',
      url: '/budgeting',
      icon: BanknoteIcon,
      items: [
        {
          title: 'Dashboard',
          url: '#',
        },
        {
          title: 'Bills',
          url: '#',
        },
        {
          title: 'Portfolio',
          url: '#',
        },
      ],
    },
    {
      title: 'Car Journal',
      url: '/car-journal',
      icon: CarIcon,
      items: [
        {
          title: 'Service History',
          url: '#',
        },
        {
          title: 'Maintenance Intervals',
          url: '#',
        },
        {
          title: 'Service Recalls',
          url: '#',
        },
      ],
    },
    {
      title: 'Fitness',
      url: '/fitness',
      icon: HeartPulseIcon,
    },
    {
      title: 'Habits',
      url: '/habits',
      icon: BookHeartIcon,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link to="/">
                <SignatureIcon className="!size-5 bg-sidebar-primary rounded-lg" />
                <span className="text-base font-semibold">Life App</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
