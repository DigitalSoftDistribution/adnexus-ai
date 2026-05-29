declare module "bcrypt" {
  export function hash(data: string, salt: number | string): Promise<string>;
  export function compare(data: string, encrypted: string): Promise<boolean>;
  export function hashSync(data: string, salt: number | string): string;
  export function compareSync(data: string, encrypted: string): boolean;
  export function genSalt(rounds?: number, minor?: string): Promise<string>;
  export function genSaltSync(rounds?: number, minor?: string): string;
  export function getRounds(encrypted: string): number;
}

declare module "hpp" {
  import { RequestHandler } from "express";
  function hpp(options?: { checkBody?: boolean; checkBodyOnlyForContentType?: string; checkQuery?: boolean; whitelist?: string[] | Record<string, string[]> }): RequestHandler;
  export = hpp;
}
