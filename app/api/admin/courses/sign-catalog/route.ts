import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "@/lib/ai/gemini-client";

interface SignCatalogItem {
  path: string;
  publicUrl: string;
  title_en: string;
  title_rw: string;
  title_fr: string;
  category:
    | "danger"
    | "prohibitory"
    | "mandatory"
    | "priority"
    | "indication"
    | "pedestrian"
    | "parking"
    | "speed_limit"
    | "direction";
  shape: string;
  visual_description: string;
  relevant_topics: string[];
}

const CATALOG_FILE = path.join(process.cwd(), "lib", "ai", "sign-catalog.json");

function getAllDiskImageFiles(dir: string, base = ""): { rel: string; full: string; name: string }[] {
  if (!fs.existsSync(dir)) return [];
  let results: { rel: string; full: string; name: string }[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllDiskImageFiles(full, rel));
    } else if (/\.(png|jpg|jpeg|webp|svg)$/i.test(entry.name)) {
      results.push({ rel, full, name: entry.name });
    }
  }
  return results;
}

function loadSignCatalog(): SignCatalogItem[] {
  let catalog: SignCatalogItem[] = [];
  try {
    if (fs.existsSync(CATALOG_FILE)) {
      catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, "utf8"));
    }
  } catch (e) {
    console.warn("Failed to read sign-catalog.json:", e);
  }

  // Also check if any new files exist in public/images or images/ that aren't in catalog yet
  const imagesDir = fs.existsSync(path.join(process.cwd(), "public", "images"))
    ? path.join(process.cwd(), "public", "images")
    : path.join(process.cwd(), "images");

  const diskFiles = getAllDiskImageFiles(imagesDir);
  const existingPaths = new Set(catalog.map((c) => c.path));

  for (const df of diskFiles) {
    if (!existingPaths.has(df.rel)) {
      catalog.push({
        path: df.rel,
        publicUrl: "/images/" + df.rel.split("/").map(encodeURIComponent).join("/"),
        title_en: df.name.replace(/\.(png|jpg|jpeg|webp|svg)$/i, "").replace(/[_-]+/g, " "),
        title_rw: "Ikimenyetso cy'umuhanda",
        title_fr: "Panneau de signalisation",
        category: df.rel.toLowerCase().includes("regulatory") ? "prohibitory" : "mandatory",
        shape: "circle",
        visual_description: `Road traffic sign (${df.rel})`,
        relevant_topics: ["traffic_signs", "pedestrians", "regulations"],
      });
    }
  }

  return catalog;
}

export async function GET() {
  try {
    const rawCatalog = loadSignCatalog();
    const catalog = rawCatalog.map((item: any) => {
      const isPedestrian =
        Boolean(item.pedestrian_relevant) ||
        item.category === "pedestrian" ||
        (Array.isArray(item.relevant_topics) &&
          item.relevant_topics.some((t: string) =>
            /pedestrian|crosswalk|children|school|footpath|sidewalk/i.test(t)
          )) ||
        /pedestrian|children|footpath/i.test(item.title_en || "");
      return {
        ...item,
        pedestrian_relevant: isPedestrian,
        meaning_en: item.meaning_en || item.visual_description || item.title_en,
        meaning_rw: item.meaning_rw || item.title_rw || item.visual_description,
        meaning_fr: item.meaning_fr || item.title_fr || item.visual_description,
        topics: item.topics || item.relevant_topics || [],
      };
    });
    return NextResponse.json({
      success: true,
      count: catalog.length,
      total: catalog.length,
      pedestrianCount: catalog.filter((c: any) => c.pedestrian_relevant).length,
      visionInspectedCount: catalog.length,
      signs: catalog,
      catalog,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load repository sign catalog" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action = "rescan", targetPaths } = body;

    // If action === "sync_github", pull any newly added images from kwizerad/Luxen repository
    if (action === "sync_github") {
      const treeRes = await fetch("https://api.github.com/repos/kwizerad/Luxen/git/trees/main?recursive=1");
      if (treeRes.ok) {
        const treeData = await treeRes.json();
        const files = (treeData.tree || []).filter(
          (t: any) => t.type === "blob" && t.path.startsWith("images/")
        );
        for (const file of files) {
          const destPublic = path.join(process.cwd(), "public", file.path);
          if (!fs.existsSync(destPublic)) {
            const rawUrl =
              "https://raw.githubusercontent.com/kwizerad/Luxen/main/" +
              file.path.split("/").map(encodeURIComponent).join("/");
            const res = await fetch(rawUrl);
            if (res.ok) {
              const buf = Buffer.from(await res.arrayBuffer());
              fs.mkdirSync(path.dirname(destPublic), { recursive: true });
              fs.writeFileSync(destPublic, buf);
            }
          }
        }
      }
    }

    const catalog = loadSignCatalog();
    const apiKey = getGeminiApiKey();

    // Identify signs that need AI Vision inspection
    const toInspect = catalog.filter((item) => {
      if (Array.isArray(targetPaths) && targetPaths.length > 0) {
        return targetPaths.includes(item.path);
      }
      return (
        item.title_en === "Traffic Regulation Sign" ||
        item.title_en.startsWith("Gemini Generated Image") ||
        item.title_en.startsWith("Screenshot")
      );
    });

    if (toInspect.length > 0 && apiKey) {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

      const batch = toInspect.slice(0, 6);
      const parts: any[] = [];
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        const fullPath = fs.existsSync(path.join(process.cwd(), "public", "images", item.path))
          ? path.join(process.cwd(), "public", "images", item.path)
          : path.join(process.cwd(), "images", item.path);

        if (fs.existsSync(fullPath)) {
          const b64 = fs.readFileSync(fullPath).toString("base64");
          const ext = path.extname(item.path).toLowerCase();
          const mimeType =
            ext === ".webp" ? "image/webp" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
          parts.push({ text: `Image #${i + 1} (path: "${item.path}"):` });
          parts.push({ inlineData: { mimeType, data: b64 } });
        }
      }

      if (parts.length > 0) {
        parts.push({
          text: `Inspect the visual pixels of each road sign image above (ignore filenames).
Return ONLY a valid JSON array where each element has:
- "path": exact path string provided above
- "title_en": official concise English traffic sign name
- "title_rw": official Kinyarwanda traffic sign name (Amategeko y'umuhanda mu Rwanda)
- "title_fr": official French traffic sign name (Code de la route)
- "category": one of "danger" | "prohibitory" | "mandatory" | "priority" | "indication" | "pedestrian" | "parking" | "speed_limit" | "direction"
- "shape": e.g. "red_triangle", "red_circle", "blue_circle", "blue_square", "octagon", "inverted_triangle", "other"
- "visual_description": 1-sentence description of the exact visual symbol and meaning
- "relevant_topics": array of keywords (e.g. ["pedestrians", "crosswalk", "speed", "overtaking", "roundabout", "priority", "no_entry", "parking", "turning", "cyclists", "children"])`,
        });

        const res = await ai.models.generateContent({
          model: "gemini-flash-lite-latest",
          contents: { parts },
          config: { responseMimeType: "application/json", temperature: 0.1 },
        });
        const parsed = JSON.parse((res.text || "[]").trim());
        for (const p of parsed) {
          const idx = catalog.findIndex((c) => c.path === p.path);
          if (idx >= 0) {
            catalog[idx] = { ...catalog[idx], ...p };
          }
        }
        fs.mkdirSync(path.dirname(CATALOG_FILE), { recursive: true });
        fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2));
      }
    }

    const normalizedCatalog = catalog.map((item: any) => {
      const isPedestrian =
        Boolean(item.pedestrian_relevant) ||
        item.category === "pedestrian" ||
        (Array.isArray(item.relevant_topics) &&
          item.relevant_topics.some((t: string) =>
            /pedestrian|crosswalk|children|school|footpath|sidewalk/i.test(t)
          )) ||
        /pedestrian|children|footpath/i.test(item.title_en || "");
      return {
        ...item,
        pedestrian_relevant: isPedestrian,
        meaning_en: item.meaning_en || item.visual_description || item.title_en,
        meaning_rw: item.meaning_rw || item.title_rw || item.visual_description,
        meaning_fr: item.meaning_fr || item.title_fr || item.visual_description,
        topics: item.topics || item.relevant_topics || [],
      };
    });

    return NextResponse.json({
      success: true,
      count: normalizedCatalog.length,
      total: normalizedCatalog.length,
      updatedCount: toInspect.length,
      signs: normalizedCatalog,
      catalog: normalizedCatalog,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to scan repository sign catalog" },
      { status: 500 }
    );
  }
}
