import math, re

class BM25Index:
    K1 = 1.5
    B = 0.75
    _VI_STOPWORDS = {
        "va", "hoac", "cua", "cho", "la", "cac", "nhung", "duoc", "bi",
        "thi", "ma", "nao", "gi", "dau", "o", "khi", "tai", "sao",
        "the", "hay", "toi", "ban", "co", "khong", "da", "dang", "se",
        "lai", "nhu", "voi", "ra", "nay", "kia", "deu", "tat", "ca",
    }

    def __init__(self):
        self.corpus_tokens = []
        self.doc_ids = []
        self.doc_texts = []
        self.idf = {}
        self.avgdl = 0.0
        self._built = False

    @staticmethod
    def tokenize(text):
        text = text.lower()
        text = re.sub(r"[^\w\s]", " ", text)
        tokens = text.split()
        return [t for t in tokens if t not in BM25Index._VI_STOPWORDS and len(t) > 1]

    def build(self, documents, doc_ids):
        self.doc_ids = list(doc_ids)
        self.doc_texts = list(documents)
        self.corpus_tokens = [self.tokenize(d) for d in documents]
        N = len(self.corpus_tokens)
        if N == 0:
            return
        self.avgdl = sum(len(t) for t in self.corpus_tokens) / N
        df = {}
        for tokens in self.corpus_tokens:
            for term in set(tokens):
                df[term] = df.get(term, 0) + 1
        self.idf = {
            term: math.log((N - freq + 0.5) / (freq + 0.5) + 1)
            for term, freq in df.items()
        }
        self._built = True

    def get_scores(self, query):
        if not self._built or not self.corpus_tokens:
            return [0.0] * len(self.corpus_tokens)
        scores = [0.0] * len(self.corpus_tokens)
        for term in self.tokenize(query):
            idf_val = self.idf.get(term, 0.0)
            if idf_val == 0.0:
                continue
            for i, doc_tokens in enumerate(self.corpus_tokens):
                tf = doc_tokens.count(term)
                if tf == 0:
                    continue
                dl = len(doc_tokens)
                num = tf * (self.K1 + 1)
                den = tf + self.K1 * (1 - self.B + self.B * dl / self.avgdl)
                scores[i] += idf_val * (num / den)
        return scores

    def top_k(self, query, k=10):
        scores = self.get_scores(query)
        indexed = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
        return [(self.doc_ids[i], sc, self.doc_texts[i]) for i, sc in indexed[:k] if sc > 0.0]


def reciprocal_rank_fusion(vector_results, bm25_results, k_rrf=60, alpha=0.5):
    doc_texts = {}
    rrf_scores = {}
    for rank, (doc_id, score, text) in enumerate(vector_results):
        doc_texts[doc_id] = text
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + alpha / (k_rrf + rank + 1)
    for rank, (doc_id, score, text) in enumerate(bm25_results):
        doc_texts[doc_id] = text
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1 - alpha) / (k_rrf + rank + 1)
    merged = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    return [(doc_id, sc, doc_texts[doc_id]) for doc_id, sc in merged]
