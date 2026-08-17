export const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

export function isAllowedFileType(contentType: string): boolean {
    return ALLOWED_FILE_TYPES.includes(
        contentType as (typeof ALLOWED_FILE_TYPES)[number],
    );
}


