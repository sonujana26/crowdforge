import session from 'express-session';

export class SessionStore extends session.Store {
  private entries = new Map<string, { data: string; expires: number }>();
  constructor(private capacity = 1000) {
    super();
  }
  override get(id: string, callback: (error: unknown, data?: session.SessionData | null) => void) {
    const value = this.entries.get(id);
    if (!value || value.expires <= Date.now()) {
      this.entries.delete(id);
      callback(null, null);
      return;
    }
    callback(null, JSON.parse(value.data) as session.SessionData);
  }
  override set(id: string, data: session.SessionData, callback?: (error?: unknown) => void) {
    for (const [key, value] of this.entries)
      if (value.expires <= Date.now()) this.entries.delete(key);
    if (!this.entries.has(id) && this.entries.size >= this.capacity)
      this.entries.delete(this.entries.keys().next().value!);
    this.entries.set(id, {
      data: JSON.stringify(data),
      expires: data.cookie.expires
        ? new Date(data.cookie.expires).getTime()
        : Date.now() + 8 * 60 * 60 * 1000,
    });
    callback?.();
  }
  override destroy(id: string, callback?: (error?: unknown) => void) {
    this.entries.delete(id);
    callback?.();
  }
  override touch(id: string, data: session.SessionData, callback?: (error?: unknown) => void) {
    if (this.entries.has(id)) this.set(id, data);
    callback?.();
  }
  override clear(callback?: (error?: unknown) => void) {
    this.entries.clear();
    callback?.();
  }
}
