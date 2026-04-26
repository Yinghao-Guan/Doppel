import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Pick the right Python binary for the current platform.
 *
 * - macOS / Linux convention: `python3`.
 * - Windows convention: `python` (the default Python installer registers
 *   `python.exe`, not `python3.exe`; calling `python3` on Windows hits the
 *   Microsoft Store App Execution Alias stub and fails).
 *
 * Override via `PYTHON_BIN` env var when neither default works.
 */
function resolvePythonCmd(): string {
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;
  return process.platform === "win32" ? "python" : "python3";
}

function resolveModelScript(): { scriptPath: string; cwd: string } {
  const candidates = [
    {
      scriptPath: path.resolve(process.cwd(), "..", "backend", "ml", "predict.py"),
      cwd: path.resolve(process.cwd(), "..", "backend"),
    },
    {
      scriptPath: path.resolve(process.cwd(), "backend", "ml", "predict.py"),
      cwd: path.resolve(process.cwd(), "backend"),
    },
    {
      scriptPath: path.resolve(process.cwd(), "..", "cvModel", "ml", "predict.py"),
      cwd: path.resolve(process.cwd(), "..", "cvModel"),
    },
    {
      scriptPath: path.resolve(process.cwd(), "cvModel", "ml", "predict.py"),
      cwd: path.resolve(process.cwd(), "cvModel"),
    },
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate.scriptPath)) {
      return candidate;
    }
  }

  throw new Error("Could not locate backend/ml/predict.py");
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { scriptPath, cwd } = resolveModelScript();

    const result = await new Promise<string>((resolve, reject) => {
      const child = spawn(resolvePythonCmd(), [scriptPath, "--stdin-json", "--json"], {
        cwd,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => {
        stdout += String(chunk);
      });

      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });

      child.on("error", (error) => {
        reject(error);
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve(stdout);
          return;
        }
        reject(new Error(stderr || `predict.py exited with code ${code}`));
      });

      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    });

    return NextResponse.json(JSON.parse(result));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Prediction request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
