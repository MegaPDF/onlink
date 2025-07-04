import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';

/**
 * Request validation middleware
 */
export function withValidation(schema: ZodSchema) {
  return (handler: Function) => {
    return async (req: NextRequest, ...args: any[]) => {
      try {
        const body = await req.json();
        const validatedData = schema.parse(body);
        
        // Attach validated data to request
        (req as any).validatedData = validatedData;
        
        return handler(req, ...args);
      } catch (error) {
        if (error instanceof ZodError) {
          return NextResponse.json({
            error: 'Validation failed',
            errors: error.errors.reduce((acc, err) => {
              const path = err.path.join('.');
              acc[path] = err.message;
              return acc;
            }, {} as Record<string, string>)
          }, { status: 400 });
        }
        
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      }
    };
  };
}
