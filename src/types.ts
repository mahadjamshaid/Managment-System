export interface JwtPayload {
  id: number;
  username: string;
}

export type postgresError = {
  code?: string;
};