import { Alert, AlertDescription } from '@/components/shadcn/alert';
import { Link } from '@tanstack/react-router';
import { AlertTriangleIcon, ArrowLeftIcon, HomeIcon, RefreshCwIcon, SearchIcon, ServerIcon } from 'lucide-react';

export const Error404Page = () => (
  <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
    <div className="max-w-md w-full space-y-8 text-center">
      <div className="space-y-4">
        <div className="mx-auto w-24 h-24 bg-destructive/10 rounded-lg flex items-center justify-center">
          <SearchIcon className="w-12 h-12 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-foreground">404</h1>
          <h2 className="text-2xl font-semibold text-foreground">Page Not Found</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            The page you're looking for doesn't exist or has been moved to another location.
          </p>
        </div>
      </div>

      <Alert className="text-left border-border bg-card">
        <AlertTriangleIcon className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-card-foreground">
          Double-check the URL or try searching for what you need.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors">
          <Link to="/" className="flex items-center gap-2">
            <HomeIcon className="w-4 h-4" />
            Go Home
          </Link>
        </button>
        <button
          onClick={() => window.history.back()}
          className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 border border-border hover:bg-accent text-foreground rounded-lg font-medium transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Go Back
        </button>
      </div>
    </div>
  </div>
);

export const Error500Page = ({ errorMsg }: { errorMsg?: string }) => (
  <div className="min-h-screen bg-gradient-to-br from-background to-destructive/5 flex items-center justify-center p-4">
    <div className="max-w-md w-full space-y-8 text-center">
      <div className="space-y-4">
        <div className="mx-auto w-24 h-24 bg-destructive/10 rounded-lg flex items-center justify-center animate-pulse">
          <ServerIcon className="w-12 h-12 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-foreground">500</h1>
          <h2 className="text-2xl font-semibold text-foreground">Server Error</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Something went wrong on our end. We're working to fix the issue.
          </p>
        </div>
      </div>

      {errorMsg && (
        <Alert className="text-left border-destructive/20 bg-destructive/5">
          <AlertTriangleIcon className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive-foreground">
            Error details: <code className="bg-muted p-1 rounded">{errorMsg}</code>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => window.location.reload()}
          className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg font-medium transition-colors"
        >
          <RefreshCwIcon className="w-4 h-4" />
          Try Again
        </button>

        <Link to="/" className="flex items-center gap-2">
          <button className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 border border-border hover:bg-accent text-foreground rounded-lg font-medium transition-colors">
            <HomeIcon className="w-4 h-4" />
            Go Home
          </button>
        </Link>
      </div>
    </div>
  </div>
);
