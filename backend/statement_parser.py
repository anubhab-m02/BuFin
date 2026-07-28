import csv
import io
import re
from datetime import datetime

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
    "Services": ["laundry", "dry clean", "tumbledry", "salon", "spa", "tailor"],
}

DATE_FORMATS = [
    "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%d %b %Y", "%d %B %Y", "%b %d, %Y",
]

# --- PII redaction -----------------------------------------------------------------
# Indian bank/card statements routinely print account numbers, customer/CIF IDs, card
# numbers, PAN, and registered phone numbers in headers, footers, and narration lines.
# This runs on the FULL extracted text before any of it reaches an AI model (local or
# cloud) - defense in depth, since Gemini is a third-party service and even the local
# Ollama call shouldn't need to see this to extract transaction rows.
_PAN_RE = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")
_EMAIL_RE = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")
_PHONE_RE = re.compile(r"(?<!\d)(?:\+?91[-\s]?)?[6-9]\d{9}(?!\d)")
# Any standalone run of 9+ digits (account/card/customer-ID numbers). Bank transaction
# reference numbers embedded in UPI narration (e.g. "P2M/609427137208/SWIGGY") also
# match this and get masked too - harmless, since clean_merchant_name() below extracts
# the merchant name from narration structurally, not from the digits.
_LONG_DIGITS_RE = re.compile(r"(?<!\d)\d{9,18}(?!\d)")


def _mask_keep_last4(match: re.Match) -> str:
    digits = match.group(0)
    return "X" * (len(digits) - 4) + digits[-4:]


def redact_pii(text: str) -> str:
    """Best-effort PII scrub of statement text before it reaches any AI model."""
    if not text:
        return text
    text = _PAN_RE.sub("[REDACTED-PAN]", text)
    text = _EMAIL_RE.sub("[REDACTED-EMAIL]", text)
    text = _PHONE_RE.sub("[REDACTED-PHONE]", text)
    text = _LONG_DIGITS_RE.sub(_mask_keep_last4, text)
    return text


# --- Merchant name cleanup ----------------------------------------------------------
# Indian UPI/NEFT/IMPS narration is highly structured but not merchant-friendly, e.g.
# "UPI/P2M/609427137208/SWIGGY" or "/UPI/ICICI Bank /UPI/P2M/646142018709/SWIGGY". This
# is deterministic and far more reliable than asking an LLM to guess a clean name from
# raw narration - regex extraction of the trailing name segment, applied to every row
# from both the CSV and AI-parsed PDF paths, so bulk imports don't leave the user with
# hundreds of rows to hand-edit.
# Transaction-ID segment is optional (some narration omits it, e.g. "UPI/P2M/TUMBLEDRY")
# and may already be redact_pii()-masked to XXXXXXXX1234 by the time this runs, since
# redaction happens on the full text before any per-row parsing - match digits or X's.
_UPI_RE = re.compile(r"UPI/(P2[AM])/(?:[\dX]+/)?([A-Za-z0-9 .&'_-]+)", re.IGNORECASE)
_NEFT_IMPS_RE = re.compile(r"(?:NEFT|IMPS|RTGS)[-/][\w]*[-/]([A-Za-z][A-Za-z0-9 .&'_-]{2,})", re.IGNORECASE)

# UPI "P2A" (person-to-account) is a peer transfer, not a merchant purchase - route
# these to Transfers instead of leaving them Uncategorized, which is what a bulk
# statement import would otherwise dump most peer payments into.
_PEER_TRANSFER_MARKERS = ("p2a",)


def clean_merchant_name(raw: str) -> tuple:
    """Returns (clean_name, is_peer_transfer). Falls back to a trimmed/title-cased
    version of the original text when no known narration pattern matches."""
    raw = (raw or "").strip()
    if not raw:
        return "", False

    m = _UPI_RE.search(raw)
    if m:
        kind, name = m.group(1).lower(), m.group(2).strip(" /.-")
        return (name.title() if name else raw.strip()), (kind in _PEER_TRANSFER_MARKERS)

    m = _NEFT_IMPS_RE.search(raw)
    if m:
        return m.group(1).strip(" /.-").title(), False

    # Generic cleanup: collapse repeated slashes/spaces from bank-formatted narration.
    cleaned = re.sub(r"[/\\]+", " ", raw)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned[:60], False


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


def guess_category(description: str, is_peer_transfer: bool = False) -> str:
    if is_peer_transfer:
        return "Transfers"
    text = (description or "").lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return category
    return "Uncategorized"


def parse_csv(content: bytes):
    """Returns (candidates: list[dict], skipped_rows: int). Each candidate matches
    schemas.ImportCandidate's shape (as a plain dict, caller wraps it in the schema)."""
    text = redact_pii(content.decode("utf-8-sig", errors="replace"))
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
        raw_description = (row.get(desc_col, "") or "").strip() if desc_col else ""

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

        merchant, is_peer_transfer = clean_merchant_name(raw_description)
        candidates.append({
            "date": parsed_date,
            "amount": amount,
            "type": txn_type,
            "merchant": merchant or None,
            "description": raw_description or None,
            "category": guess_category(merchant, is_peer_transfer),
        })

    return candidates, skipped


def extract_pdf_text(content: bytes) -> str:
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(content))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def chunk_text_by_lines(text: str, max_chars: int) -> list:
    """Splits text into line-respecting chunks, each under max_chars - used so a
    multi-page statement gets sent across several AI calls instead of being silently
    truncated to whatever fit in one prompt."""
    lines = text.split("\n")
    chunks = []
    current, current_len = [], 0
    for line in lines:
        line_len = len(line) + 1
        if current and current_len + line_len > max_chars:
            chunks.append("\n".join(current))
            current, current_len = [], 0
        current.append(line)
        current_len += line_len
    if current:
        chunks.append("\n".join(current))
    return chunks
