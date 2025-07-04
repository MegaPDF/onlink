import { NextRequest, NextResponse } from 'next/server';

interface ErrorHandlerOptions {
  showStackTrace?: boolean;
  logErrors?: boolean;
  customErrorHandler?: (error: Error, req: NextRequest) => NextResponse;
}

/**
 * Global error handling middleware
 */
export function withErrorHandler(options: ErrorHandlerOptions = {}) {
  const {
    showStackTrace = process.env.NODE_ENV === 'development',
    logErrors = true,
    customErrorHandler
  } = options;

  return (handler: Function) => {
    return async (req: NextRequest, ...args: any[]) => {
      try {
        return await handler(req, ...args);
      } catch (error) {
        if (logErrors) {
          console.error('API Error:', error);
        }
        
        if (customErrorHandler && error instanceof Error) {
          return customErrorHandler(error, req);
        }
        
        const statusCode = (error as any).statusCode || 500;
        const message = (error as any).message || 'Internal server error';
        
        return NextResponse.json({
          error: message,
          ...(showStackTrace && { stack: (error as any).stack })
        }, { status: statusCode });
      }
    };
  };
}
