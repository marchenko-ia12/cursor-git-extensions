import * as os from "os";
import * as path from "path";

export interface VarContext {
  workspaceFolder?: string;
}

export function expandVars(input: string, ctx: VarContext): string {
  return input.replace(/\$\{([^}]+)\}/g, (match, name: string) => {
    if (name === "workspaceFolder") return ctx.workspaceFolder ?? match;
    if (name === "workspaceFolderBasename") {
      return ctx.workspaceFolder ? path.basename(ctx.workspaceFolder) : match;
    }
    if (name === "userHome") return os.homedir();
    if (name === "cwd") return process.cwd();
    if (name === "pathSeparator" || name === "/") return path.sep;
    if (name.startsWith("env:")) {
      const key = name.slice(4);
      return process.env[key] ?? "";
    }
    return match;
  });
}

export function parseEnvString(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of s.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

export function stringifyEnv(env: Record<string, string>): string {
  return Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join(";");
}
