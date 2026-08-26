export function isValidDateString(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

export function isAfter(laterValue: string, earlierValue: string): boolean {
  return new Date(laterValue).getTime() > new Date(earlierValue).getTime();
}

export function isNotFuture(value: string): boolean {
  return new Date(value).getTime() <= Date.now();
}
