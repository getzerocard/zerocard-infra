// Helper function to extract error details
export function extractErrorDetails(error: unknown): { message: string; stack?: string } {
    if (error instanceof Error) {
        return { message: error.message, stack: error.stack };
    }
    return { message: 'Unknown error occurred' };
}
