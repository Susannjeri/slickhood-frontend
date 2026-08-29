export interface Role {
  title: string;
  permissions: string[];
  properties: number[];
}

export interface ServerToken {
  sub: string;
  iss: string;
  iat: number;
  roles: Role[];
  exp: number;
}