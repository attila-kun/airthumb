export function isRunningAsBackgroundScript(): boolean {
    return !!globalThis.isBackgroundScript;
}