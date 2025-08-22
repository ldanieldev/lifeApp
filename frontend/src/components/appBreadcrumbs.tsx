import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/shadcn/breadcrumb';
import { useBreadCrumbs } from '@/hooks/useBreadcrumbs';
import { Link } from '@tanstack/react-router';
import { HomeIcon } from 'lucide-react';
import React from 'react';
export function AppBreadcrumbs() {
  const { breadcrumb_routes } = useBreadCrumbs();

  if (breadcrumb_routes.length < 1) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink title="Home" asChild>
            <Link to="/">
              <HomeIcon className="!size-4" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumb_routes.map((route, index) => {
          // If it's the last route, render it as a page without a link
          if (index === breadcrumb_routes.length - 1) {
            return (
              <React.Fragment key={route.path}>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage title={route.name} className="capitalize">
                    {route.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </React.Fragment>
            );
          }

          // Otherwise, render it as a link
          return (
            <React.Fragment key={route.path}>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbLink title={route.name} asChild>
                  <Link className="capitalize" to={route.path}>
                    {route.name}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
