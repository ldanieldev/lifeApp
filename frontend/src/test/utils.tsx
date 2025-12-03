import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Create a fresh QueryClient for each test
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Custom render that includes QueryClientProvider
 */
export function renderWithClient(
  ui: ReactElement,
  queryClient?: QueryClient,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const client = queryClient || createTestQueryClient();

  return render(ui, {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    ...options,
  });
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
