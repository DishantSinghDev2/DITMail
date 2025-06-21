/**
 * Utility function to combine class names conditionally.
 * @param classes - An array of class names or conditional expressions.
 * @returns A single string of combined class names.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ');
}