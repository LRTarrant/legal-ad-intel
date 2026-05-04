import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { execFileSync } from "child_process";
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";

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

type BackgroundMusic = "dramatic" | "urgent" | "somber" | "corporate";

interface RenderRequest {
  scenes: VideoScene[];
  cta: CtaSettings;
  platform: string;
  resolution: { w: number; h: number };
  voiceoverBase64?: string;
  backgroundMusic?: BackgroundMusic | null;
}

/* ── Audio config ─────────────────────────────────────────────────────── */

const MUSIC_PARAMS: Record<BackgroundMusic, { freq: number; modFreq: number; volume: number }> = {
  dramatic: { freq: 80, modFreq: 0.3, volume: 0.15 },
  urgent: { freq: 120, modFreq: 1.2, volume: 0.15 },
  somber: { freq: 60, modFreq: 0.15, volume: 0.10 },
  corporate: { freq: 200, modFreq: 0.5, volume: 0.12 },
};

/* ── Helpers ───────────────────────────────────────────────────────────── */

// Register Montserrat font for canvas text rendering
const fontPath = join(process.cwd(), "public", "fonts", "Montserrat-Bold.ttf");
try {
  if (existsSync(fontPath)) {
    GlobalFonts.registerFromPath(fontPath, "Montserrat");
    console.log("[render-video] Registered Montserrat font from:", fontPath);
  } else {
    console.warn("[render-video] Montserrat font not found at:", fontPath);
  }
} catch {
  console.warn("[render-video] Could not load Montserrat font, using fallback");
}

function resolveFFmpegPath(): string {
  // Resolve relative to cwd at runtime (Vercel Labs pattern).
  // The ffmpeg-static import resolves the path at BUILD time which points to
  // a non-existent location at RUNTIME on Vercel (/var/task/).
  const cwdPath = join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg");
  if (existsSync(cwdPath)) return cwdPath;

  // Fallback: system ffmpeg
  if (existsSync("/usr/local/bin/ffmpeg")) return "/usr/local/bin/ffmpeg";
  if (existsSync("/usr/bin/ffmpeg")) return "/usr/bin/ffmpeg";

  throw new Error(
    `FFmpeg binary not found. Tried: ${cwdPath}, /usr/local/bin/ffmpeg, /usr/bin/ffmpeg`
  );
}

const RESOLVED_FFMPEG = resolveFFmpegPath();

console.log("[render-video] Using ffmpeg at:", RESOLVED_FFMPEG, "(exists:", existsSync(RESOLVED_FFMPEG), ")");

/** Render a scene frame with background image (or solid color) and text overlay */
async function renderSceneImage(
  bgImagePath: string | null,
  headline: string,
  subheadline: string,
  width: number,
  height: number,
  outputPath: string,
): Promise<void> {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Draw background
  if (bgImagePath) {
    try {
      const img = await loadImage(readFileSync(bgImagePath));
      // Scale to cover
      const scale = Math.max(width / img.width, height / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      const dx = (width - sw) / 2;
      const dy = (height - sh) * 0.25; // favor top of image — subjects tend to be in upper portion
      ctx.drawImage(img, dx, dy, sw, sh);
      // Dark overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, width, height);
    } catch {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);
  }

  // Draw headline (white, centered)
  const headlineFontSize = Math.round(width / 16);
  ctx.font = `bold ${headlineFontSize}px Montserrat, sans-serif`;
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.shadowBlur = 4;
  ctx.fillText(headline, width / 2, height / 2 - Math.round(height / 20));

  // Draw subheadline (gold, below headline)
  const subFontSize = Math.round(width / 28);
  ctx.font = `bold ${subFontSize}px Montserrat, sans-serif`;
  ctx.fillStyle = "#FFD700";
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.fillText(subheadline, width / 2, height / 2 + Math.round(height / 12));

  const buffer = canvas.toBuffer("image/png");
  writeFileSync(outputPath, buffer);
}

/** Render the CTA (call-to-action) frame as a PNG */
async function renderCtaImage(
  cta: CtaSettings,
  width: number,
  height: number,
  outputPath: string,
): Promise<void> {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Dark background
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.shadowBlur = 4;

  // CTA headline (white)
  ctx.font = `bold ${Math.round(width / 12)}px Montserrat, sans-serif`;
  ctx.fillStyle = "white";
  ctx.fillText(cta.headline, width / 2, Math.round(height * 0.3));

  // Phone (gold, large)
  ctx.font = `bold ${Math.round(width / 10)}px Montserrat, sans-serif`;
  ctx.fillStyle = "#FFD700";
  ctx.fillText(cta.phone, width / 2, Math.round(height * 0.45));

  // Subline (white, smaller)
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;
  ctx.font = `bold ${Math.round(width / 30)}px Montserrat, sans-serif`;
  ctx.fillStyle = "white";
  ctx.fillText(cta.subline, width / 2, Math.round(height * 0.6));

  // Disclaimer (gray, tiny)
  ctx.font = `${Math.round(width / 50)}px Montserrat, sans-serif`;
  ctx.fillStyle = "#888888";
  ctx.fillText(cta.disclaimer, width / 2, Math.round(height * 0.88));

  const buffer = canvas.toBuffer("image/png");
  writeFileSync(outputPath, buffer);
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
  execFileSync(RESOLVED_FFMPEG, args, {
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

  const { scenes, cta, resolution, voiceoverBase64, backgroundMusic } = body;

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

    // ── Render each scene clip (canvas → PNG → FFmpeg loop) ─────────────
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const dur = String(scene.durationSeconds);
      const clipName = `clip_${i}.mp4`;
      const compositedPng = join(workDir, `scene_${i}_composited.png`);

      // Pre-render text onto the scene image using canvas
      await renderSceneImage(
        imagePaths[i] ?? null,
        scene.headline,
        scene.subheadline,
        w,
        h,
        compositedPng,
      );

      // FFmpeg just loops the composited PNG into a video clip (no filters)
      ffmpeg(
        [
          "-loop", "1",
          "-i", compositedPng,
          "-t", dur,
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          "-preset", "ultrafast",
          "-y", clipName,
        ],
        workDir,
      );

      clipFiles.push(clipName);
    }

    // ── CTA scene (canvas → PNG → FFmpeg loop) ────────────────────────
    const ctaDur = "5";
    const ctaPng = join(workDir, "cta_composited.png");

    await renderCtaImage(cta, w, h, ctaPng);

    ffmpeg(
      [
        "-loop", "1",
        "-i", ctaPng,
        "-t", ctaDur,
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
        "-y", "video_only.mp4",
      ],
      workDir,
    );

    // ── Audio mixing ──────────────────────────────────────────────────
    const hasVoiceover = !!voiceoverBase64;
    const hasMusic = !!backgroundMusic && backgroundMusic in MUSIC_PARAMS;

    if (hasVoiceover || hasMusic) {
      // Calculate total video duration from scenes + CTA (5s)
      const totalDuration =
        scenes.reduce((sum, s) => sum + s.durationSeconds, 0) + 5;

      // Write voiceover to temp file
      if (hasVoiceover) {
        const voiceoverBuf = Buffer.from(voiceoverBase64, "base64");
        writeFileSync(join(workDir, "voiceover.mp3"), voiceoverBuf);
      }

      // Generate background music using FFmpeg sine wave
      if (hasMusic) {
        const params = MUSIC_PARAMS[backgroundMusic as BackgroundMusic];
        // Generate a sine wave with amplitude modulation for a drone effect
        const audioFilter = [
          `sine=frequency=${params.freq}:duration=${totalDuration}`,
          `tremolo=f=${params.modFreq}:d=0.6`,
          `volume=${params.volume}`,
        ].join(",");

        ffmpeg(
          [
            "-f", "lavfi",
            "-i", audioFilter,
            "-c:a", "libmp3lame",
            "-q:a", "4",
            "-y", "music.mp3",
          ],
          workDir,
        );
      }

      // Mix audio tracks together
      if (hasVoiceover && hasMusic) {
        // Mix voiceover (full volume) + music (already volume-adjusted)
        ffmpeg(
          [
            "-i", "voiceover.mp3",
            "-i", "music.mp3",
            "-filter_complex",
            `[0:a]apad[vo];[vo][1:a]amix=inputs=2:duration=longest:dropout_transition=2[out]`,
            "-map", "[out]",
            "-c:a", "libmp3lame",
            "-q:a", "2",
            "-y", "mixed_audio.mp3",
          ],
          workDir,
        );
      } else if (hasVoiceover) {
        // Voiceover only — pad to video length
        ffmpeg(
          [
            "-i", "voiceover.mp3",
            "-af", `apad,atrim=0:${totalDuration}`,
            "-c:a", "libmp3lame",
            "-q:a", "2",
            "-y", "mixed_audio.mp3",
          ],
          workDir,
        );
      } else {
        // Music only — already the right duration
        ffmpeg(
          [
            "-i", "music.mp3",
            "-c:a", "copy",
            "-y", "mixed_audio.mp3",
          ],
          workDir,
        );
      }

      // Merge audio with video
      ffmpeg(
        [
          "-i", "video_only.mp4",
          "-i", "mixed_audio.mp3",
          "-c:v", "copy",
          "-c:a", "aac",
          "-b:a", "128k",
          "-shortest",
          "-movflags", "+faststart",
          "-y", "output.mp4",
        ],
        workDir,
      );
    } else {
      // No audio — just rename
      ffmpeg(
        [
          "-i", "video_only.mp4",
          "-c", "copy",
          "-y", "output.mp4",
        ],
        workDir,
      );
    }

    // ── Upload + return URL ────────────────────────────────────────────
    //
    // We upload the rendered mp4 to Supabase Storage and return a JSON
    // body with { videoUrl }. This matches the contract the client
    // (pi-video-composition-card.tsx) expects — it does
    // `await renderRes.json()` and reads `.videoUrl` to set the
    // <video src=> attribute. Streaming the raw mp4 body back from
    // here would cause Safari's JSON parser to throw
    // "The string did not match the expected pattern" on the binary
    // bytes, breaking the whole video flow.
    //
    // Mirrors the audio upload pattern in /generate-pi-radio-spot:
    //   1. Upload to campaign-assets/<user>/pi-videos/<timestamp>.mp4
    //   2. On success, return the public URL
    //   3. On upload failure, fall back to a base64 data URL so the
    //      user still sees their video even if storage is misconfigured
    const outputPath = join(workDir, "output.mp4");
    const videoBuffer = readFileSync(outputPath);

    const timestamp = Date.now();
    const filePath = `${user.id}/pi-videos/${timestamp}.mp4`;

    const { error: uploadError } = await supabase.storage
      .from("campaign-assets")
      .upload(filePath, videoBuffer, {
        contentType: "video/mp4",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Video upload to storage failed:", uploadError);
      // Base64 fallback. ~33% larger than the binary so this is heavy
      // (a 30s video is ~3-5MB → ~5-7MB base64), but it lets the user
      // still see their video. Once we identify the upload glitch we
      // can stop relying on this path.
      const base64 = videoBuffer.toString("base64");
      return NextResponse.json({
        videoUrl: `data:video/mp4;base64,${base64}`,
        storagePath: null,
        warning: "Stored as data URL because Supabase upload failed.",
      });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("campaign-assets").getPublicUrl(filePath);

    return NextResponse.json({
      videoUrl: publicUrl,
      storagePath: filePath,
    });
  } catch (err) {
    console.error("Video render error:", err);
    return NextResponse.json(
      { error: "Video rendering failed", details: err instanceof Error ? err.message : String(err) },
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
