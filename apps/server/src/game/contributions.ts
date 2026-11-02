import {
  ingredientIds,
  type IngredientId,
  type IngredientCount,
  type NormalizedChatMessage,
} from '@crowdforge/shared';
export function parseCommand(text: string): IngredientId | null {
  if (text.length > 160) return null;
  const match = /^!forge\s+(ice|gravity|storm|mirror|clones|fire)$/i.exec(text.trim());
  return match ? (match[1]!.toLowerCase() as IngredientId) : null;
}
export class Contributions {
  private viewers = new Set<string>();
  private messages = new Set<string>();
  private counts = new Map<IngredientId, number>();
  accept(message: NormalizedChatMessage) {
    const ingredient = parseCommand(message.text);
    if (!ingredient) return 'Invalid command';
    const viewer = `${message.source}:${message.userId}`;
    const id = `${message.source}:${message.messageId}`;
    if (this.messages.has(id)) return 'Duplicate delivery';
    if (this.viewers.has(viewer)) return 'Viewer already contributed';
    if (this.viewers.size >= 10000) return 'Round capacity reached';
    this.messages.add(id);
    this.viewers.add(viewer);
    this.counts.set(ingredient, (this.counts.get(ingredient) ?? 0) + 1);
    return ingredient;
  }
  get total() {
    return this.viewers.size;
  }
  snapshot(): IngredientCount[] {
    return ingredientIds.map((ingredientId) => ({
      ingredientId,
      count: this.counts.get(ingredientId) ?? 0,
      percentage: this.total ? ((this.counts.get(ingredientId) ?? 0) / this.total) * 100 : 0,
    }));
  }
  top(): IngredientId[] {
    return this.snapshot()
      .filter((c) => c.count > 0)
      .sort(
        (a, b) =>
          b.count - a.count ||
          ingredientIds.indexOf(a.ingredientId) - ingredientIds.indexOf(b.ingredientId),
      )
      .slice(0, 2)
      .map((c) => c.ingredientId);
  }
}
