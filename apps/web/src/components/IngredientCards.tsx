import type { CSSProperties } from 'react';
import { ingredients, type IngredientCount, type IngredientId } from '@crowdforge/shared';
const paths: Record<IngredientId, string> = {
  ice: 'M24 3v42M6 13l36 22M6 35l36-22M18 7l6 6 6-6M18 41l6-6 6 6M7 20l8-2-2-8M35 38l-2-8 8-2M7 28l8 2-2 8M35 10l-2 8 8 2',
  gravity:
    'M43 24c0 11-9 19-19 19S5 35 5 24 13 5 24 5s16 7 16 17-7 16-16 16-14-6-14-14 6-14 14-14 11 5 11 12-5 11-11 11-8-4-8-9 3-8 8-8 5 2 5 6-2 5-5 5',
  storm: 'M28 3 8 27h14l-3 18 21-26H26Z',
  mirror: 'M24 3 43 24 24 45 5 24ZM24 12 35 24 24 36 13 24Z',
  clones:
    'M17 15a7 7 0 1 0 14 0 7 7 0 1 0-14 0M13 42V33c0-12 22-12 22 0v9ZM5 19a5 5 0 1 0 10 0 5 5 0 1 0-10 0M33 19a5 5 0 1 0 10 0 5 5 0 1 0-10 0M4 39v-8l5-4M44 39v-8l-5-4',
  fire: 'M25 3c8 13-2 15 5 21 4-3 5-7 4-10 18 19 6 31-10 31S3 29 13 20c-1 11 4 10 5 5 2-7-2-13 7-22ZM24 27c-11 14 1 20 5 11Z',
};
export function IngredientIcon({ id }: { id: IngredientId }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="ingredient-icon">
      <path
        d={paths[id]}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function IngredientCards({ counts }: { counts: IngredientCount[] }) {
  return (
    <div className="ingredients">
      {ingredients.map((i) => {
        const count = counts.find((c) => c.ingredientId === i.id);
        const percentage = count?.percentage ?? 0;
        return (
          <div
            key={i.id}
            className={`ingredient ingredient-${i.id}`}
            style={{ '--ingredient': i.color } as CSSProperties}
          >
            <IngredientIcon id={i.id} />
            <span className="ingredient-name">{i.name}</span>
            <strong>
              {count?.count ?? 0}
              <small>{Math.round(percentage)}%</small>
            </strong>
            <div
              className="ingredient-track"
              role="progressbar"
              aria-label={`${i.name} contributions`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percentage}
            >
              <i style={{ width: `${percentage}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
