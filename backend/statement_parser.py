import csv
import io
import re
from datetime import datetime, date

# Common bank-statement column name variants, lowercased. CSV parsing is fully
# deterministic (no AI call) - it's fast, free, and bank CSV exports follow a small
# number of well-known column conventions, so heuristic mapping covers the common case.
DATE_COLUMNS = {"date", "transaction date", "txn date", "value date", "posting date"}
DESCRIPTION_COLUMNS = {"description", "narration", "details", "particulars", "remarks", "transaction details"}
AMOUNT_COLUMNS = {"amount", "transaction amount"}
DEBIT_COLUMNS = {"debit", "withdrawal", "withdrawal amount", "debit amount"}
CREDIT_COLUMNS = {"credit", "deposit", "deposit amount", "credit amount"}

# Tiny merchant-keyword -> category map for a reasonable first-pass guess. Deliberately
# not AI-driven per row - the user has already flagged AI Quick Add as "very slow", and
# calling a model per CSV row would compound that. The Review screen lets the user fix
# any row's category before committing, so a rough heuristic here is enough.
CATEGORY_KEYWORDS = {
    "Food": ["swiggy", "zomato", "restaurant", "cafe", "food", "eatery", "dining"],
    "Groceries": ["grocery", "supermarket", "bigbasket", "blinkit", "zepto", "dmart"],
    "Transport": ["uber", "ola", "metro", "fuel", "petrol", "diesel", "irctc", "flight"],
    "Shopping": ["amazon", "flipkart", "myntra", "ajio", "mall"],
    "Bills": ["electricity", "water bill", "broadband", "recharge", "dth", "gas bill"],
    "Entertainment": ["netflix", "spotify", "prime video", "hotstar", "movie", "bookmyshow"],
    "Rent": ["rent"],
    "Health": ["pharmacy", "hospital", "clinic", "apollo", "medplus"],
    "Salary": ["salary", "payroll"],
}

DATE_FORMATS = [
    "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%d %b %Y", "%d %B %Y", "%b %d, %Y",
]


def _normalize_header(h: str) -> str:
    return re.sub(r"\s+", " ", (h or "").strip().lower())


def _find_column(headers: list, candidates: set):
    for h in headers:
        if _normalize_header(h) in candidates:
            return h
    return None


def _parse_date(raw: str):
    raw = (raw or "").strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def _parse_amount(raw: str):
    if raw is None:
        return None
    cleaned = re.sub(r"[^\d.\-]", "", str(raw).strip())
    if not cleaned or cleaned in ("-", "."):
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def guess_category(description: str) -> str:
    text = (description or "").lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return category
    return "Uncategorized"


def parse_csv(content: bytes):
    """Returns (candidates: list[dict], skipped_rows: int). Each candidate matches
    schemas.ImportCandidate's shape (as a plain dict, caller wraps it in the schema)."""
    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    headers = reader.fieldnames or []

    date_col = _find_column(headers, DATE_COLUMNS)
    desc_col = _find_column(headers, DESCRIPTION_COLUMNS)
    amount_col = _find_column(headers, AMOUNT_COLUMNS)
    debit_col = _find_column(headers, DEBIT_COLUMNS)
    credit_col = _find_column(headers, CREDIT_COLUMNS)

    if not date_col or (not amount_col and not (debit_col or credit_col)):
        raise ValueError(
            "Couldn't find recognizable Date/Amount (or Debit/Credit) columns in this CSV. "
            f"Found columns: {', '.join(headers) if headers else 'none'}"
        )

    candidates = []
    skipped = 0

    for row in reader:
        parsed_date = _parse_date(row.get(date_col, ""))
        description = (row.get(desc_col, "") or "").strip() if desc_col else ""

        if amount_col:
            amount = _parse_amount(row.get(amount_col))
            if amount is None:
                skipped += 1
                continue
            txn_type = "income" if amount >= 0 else "expense"
            amount = abs(amount)
        else:
            debit = _parse_amount(row.get(debit_col)) if debit_col else None
            credit = _parse_amount(row.get(credit_col)) if credit_col else None
            if credit:
                amount, txn_type = credit, "income"
            elif debit:
                amount, txn_type = debit, "expense"
            else:
                skipped += 1
                continue

        if not parsed_date or not amount:
            skipped += 1
            continue

        candidates.append({
            "date": parsed_date,
            "amount": amount,
            "type": txn_type,
            "merchant": description[:60] if description else None,
            "description": description or None,
            "category": guess_category(description),
        })

    return candidates, skipped


def extract_pdf_text(content: bytes) -> str:
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(content))
    return "\n".join(page.extract_text() or "" for page in reader.pages)
