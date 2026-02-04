"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Handle chunk loading errors specifically
    if (error.message?.includes("chunk") || error.message?.includes("Loading chunk")) {
      console.log("Chunk loading error detected, reloading page...");
      // Reload the page to fetch fresh chunks
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error?.message?.includes("chunk") || 
                          this.state.error?.message?.includes("Loading chunk");
      
      if (isChunkError) {
        return (
          <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
            <div className="max-w-md rounded-lg border border-neutral-200 bg-white p-6 text-center shadow-sm">
              <h1 className="mb-2 text-lg font-semibold text-neutral-900">
                Loading Application...
              </h1>
              <p className="mb-4 text-sm text-neutral-600">
                The application is updating. Please wait while we reload.
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                <div className="h-full animate-pulse bg-sdp-primary" style={{ width: "60%" }} />
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
          <div className="max-w-md rounded-lg border border-neutral-200 bg-white p-6 text-center shadow-sm">
            <h1 className="mb-2 text-lg font-semibold text-neutral-900">
              Something went wrong
            </h1>
            <p className="mb-4 text-sm text-neutral-600">
              An error occurred while loading the application.
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              className="min-h-[44px]"
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
