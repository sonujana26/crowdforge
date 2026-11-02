export interface Point {
  x: number;
  y: number;
}
export interface Body extends Point {
  radius: number;
}
export const WORLD = {
  width: 1600,
  height: 900,
  inset: 95,
  maxEnemies: 32,
  maxShots: 120,
} as const;
export const obstacles = [
  { x: 260, y: 230, radius: 34 },
  { x: 1340, y: 230, radius: 34 },
  { x: 260, y: 670, radius: 34 },
  { x: 1340, y: 670, radius: 34 },
  { x: 420, y: 170, radius: 28 },
  { x: 1180, y: 730, radius: 28 },
];
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function direction(x: number, y: number) {
  const length = Math.hypot(x, y);
  return length ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}
export function constrain(body: Body) {
  body.x = Math.max(
    WORLD.inset + body.radius,
    Math.min(WORLD.width - WORLD.inset - body.radius, body.x),
  );
  body.y = Math.max(
    WORLD.inset + body.radius,
    Math.min(WORLD.height - WORLD.inset - body.radius, body.y),
  );
  for (const prop of obstacles) {
    const d = distance(body, prop),
      min = body.radius + prop.radius;
    if (d < min) {
      const n = d ? direction(body.x - prop.x, body.y - prop.y) : { x: 1, y: 0 };
      body.x = prop.x + n.x * min;
      body.y = prop.y + n.y * min;
    }
  }
}
export function safeSpawn(player: Point, index: number): Point {
  const points = [
    { x: 160, y: 150 },
    { x: 800, y: 130 },
    { x: 1440, y: 150 },
    { x: 1450, y: 450 },
    { x: 1440, y: 750 },
    { x: 800, y: 770 },
    { x: 160, y: 750 },
    { x: 150, y: 450 },
  ];
  return (
    points
      .slice(index % 8)
      .concat(points.slice(0, index % 8))
      .find((p) => distance(p, player) > 360) ?? points[0]!
  );
}
