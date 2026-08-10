import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

const MAX_UPLOAD_SIZE = 15 * 1024 * 1024;
const ALLOWED_IMAGES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

export async function POST(req: Request) {
  try {
    await requireRole("CITIZEN");
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "فایل تصویری ارسال نشده" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: "حجم فایل نباید بیشتر از ۱۵ مگابایت باشد" }, { status: 400 });
    }
    const extension = ALLOWED_IMAGES[file.type.toLowerCase()];
    if (!extension) {
      return NextResponse.json({ error: "فقط تصاویر JPG، PNG، WEBP، HEIC و HEIF مجاز هستند" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    const filepath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, new Uint8Array(buffer));

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "احراز هویت لازم است" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "فقط شهروندان می‌توانند تصویر رخداد بارگذاری کنند" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطا در آپلود فایل" }, { status: 500 });
  }
}
