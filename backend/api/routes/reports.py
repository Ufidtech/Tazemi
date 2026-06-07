from fastapi import APIRouter, Depends
from fastapi.responses import Response


from backend.models import DateRange, AnalyticsWindow
from backend.services.reporting_service import get_analytics_summary, get_operational_report, build_export

router = APIRouter()


@router.get("/analytics")
def analytics_summary(window: AnalyticsWindow = Depends()):
    return {"filters": window.model_dump(), "data": get_analytics_summary()}


@router.get("/operational")
def operational_report(date_range: DateRange = Depends()):
    return {"filters": date_range.model_dump(), "data": get_operational_report()}


@router.get("/export/{format_name}")
def export_report(format_name: str):
    export = build_export(format_name)
    content_type = {
        "csv": "text/csv",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "pdf": "application/pdf",
    }.get(export["format"], "application/json")
    filename = {
        "csv": "report.csv",
        "xlsx": "report.xlsx",
        "excel": "report.xlsx",
        "pdf": "report.pdf",
    }.get(export["format"], "report.json")
    content = export["content"] if isinstance(export["content"], (bytes, bytearray)) else str(export["content"]).encode("utf-8")
    return Response(content=content, media_type=content_type, headers={"Content-Disposition": f"attachment; filename={filename}"})
