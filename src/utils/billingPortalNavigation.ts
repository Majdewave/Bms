export function redirectToBillingPortal(
  url: string,
  location: Pick<Location, 'href'> = window.location
): void {
  location.href = url
}
