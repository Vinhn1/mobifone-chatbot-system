with open('rag_pipeline.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Locate retrieve function
start_marker = "    def retrieve(self, query, n_results=3):"
end_marker = "    def _call_gemini_with_retry"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_retrieve_code = """    def retrieve(self, query, n_results=3):
        \"\"\"Tìm kiếm thông tin từ Vector DB kết hợp khớp chuỗi chính xác và truy vấn ngữ nghĩa\"\"\"
        import re
        
        # 1. Trích xuất tên gói cước (hỗ trợ cả chữ thường và chữ hoa)
        package_match = re.search(r'\\b(?:[0-9]*[a-zA-Z]{1,2}[0-9]+[a-zA-Z]*|[a-zA-Z]{3,6})\\b', query)
        
        package_name = None
        exact_results = {"ids": [], "documents": [], "metadatas": []}
        
        if package_match:
            raw_pkg = package_match.group(0)
            exclusions = {"SMS", "GB", "MB", "DATA", "HOT", "USD", "VND", "RAG", "API"}
            if raw_pkg.upper() not in exclusions:
                package_name = raw_pkg.upper()
                print(f"🔍 Phát hiện từ khóa gói cước '{package_name}', tiến hành quét khớp chuỗi chính xác...")
                
                try:
                    # Lấy tất cả tài liệu chứa từ khóa này trong văn bản
                    get_results = self.collection.get(
                        where_document={"$contains": package_name}
                    )
                    if get_results and get_results.get("ids"):
                        exact_results = get_results
                        print(f"✓ Đã tìm thấy {len(exact_results['ids'])} tài liệu chứa từ khóa '{package_name}'.")
                except Exception as e:
                    print(f"⚠️ Lỗi khi quét khớp chuỗi chính xác: {e}")
        
        # 2. Truy vấn ngữ nghĩa từ ChromaDB
        semantic_results = self.collection.query(
            query_texts=[query],
            n_results=10
        )
        
        # 3. Hợp nhất cả hai nguồn kết quả
        all_candidates = []
        seen_ids = set()
        
        # Thêm kết quả khớp chuỗi chính xác trước
        if exact_results and exact_results.get("ids"):
            for i in range(len(exact_results["ids"])):
                doc_id = exact_results["ids"][i]
                doc = exact_results["documents"][i]
                meta = exact_results["metadatas"][i] or {}
                
                # Điểm ưu tiên cho khớp chuỗi chính xác
                score = 0.1
                
                # Nếu meta package_name khớp hoàn toàn (ví dụ: TK135)
                meta_pkg_name = str(meta.get("package_name", "")).upper()
                if meta_pkg_name == package_name:
                    score = 0.0  # Ưu tiên cao nhất cho gói cước chính xác
                elif package_name in meta_pkg_name:
                    score = 0.05 # Ưu tiên thứ hai cho các chu kỳ dài hơn
                    
                all_candidates.append({
                    "id": doc_id,
                    "document": doc,
                    "metadata": meta,
                    "score": score
                })
                seen_ids.add(doc_id)
                
        # Thêm kết quả truy vấn ngữ nghĩa
        if semantic_results and semantic_results.get("ids"):
            s_ids = semantic_results["ids"][0]
            s_docs = semantic_results["documents"][0]
            s_metas = semantic_results["metadatas"][0]
            s_dists = semantic_results["distances"][0] if semantic_results.get("distances") else [0.5] * len(s_ids)
            
            for i in range(len(s_ids)):
                doc_id = s_ids[i]
                if doc_id not in seen_ids:
                    all_candidates.append({
                        "id": doc_id,
                        "document": s_docs[i],
                        "metadata": s_metas[i] or {},
                        "score": s_dists[i] + 1.0
                    })
                    seen_ids.add(doc_id)
                    
        # 4. Sắp xếp toàn bộ ứng viên theo điểm ưu tiên tăng dần
        all_candidates.sort(key=lambda x: x["score"])
        
        # 5. Loại bỏ trùng lặp nội dung (Deduplication) để tránh lãng phí context
        unique_docs = []
        unique_metadatas = []
        seen_contents = set()
        
        for item in all_candidates:
            content = item["document"].strip()
            norm_content = " ".join(content.split())
            if norm_content not in seen_contents:
                seen_contents.add(norm_content)
                unique_docs.append(item["document"])
                unique_metadatas.append(item["metadata"])
                
            if len(unique_docs) >= n_results:
                break
                
        return {
            "documents": [unique_docs],
            "metadatas": [unique_metadatas]
        }

"""
    new_content = content[:start_idx] + new_retrieve_code + content[end_idx:]
    with open('rag_pipeline.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Success")
else:
    print(f"Error: start={start_idx}, end={end_idx}")
