from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import models, schemas
from database import get_db
from .auth import get_current_user
import statement_parser
import ai_service
import uuid

router = APIRouter()

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB - statements are text, not media


def _mark_duplicates(candidates: list, existing_transactions: list):
    """Same-date, same-amount (within a cent) match against the user's existing ledger.
    Defaults matched rows to skipped in the review UI rather than silently merging them."""
    existing_index = {}
    for t in existing_transactions:
        key = (t.date[:10], round(t.amount, 2), t.type)
        existing_index.setdefault(key, 0)
        existing_index[key] += 1

    for c in candidates:
        key = (c["date"], round(c["amount"], 2), c["type"])
        if existing_index.get(key, 0) > 0:
            c["is_duplicate"] = True
            c["duplicate_reason"] = "Matches an existing transaction on the same date and amount"
        else:
            c["is_duplicate"] = False


@router.post("/import/parse", response_model=schemas.ImportParseResponse)
async def parse_statement(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large - statements are limited to 5MB")

    filename = file.filename or "statement"
    is_pdf = filename.lower().endswith(".pdf") or file.content_type == "application/pdf"

    try:
        if is_pdf:
            text = statement_parser.extract_pdf_text(content)
            if not text.strip():
                raise HTTPException(status_code=400, detail="Couldn't extract any text from this PDF - it may be a scanned image rather than a text-based statement")
            try:
                raw_candidates = await ai_service.parse_statement_text(text)
            except HTTPException:
                raise
            except Exception as e:
                # Distinct from a malformed file (400/422) - this is "no AI backend is
                # currently usable" (bad/missing Gemini key, Ollama down), a service-side
                # config problem the user needs to fix, not a bad upload.
                raise HTTPException(status_code=503, detail=str(e))
            candidates = []
            for r in raw_candidates:
                if not r.get("date") or not r.get("amount"):
                    continue
                raw_description = r.get("description") or ""
                merchant, is_peer_transfer = statement_parser.clean_merchant_name(raw_description)
                candidates.append({
                    "date": r.get("date"),
                    "amount": abs(float(r.get("amount", 0))),
                    "type": r.get("type", "expense"),
                    "merchant": merchant or None,
                    "description": raw_description or None,
                    "category": statement_parser.guess_category(merchant, is_peer_transfer),
                })
            skipped = len(raw_candidates) - len(candidates)
            source_type = "pdf"
        else:
            candidates, skipped = statement_parser.parse_csv(content)
            source_type = "csv"
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse statement: {e}")

    existing = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).all()
    _mark_duplicates(candidates, existing)

    return schemas.ImportParseResponse(
        filename=filename,
        source_type=source_type,
        candidates=candidates,
        skipped_rows=skipped,
    )


@router.post("/import/commit", response_model=list[schemas.Transaction])
def commit_import(
    payload: schemas.ImportCommitRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    created = []
    for t in payload.transactions:
        data = t.dict()
        data["source"] = "imported"
        db_transaction = models.Transaction(**data, user_id=current_user.id)
        if not db_transaction.id:
            db_transaction.id = str(uuid.uuid4())
        db.add(db_transaction)
        created.append(db_transaction)

    db.commit()
    for t in created:
        db.refresh(t)
    return created
