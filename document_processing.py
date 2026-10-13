import base64
import io
import re
import unicodedata

import pypdf

STEALTH_IMG_TOKEN_RE = re.compile(r"^\[\[STEALTH_IMG:[^\]]+\]\]$")


def get_image_mime_type(filename="", data=b""):
    if isinstance(data, (bytes, bytearray)):
        if data.startswith(b"\xff\xd8\xff"):
            return "image/jpeg"
        if data.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png"
        if data.startswith((b"GIF87a", b"GIF89a")):
            return "image/gif"
        if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
            return "image/webp"
        if data.startswith(b"BM"):
            return "image/bmp"

    lower = str(filename or "").lower()
    if lower.endswith(".png"):
        return "image/png"
    if lower.endswith(".gif"):
        return "image/gif"
    if lower.endswith(".webp"):
        return "image/webp"
    if lower.endswith(".bmp"):
        return "image/bmp"
    if lower.endswith(".svg"):
        return "image/svg+xml"
    return "image/jpeg"


def page_has_xobject_image(page):
    try:
        resources = page.get("/Resources")
        if hasattr(resources, "get_object"):
            resources = resources.get_object()
        if not isinstance(resources, dict):
            return False
        xobjects = resources.get("/XObject")
        if hasattr(xobjects, "get_object"):
            xobjects = xobjects.get_object()
        if not isinstance(xobjects, dict):
            return False
        for obj in xobjects.values():
            try:
                resolved = obj.get_object() if hasattr(obj, "get_object") else obj
                if isinstance(resolved, dict) and resolved.get("/Subtype") == "/Image":
                    return True
            except Exception:
                continue
    except Exception:
        return False
    return False


def clean_and_repair_vietnamese_text(text):
    if not text:
        return ""

    trimmed = text.strip()
    if STEALTH_IMG_TOKEN_RE.match(trimmed):
        return trimmed

    if "[[STEALTH_IMG:" in text:
        parts = re.split(r"(\[\[STEALTH_IMG:[^\]]+\]\])", text)
        return "".join(
            part.strip() if STEALTH_IMG_TOKEN_RE.match(part.strip()) else clean_and_repair_vietnamese_text(part)
            for part in parts
        )

    value = unicodedata.normalize("NFC", text)
    value = re.sub(
        r"([a-zA-ZáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵÁÀẢÃẠẮẰẲẴẶẤẦẨẪẬÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ])\s+([\u0300-\u036f\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f])",
        r"\1\2",
        value,
    )
    value = unicodedata.normalize("NFC", value)

    for _ in range(5):
        original = value
        value = re.sub(
            r"(^|[\s(„\"'\-–—])(b|c|d|đ|g|h|k|l|m|n|p|r|s|t|v|x|ch|gh|gi|kh|nh|ng|ngh|ph|qu|th|tr|B|C|D|Đ|G|H|K|L|M|N|P|R|S|T|V|X|Ch|Gh|Gi|Kh|Nh|Ng|Ngh|Ph|Qu|Th|Tr)\s+([áàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵÁÀẢÃẠẮẰẲẴẶẤẦẨẪẬÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ][a-zA-Zà-ỹ]*)",
            r"\1\2\3",
            value,
        )
        value = re.sub(
            r"([aăâeêioôơuưyáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]+)\s+(c|m|n|p|t|ch|ng|nh|a|i|u|o|y)(?=[\s,.;:!?)]|$)",
            r"\1\2",
            value,
            flags=re.IGNORECASE,
        )
        if value == original:
            break

    value = re.sub(r"\s+([,.;:!?])", r"\1", value)
    return re.sub(r" {2,}", " ", value)


def split_text_into_chunks(text, max_len=220):
    clean_text = clean_and_repair_vietnamese_text(text).replace("\r\n", "\n").replace("\t", " ")
    clean_text = re.sub(r" +", " ", clean_text)
    if "[[STEALTH_IMG:" in clean_text:
        clean_text = re.sub(r"([^\n])(\[\[STEALTH_IMG:[^\]]+\]\])", r"\1\n\2", clean_text)
        clean_text = re.sub(r"(\[\[STEALTH_IMG:[^\]]+\]\])([^\n])", r"\1\n\2", clean_text)

    paragraphs = re.split(r"\n\s*\n|\n", clean_text)
    chunks = []

    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        if STEALTH_IMG_TOKEN_RE.match(paragraph):
            chunks.append(paragraph)
            continue
        if len(paragraph) <= max_len:
            chunks.append(paragraph)
            continue

        sentences = re.split(r"([.!?…]+)", paragraph)
        buffer = ""
        for index in range(0, len(sentences), 2):
            delimiter = sentences[index + 1] if index + 1 < len(sentences) else ""
            combined = (sentences[index] + delimiter).strip()
            if not combined:
                continue
            if len(buffer) + len(combined) > max_len and buffer:
                chunks.append(buffer.strip())
                buffer = combined
            else:
                buffer = (buffer + " " + combined).strip()
        if buffer:
            chunks.append(buffer.strip())

    return chunks


def extract_pdf_payload(pdf_data, filename="document.pdf"):
    reader = pypdf.PdfReader(io.BytesIO(pdf_data))
    pages_data = {}
    document_images = {}
    first_story_page = 1

    for index, page in enumerate(reader.pages):
        page_num = index + 1
        try:
            raw_text = page.extract_text() or ""
        except Exception:
            raw_text = ""

        chunks = split_text_into_chunks(raw_text)
        page_image_tokens = []

        try:
            page_images = page.images
            num_page_images = len(page_images)
        except Exception:
            page_images = []
            num_page_images = 0

        extracted_on_page = 0
        for img_idx in range(num_page_images):
            try:
                img_obj = page_images[img_idx]
                img_bytes = getattr(img_obj, "data", None)
                if not img_bytes:
                    continue
                img_name = getattr(img_obj, "name", None) or f"image_{page_num}_{img_idx + 1}.jpg"
                img_name = re.sub(r"[\[\]|]", "_", str(img_name)).strip() or f"image_{page_num}_{img_idx + 1}.jpg"
                mime_type = get_image_mime_type(img_name, img_bytes)
                b64_data = base64.b64encode(img_bytes).decode("ascii")
                extracted_on_page += 1

                img_key = (
                    f"pdf_page_{page_num}"
                    if (num_page_images == 1 and extracted_on_page == 1)
                    else f"pdf_img_{page_num}_{extracted_on_page}"
                )
                if not chunks:
                    if page_num == 1:
                        label = f"Xem hình ảnh trang 1 — Ảnh bìa ({img_name})"
                    else:
                        label = f"Xem hình ảnh trang {page_num} ({img_name})"
                else:
                    if num_page_images > 1:
                        label = f"Xem hình ảnh minh họa #{extracted_on_page} — Trang {page_num} ({img_name})"
                    else:
                        label = f"Xem hình ảnh minh họa — Trang {page_num} ({img_name})"

                document_images[img_key] = {
                    "src": f"data:{mime_type};base64,{b64_data}",
                    "label": label,
                    "fileName": img_name,
                    "page": page_num,
                }
                page_image_tokens.append(f"[[STEALTH_IMG:{img_key}|{label}]]")
            except Exception:
                continue

        if not page_image_tokens and not chunks and page_has_xobject_image(page):
            img_key = f"pdf_page_{page_num}"
            label = (
                "Xem hình ảnh trang 1 — Ảnh bìa / Minh họa"
                if page_num == 1
                else f"Xem hình ảnh trang {page_num} (Trang minh họa / Scan)"
            )
            page_image_tokens.append(f"[[STEALTH_IMG:{img_key}|{label}]]")

        if page_image_tokens:
            chunks = page_image_tokens + chunks
        elif not chunks:
            chunks = [f"[Trang {page_num}: Trang trống]"]

        pages_data[str(page_num)] = chunks

    toc = []

    def extract_outline(items, depth=0):
        for item in items:
            if isinstance(item, list):
                extract_outline(item, depth + 1)
                continue
            title = getattr(item, "title", None)
            if not title and isinstance(item, dict):
                title = item.get("/Title")
            if not title:
                continue
            try:
                page_index = reader.get_destination_page_number(item)
                page_num = page_index + 1 if page_index is not None else 1
            except Exception:
                page_num = 1
            clean_title = clean_and_repair_vietnamese_text(str(title)).strip()
            if clean_title:
                indent = "— " * depth if depth > 0 else ""
                toc.append({"title": indent + clean_title, "page": page_num})

    try:
        if getattr(reader, "outline", None):
            extract_outline(reader.outline)
    except Exception:
        toc = []

    return {
        "success": True,
        "filename": filename,
        "totalPages": len(reader.pages),
        "firstStoryPage": first_story_page,
        "pages": pages_data,
        "images": document_images,
        "toc": toc,
    }

