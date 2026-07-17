export class RuntimeRequestGuard {
  private readonly inFlight = new Set<string>();

  begin(key: string) {
    if (!key || this.inFlight.has(key)) return false;
    this.inFlight.add(key);
    return true;
  }

  end(key: string) {
    if (key) this.inFlight.delete(key);
  }
}
