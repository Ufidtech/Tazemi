from __future__ import annotations

import csv
import io
from typing import Any, Dict, Iterable, List

from openpyxl import Workbook
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas


def _analytics_rows(summary: Dict[str, Any]) -> List[List[Any]]:
    rows: List[List[Any]] = [["metric", "value"]]
    counts = summary.get("counts", {})
    for key, value in counts.items():
        rows.append([f"counts.{key}", value])
    by_status = summary.get("by_status", {})
    for group, status_counts in by_status.items():
        for status, value in status_counts.items():
            rows.append([f"by_status.{group}.{status}", value])
    financials = summary.get("financials", {})
    for key, value in financials.items():
        rows.append([f"financials.{key}", value])
    return rows


def build_csv(summary: Dict[str, Any]) -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    for row in _analytics_rows(summary):
        writer.writerow(row)
    return buffer.getvalue().encode("utf-8")


def build_xlsx(summary: Dict[str, Any]) -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Summary"
    for row in _analytics_rows(summary):
        sheet.append(row)
    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def build_pdf(summary: Dict[str, Any]) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    y = height - 40
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(40, y, "Analytics Summary")
    y -= 24
    pdf.setFont("Helvetica", 10)
    for row in _analytics_rows(summary):
        pdf.drawString(40, y, f"{row[0]}: {row[1]}")
        y -= 14
        if y < 40:
            pdf.showPage()
            y = height - 40
            pdf.setFont("Helvetica", 10)
    pdf.save()
    return buffer.getvalue()
