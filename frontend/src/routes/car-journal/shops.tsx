/**
 * Car Journal Shops Route
 *
 * Page for managing service shops.
 * Route: /car-journal/shops
 */

import { createFileRoute } from '@tanstack/react-router';
import { ShopList } from '@/components/maintenance';

function ShopsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Service Shops</h1>
        <p className="text-muted-foreground">Manage your favorite service shops and locations</p>
      </div>
      <ShopList />
    </div>
  );
}

export const Route = createFileRoute('/car-journal/shops')({
  component: ShopsPage,
});
