export type Role = "USER" | "ADMIN";

export const VoteValue = { UP: 1, DOWN: -1 } as const;
export type VoteValue = (typeof VoteValue)[keyof typeof VoteValue];

export type User = { id: string; username: string; email: string; role: Role };
export type Actor = Pick<User, "id" | "role">;

export type Species = { id: string; commonName: string; scientificName: string };

export type Location = { latitude: number; longitude: number };
