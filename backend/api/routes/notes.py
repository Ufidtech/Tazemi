from fastapi import APIRouter, Depends, HTTPException

from backend.auth import audit_log, enforce_rate_limit, get_current_user
from backend.models import CTONoteCreate, CTONotePatch
from backend.services.note_service import create_note, delete_note, list_notes, update_note

router = APIRouter()


@router.get("")
def read_notes():
    return list_notes()


@router.post("")
def write_note(payload: CTONoteCreate, user=Depends(get_current_user)):
    enforce_rate_limit(user, write=True)
    record = create_note(payload.model_dump(), user)
    audit_log("note.create", user, "notes", {"id": record["id"]})
    return record


@router.patch("/{note_id}")
def edit_note(note_id: str, payload: CTONotePatch, user=Depends(get_current_user)):
    enforce_rate_limit(user, write=True)
    record = update_note(note_id, payload.model_dump(exclude_unset=True), user)
    if not record:
        raise HTTPException(status_code=404, detail="Note not found")
    audit_log("note.update", user, "notes", {"id": note_id})
    return record


@router.delete("/{note_id}")
def remove_note(note_id: str, user=Depends(get_current_user)):
    enforce_rate_limit(user, write=True)
    if not delete_note(note_id):
        raise HTTPException(status_code=404, detail="Note not found")
    audit_log("note.delete", user, "notes", {"id": note_id})
    return {"deleted": True}
