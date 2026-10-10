import io
import re
import unicodedata

import pypdf


def clean_and_repair_vietnamese_text(text):
    if not text:
        return ""

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
    paragraphs = re.split(r"\n\s*\n|\n", clean_text)
    chunks = []

    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if not paragraph:
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
    first_story_page = 1

    for index, page in enumerate(reader.pages):
        page_num = index + 1
        try:
            raw_text = page.extract_text() or ""
        except Exception:
            raw_text = ""

        chunks = split_text_into_chunks(raw_text)
        if not chunks:
            chunks = [f"[Trang {page_num}: Trang bìa hoặc hình ảnh scan, không có văn bản]"]
        elif len(raw_text.strip()) > 80 and first_story_page == 1 and page_num > 1:
            first_story_page = page_num
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
        "toc": toc,
    }
