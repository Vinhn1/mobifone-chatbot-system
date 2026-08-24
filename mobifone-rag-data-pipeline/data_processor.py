"""
Module xử lý và chuẩn hóa dữ liệu thô đã cào.
Chuyển đổi dữ liệu thô thành format phù hợp cho chatbot AI:
- Chunking: chia nhỏ nội dung thành đoạn phù hợp
- Cleaning: loại bỏ noise, chuẩn hóa text
- Structuring: tạo cấu trúc Q&A, Knowledge Base entries
"""

import json
import logging
import os
import re
from datetime import datetime

from config import RAW_DIR, PROCESSED_DIR, SCRAPE_TARGETS

logger = logging.getLogger("MobiFoneScraper")


class DataProcessor:
    """
    Xử lý dữ liệu thô thành knowledge base cho chatbot.
    """

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        """
        Args:
            chunk_size: Số ký tự tối đa mỗi chunk
            chunk_overlap: Số ký tự overlap giữa các chunk liên tiếp
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    # ===========================================================
    # CHUẨN HÓA TEXT TIẾNG VIỆT
    # ===========================================================
    def clean_text(self, text: str) -> str:
        """Chuẩn hóa và làm sạch text tiếng Việt."""
        if not text:
            return ""

        # Loại bỏ ký tự đặc biệt không cần thiết
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", text)

        # Chuẩn hóa khoảng trắng
        text = re.sub(r"[ \t]+", " ", text)

        # Loại bỏ dòng trống liên tiếp
        text = re.sub(r"\n{3,}", "\n\n", text)

        # Loại bỏ URL tracking parameters
        text = re.sub(r"\?utm_[^\s]*", "", text)

        # Loại bỏ emoji/icon không cần thiết (giữ lại emoji tiếng Việt)
        # text = re.sub(r'[^\w\s\.,;:!?\-\(\)\[\]\/\+\*%₫đĐ]', '', text)

        return text.strip()

    # ===========================================================
    # CHIA NHỎ NỘI DUNG (CHUNKING)
    # ===========================================================
    def chunk_text(self, text: str, metadata: dict = None) -> list[dict]:
        """
        Chia nhỏ text thành các chunk phù hợp cho embedding/RAG.
        Ưu tiên chia theo heading/paragraph boundary.
        """
        if not text:
            return []

        chunks = []

        # Chia theo đoạn văn (paragraph)
        paragraphs = text.split("\n\n")
        current_chunk = ""
        chunk_index = 0

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            # Nếu 1 paragraph đã quá dài, chia tiếp theo câu
            if len(para) > self.chunk_size:
                # Lưu chunk hiện tại trước
                if current_chunk:
                    chunks.append(self._create_chunk(
                        current_chunk, chunk_index, metadata
                    ))
                    chunk_index += 1
                    current_chunk = ""

                # Chia paragraph dài theo câu
                sentence_chunks = self._chunk_by_sentences(para)
                for sc in sentence_chunks:
                    chunks.append(self._create_chunk(sc, chunk_index, metadata))
                    chunk_index += 1
                continue

            # Kiểm tra xem thêm paragraph có vượt quá chunk_size không
            test = current_chunk + "\n\n" + para if current_chunk else para
            if len(test) <= self.chunk_size:
                current_chunk = test
            else:
                # Lưu chunk hiện tại
                if current_chunk:
                    chunks.append(self._create_chunk(
                        current_chunk, chunk_index, metadata
                    ))
                    chunk_index += 1

                    # Overlap: lấy phần cuối chunk trước
                    if self.chunk_overlap > 0:
                        overlap = current_chunk[-self.chunk_overlap:]
                        current_chunk = overlap + "\n\n" + para
                    else:
                        current_chunk = para
                else:
                    current_chunk = para

        # Lưu chunk cuối cùng
        if current_chunk:
            chunks.append(self._create_chunk(current_chunk, chunk_index, metadata))

        return chunks

    def _chunk_by_sentences(self, text: str) -> list[str]:
        """Chia text dài theo câu."""
        # Tách câu tiếng Việt
        sentences = re.split(r"(?<=[.!?])\s+", text)
        chunks = []
        current = ""

        for sent in sentences:
            test = current + " " + sent if current else sent
            if len(test) <= self.chunk_size:
                current = test
            else:
                if current:
                    chunks.append(current.strip())
                current = sent

        if current:
            chunks.append(current.strip())

        return chunks

    def _create_chunk(self, text: str, index: int, metadata: dict = None) -> dict:
        """Tạo một chunk object."""
        chunk = {
            "chunk_id": f"chunk_{index:04d}",
            "content": text.strip(),
            "char_count": len(text.strip()),
        }
        if metadata:
            chunk["source_url"] = metadata.get("url", "")
            chunk["source_title"] = metadata.get("title", "")
            chunk["category"] = metadata.get("category", "")
        return chunk

    # ===========================================================
    # TẠO KNOWLEDGE BASE ENTRIES
    # ===========================================================
    def create_knowledge_entries(self, scraped_data: list[dict], category: str) -> list[dict]:
        """
        Chuyển đổi dữ liệu đã cào thành Knowledge Base entries.
        Mỗi entry là một đơn vị thông tin có thể tra cứu.
        """
        entries = []

        for page in scraped_data:
            meta = page.get("metadata", {})
            meta["category"] = category

            # 1. Entry từ nội dung chính (đã chunk)
            content = page.get("content", "")
            if content:
                content_chunks = self.chunk_text(content, meta)
                for chunk in content_chunks:
                    chunk["type"] = "content"
                    entries.append(chunk)

            # 2. Entry từ FAQ
            for faq in page.get("faq", []):
                entries.append({
                    "type": "faq",
                    "question": self.clean_text(faq["question"]),
                    "answer": self.clean_text(faq["answer"]),
                    "source_url": meta.get("url", ""),
                    "source_title": meta.get("title", ""),
                    "category": category,
                })

            # 3. Entry từ thông tin gói cước
            for pkg in page.get("packages", []):
                entry = {
                    "type": "package",
                    "category": category,
                    "source_url": meta.get("url", ""),
                    "source_title": meta.get("title", ""),
                }
                entry.update(pkg)

                # Tạo mô tả text cho package (dùng cho embedding)
                desc_parts = []
                if pkg.get("name"):
                    desc_parts.append(f"Gói {pkg['name']}")
                if pkg.get("price"):
                    desc_parts.append(f"giá {pkg['price']}")
                if pkg.get("data"):
                    desc_parts.append(f"dung lượng {pkg['data']}")
                if pkg.get("duration"):
                    desc_parts.append(f"thời hạn {pkg['duration']}")
                if pkg.get("description"):
                    desc_parts.append(pkg["description"])
                if pkg.get("register_syntax"):
                    desc_parts.append(f"Đăng ký: {pkg['register_syntax']}")

                entry["content"] = ". ".join(desc_parts)
                entries.append(entry)

            # 4. Entry từ bảng (table data)
            for table in page.get("tables", []):
                if table.get("rows"):
                    # Chuyển bảng thành text mô tả
                    table_text = self._table_to_text(table)
                    if table_text:
                        entries.append({
                            "type": "table",
                            "content": table_text,
                            "source_url": meta.get("url", ""),
                            "source_title": meta.get("title", ""),
                            "category": category,
                        })

        return entries

    def _table_to_text(self, table: dict) -> str:
        """Chuyển bảng dữ liệu thành text mô tả."""
        lines = []
        headers = table.get("headers", [])

        for row in table.get("rows", []):
            if isinstance(row, dict):
                parts = [f"{k}: {v}" for k, v in row.items() if v]
                lines.append(" | ".join(parts))
            elif isinstance(row, list) and headers:
                parts = [f"{h}: {v}" for h, v in zip(headers, row) if v]
                lines.append(" | ".join(parts))

        return "\n".join(lines)

    # ===========================================================
    # XỬ LÝ TOÀN BỘ DỮ LIỆU
    # ===========================================================
    def process_all(self):
        """
        Xử lý toàn bộ dữ liệu thô đã cào và xuất ra knowledge base.
        """
        logger.info("🔧 BẮT ĐẦU XỬ LÝ DỮ LIỆU...")

        all_entries = []

        for category, target in SCRAPE_TARGETS.items():
            raw_file = os.path.join(RAW_DIR, target["output_file"])

            if not os.path.exists(raw_file):
                logger.warning(f"  ⚠ File not found: {raw_file}, skipping...")
                continue

            logger.info(f"  📂 Processing: {category} ({raw_file})")

            with open(raw_file, "r", encoding="utf-8") as f:
                scraped_data = json.load(f)

            entries = self.create_knowledge_entries(scraped_data, category)
            all_entries.extend(entries)

            # Lưu riêng từng danh mục
            processed_file = os.path.join(
                PROCESSED_DIR,
                f"kb_{category}.json"
            )
            with open(processed_file, "w", encoding="utf-8") as f:
                json.dump(entries, f, ensure_ascii=False, indent=2)

            logger.info(
                f"    ✅ {category}: {len(entries)} entries → kb_{category}.json"
            )

        # Lưu toàn bộ knowledge base
        kb_file = os.path.join(PROCESSED_DIR, "knowledge_base.json")
        with open(kb_file, "w", encoding="utf-8") as f:
            json.dump(all_entries, f, ensure_ascii=False, indent=2)

        # Tạo summary
        summary = {
            "processed_at": datetime.now().isoformat(),
            "total_entries": len(all_entries),
            "entry_types": {},
            "categories": {},
        }
        for entry in all_entries:
            etype = entry.get("type", "unknown")
            summary["entry_types"][etype] = summary["entry_types"].get(etype, 0) + 1
            ecat = entry.get("category", "unknown")
            summary["categories"][ecat] = summary["categories"].get(ecat, 0) + 1

        summary_file = os.path.join(PROCESSED_DIR, "processing_summary.json")
        with open(summary_file, "w", encoding="utf-8") as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)

        logger.info(f"\n{'='*60}")
        logger.info(f"🏁 XỬ LÝ HOÀN TẤT!")
        logger.info(f"   Tổng entries: {len(all_entries)}")
        logger.info(f"   File output: {kb_file}")
        for etype, count in summary["entry_types"].items():
            logger.info(f"   - {etype}: {count}")
        logger.info(f"{'='*60}")

        return all_entries

    # ===========================================================
    # XUẤT DẠNG CSV (cho review)
    # ===========================================================
    def export_csv(self):
        """Xuất knowledge base ra CSV để tiện review."""
        import pandas as pd

        kb_file = os.path.join(PROCESSED_DIR, "knowledge_base.json")
        if not os.path.exists(kb_file):
            logger.error("Knowledge base file not found! Run process_all() first.")
            return

        with open(kb_file, "r", encoding="utf-8") as f:
            entries = json.load(f)

        df = pd.DataFrame(entries)
        csv_file = os.path.join(PROCESSED_DIR, "knowledge_base.csv")
        df.to_csv(csv_file, index=False, encoding="utf-8-sig")

        logger.info(f"  📊 Exported CSV: {csv_file} ({len(df)} rows)")
        return csv_file
