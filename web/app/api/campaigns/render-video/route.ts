import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { execFileSync } from "child_process";
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import ffmpegPath from "ffmpeg-static";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/* ── Types ─────────────────────────────────────────────────────────────── */

interface VideoScene {
  headline: string;
  subheadline: string;
  imageUrl?: string | null;
  durationSeconds: number;
}

interface CtaSettings {
  headline: string;
  phone: string;
  subline: string;
  disclaimer: string;
}

interface RenderRequest {
  scenes: VideoScene[];
  cta: CtaSettings;
  platform: string;
  resolution: { w: number; h: number };
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

const FONT_PATH = join(process.cwd(), "public", "fonts", "Montserrat-Bold.ttf");

/** Escape text for ffmpeg drawtext filter */
function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\u2019")
    .replace(/:/g, "\\:")
    .replace(/;/g, "\\;")
    .replace(/%/g, "%%")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

/** Download a URL to a local file path. Returns true on success. */
async function downloadFile(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(dest, buf);
    return true;
  } catch {
    return false;
  }
}

function ffmpeg(args: string[], workDir: string) {
  if (!ffmpegPath) throw new Error("ffmpeg-static binary not found");
  execFileSync(ffmpegPath, args, {
    cwd: workDir,
    timeout: 50_000,
    stdio: "pipe",
    maxBuffer: 50 * 1024 * 1024,
  });
}

/* ── Route handler ─────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RenderRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { scenes, cta, resolution } = body;

  if (!scenes?.length || !cta || !resolution?.w || !resolution?.h) {
    return NextResponse.json(
      { error: "scenes, cta, and resolution are required" },
      { status: 400 },
    );
  }

  // Create a unique temp directory for this render
  const workDir = join(tmpdir(), `video-render-${randomUUID()}`);
  mkdirSync(workDir, { recursive: true });

  try {
    const { w, h } = resolution;
    const clipFiles: string[] = [];

    // ── Download scene images in parallel ──────────────────────────────
    const imageResults = await Promise.allSettled(
      scenes.map(async (scene, i) => {
        if (!scene.imageUrl) return null;
        const imgPath = join(workDir, `scene_${i}.jpg`);
        const ok = await downloadFile(scene.imageUrl, imgPath);
        return ok ? imgPath : null;
      }),
    );

    const imagePaths = imageResults.map((r) =>
      r.status === "fulfilled" ? r.value : null,
    );

    // ── Render each scene clip ─────────────────────────────────────────
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const dur = String(scene.durationSeconds);
      const clipName = `clip_${i}.mp4`;
      const headline = escapeDrawtext(scene.headline);
      const subheadline = escapeDrawtext(scene.subheadline);

      const headlineFontSize = Math.round(w / 16);
      const subFontSize = Math.round(w / 28);
      const headlineY = `(h-text_h)/2-${Math.round(h / 20)}`;
      const subY = `(h+text_h)/2+${Math.round(h / 30)}`;

      const headlineFilter = `drawtext=fontfile='${FONT_PATH}':text='${headline}':fontsize=${headlineFontSize}:fontcolor=white:x=(w-text_w)/2:y=${headlineY}:shadowcolor=black@0.8:shadowx=2:shadowy=2`;
      const subFilter = `drawtext=fontfile='${FONT_PATH}':text='${subheadline}':fontsize=${subFontSize}:fontcolor=#FFD700:x=(w-text_w)/2:y=${subY}:shadowcolor=black@0.8:shadowx=1:shadowy=1`;

      if (imagePaths[i]) {
        // Image background with dark overlay + text
        const vf = [
          `scale=${w}:${h}:force_original_aspect_ratio=increase`,
          `crop=${w}:${h}`,
          `drawbox=x=0:y=0:w=${w}:h=${h}:color=black@0.50:t=fill`,
          headlineFilter,
          subFilter,
        ].join(",");

        ffmpeg(
          [
            "-loop", "1",
            "-i", imagePaths[i]!,
            "-t", dur,
            "-vf", vf,
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "ultrafast",
            "-y", clipName,
          ],
          workDir,
        );
      } else {
        // Solid dark background fallback
        const vf = [headlineFilter, subFilter].join(",");

        ffmpeg(
          [
            "-f", "lavfi",
            "-i", `color=c=#0f172a:s=${w}x${h}:d=${dur}`,
            "-vf", vf,
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "ultrafast",
            "-y", clipName,
          ],
          workDir,
        );
      }

      clipFiles.push(clipName);
    }

    // ── CTA scene ──────────────────────────────────────────────────────
    const ctaDur = "5";
    const ctaVf = [
      `drawtext=fontfile='${FONT_PATH}':text='${escapeDrawtext(cta.headline)}':fontsize=${Math.round(w / 12)}:fontcolor=white:x=(w-text_w)/2:y=${Math.round(h * 0.25)}:shadowcolor=black@0.8:shadowx=2:shadowy=2`,
      `drawtext=fontfile='${FONT_PATH}':text='${escapeDrawtext(cta.phone)}':fontsize=${Math.round(w / 10)}:fontcolor=#FFD700:x=(w-text_w)/2:y=${Math.round(h * 0.4)}:shadowcolor=black@0.8:shadowx=2:shadowy=2`,
      `drawtext=fontfile='${FONT_PATH}':text='${escapeDrawtext(cta.subline)}':fontsize=${Math.round(w / 30)}:fontcolor=white:x=(w-text_w)/2:y=${Math.round(h * 0.58)}`,
      `drawtext=fontfile='${FONT_PATH}':text='${escapeDrawtext(cta.disclaimer)}':fontsize=${Math.round(w / 50)}:fontcolor=#888888:x=(w-text_w)/2:y=${Math.round(h * 0.88)}`,
    ].join(",");

    ffmpeg(
      [
        "-f", "lavfi",
        "-i", `color=c=#0a0a0a:s=${w}x${h}:d=${ctaDur}`,
        "-vf", ctaVf,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "ultrafast",
        "-y", "cta.mp4",
      ],
      workDir,
    );
    clipFiles.push("cta.mp4");

    // ── Concat all clips ───────────────────────────────────────────────
    const concatList = clipFiles.map((f) => `file '${f}'`).join("\n");
    writeFileSync(join(workDir, "concat.txt"), concatList);

    ffmpeg(
      [
        "-f", "concat",
        "-safe", "0",
        "-i", "concat.txt",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "ultrafast",
        "-movflags", "+faststart",
        "-y", "output.mp4",
      ],
      workDir,
    );

    // ── Return the rendered video ──────────────────────────────────────
    const outputPath = join(workDir, "output.mp4");
    const videoBuffer = readFileSync(outputPath);

    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": "inline; filename=video.mp4",
        "Content-Length": String(videoBuffer.length),
      },
    });
  } catch (err) {
    console.error("Video render error:", err);
    return NextResponse.json(
      { error: "Video rendering failed" },
      { status: 500 },
    );
  } finally {
    // Clean up temp directory
    try {
      if (existsSync(workDir)) {
        rmSync(workDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}
