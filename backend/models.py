from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator, model_validator


class WriteModel(BaseModel):
    class Config:
        extra = "forbid"


class PatchModel(BaseModel):
    class Config:
        extra = "forbid"


class ValidatedModel(BaseModel):
    class Config:
        extra = "forbid"


class BaseRecord(BaseModel):
    id: str = Field(default_factory=lambda: uuid4().hex)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None


class SensorReadingCreate(WriteModel):
    truck_id: str
    timestamp: str
    temperature: float
    humidity: float
    gas_ppm: float
    vibration_g: float
    gps: Dict[str, float] = Field(default_factory=dict)
    severity: str = "normal"

    @field_validator("truck_id", "timestamp", "severity")
    @classmethod
    def _required_text(cls, value: str):
        if not str(value).strip():
            raise ValueError("must not be empty")
        return value

    @model_validator(mode="after")
    def _validate_ranges(self):
        if self.humidity < 0 or self.humidity > 100:
            raise ValueError("humidity must be between 0 and 100")
        if self.temperature < -50 or self.temperature > 100:
            raise ValueError("temperature out of allowed range")
        if self.gas_ppm < 0 or self.vibration_g < 0:
            raise ValueError("sensor values must be non-negative")
        return self


class SensorReading(SensorReadingCreate, BaseRecord):
    pass


class AlertCreate(WriteModel):
    truck_id: str
    sensor_reading_id: Optional[str] = None
    type: str
    severity: str
    status: str = "open"
    message: str
    cooldown_until: Optional[str] = None

    @field_validator("truck_id", "type", "severity", "status", "message")
    @classmethod
    def _required_text(cls, value: str):
        if not str(value).strip():
            raise ValueError("must not be empty")
        return value


class Alert(AlertCreate, BaseRecord):
    pass


class CTONoteCreate(WriteModel):
    title: str
    body: str
    category: str = "general"
    tags: List[str] = Field(default_factory=list)

    @field_validator("title", "body", "category")
    @classmethod
    def _required_text(cls, value: str):
        if not str(value).strip():
            raise ValueError("must not be empty")
        return value


class CTONote(CTONoteCreate, BaseRecord):
    pass


class DashboardMetric(BaseRecord):
    key: str
    value: float
    unit: str = ""
    label: str = ""
    trend: Optional[str] = None


class RnDFormulationSummary(BaseRecord):
    formula: str
    summary: str
    outcome: str
    efficacy_score: Optional[float] = None
    notes: List[str] = Field(default_factory=list)


class TruckCreate(WriteModel):
    aggregator_id: str
    aggregator: str
    route: str
    departure: str
    status: str
    sensors: Dict[str, Any] = Field(default_factory=dict)
    crates: int
    batch_id: str
    formula: str
    alerts: List[dict] = Field(default_factory=list)
    history: List[dict] = Field(default_factory=list)

    @field_validator("aggregator_id", "aggregator", "route", "departure", "status", "batch_id", "formula")
    @classmethod
    def _required_text(cls, value: str):
        if not str(value).strip():
            raise ValueError("must not be empty")
        return value

    @field_validator("crates")
    @classmethod
    def _positive_crates(cls, value: int):
        if value < 0:
            raise ValueError("must be non-negative")
        return value

    @model_validator(mode="after")
    def _validate_business_rules(self):
        if self.status.lower() not in {"planned", "in_transit", "delivered", "delayed", "cancelled"}:
            raise ValueError("invalid truck status")
        if self.crates == 0:
            raise ValueError("truck crates must be greater than zero")
        return self


class Truck(TruckCreate, BaseRecord):
    pass


class BatchCreate(WriteModel):
    date: str
    aggregator_id: str
    aggregator: str
    location: str
    crates: int
    weight: int
    formula: str
    operator: str
    pre_grade: str
    post_grade: str
    truck: Optional[str] = None
    status: str
    notes: str = ""

    @field_validator("date", "aggregator_id", "aggregator", "location", "formula", "operator", "pre_grade", "post_grade", "status")
    @classmethod
    def _required_text(cls, value: str):
        if not str(value).strip():
            raise ValueError("must not be empty")
        return value

    @model_validator(mode="after")
    def _validate_business_rules(self):
        if self.crates <= 0:
            raise ValueError("batch crates must be greater than zero")
        if self.weight <= 0:
            raise ValueError("batch weight must be greater than zero")
        return self


class Batch(BatchCreate, BaseRecord):
    pass


class AggregatorCreate(WriteModel):
    name: str
    location: str
    contact: str
    status: str
    joined: str
    batches: int
    crates: int
    spoilage_rate: float
    revenue: int
    trucks: int
    notes: str = ""

    @field_validator("name", "location", "contact", "status", "joined")
    @classmethod
    def _required_text(cls, value: str):
        if not str(value).strip():
            raise ValueError("must not be empty")
        return value

    @field_validator("batches", "crates", "revenue", "trucks")
    @classmethod
    def _non_negative_int(cls, value: int):
        if value < 0:
            raise ValueError("must be non-negative")
        return value

    @field_validator("spoilage_rate")
    @classmethod
    def _spoilage_rate(cls, value: float):
        if value < 0:
            raise ValueError("must be non-negative")
        return value

    @model_validator(mode="after")
    def _validate_business_rules(self):
        if self.status.lower() not in {"active", "inactive", "suspended"}:
            raise ValueError("invalid aggregator status")
        return self


class Aggregator(AggregatorCreate, BaseRecord):
    pass


class TrialCreate(WriteModel):
    formula: str
    date: str
    av_conc: float
    starch_conc: float
    app_vol: float
    shelf_days: Optional[int] = None
    weight_loss: Optional[float] = None
    visual_day7: Optional[str] = None
    microbial: Optional[float] = None
    status: str
    lead: str
    notes: str = ""

    @field_validator("formula", "date", "status", "lead")
    @classmethod
    def _required_text(cls, value: str):
        if not str(value).strip():
            raise ValueError("must not be empty")
        return value

    @model_validator(mode="after")
    def _validate_business_rules(self):
        if self.av_conc < 0 or self.starch_conc < 0 or self.app_vol < 0:
            raise ValueError("trial measurements must be non-negative")
        return self


class Trial(TrialCreate, BaseRecord):
    pass


class AnalyticsWindow(BaseModel):
    days: int = 30


class DateRange(BaseModel):
    start: Optional[str] = None
    end: Optional[str] = None


class TruckPatch(PatchModel):
    aggregator_id: Optional[str] = None
    aggregator: Optional[str] = None
    route: Optional[str] = None
    departure: Optional[str] = None
    status: Optional[str] = None
    sensors: Optional[Dict[str, Any]] = None
    crates: Optional[int] = None
    batch_id: Optional[str] = None
    formula: Optional[str] = None
    alerts: Optional[List[dict]] = None
    history: Optional[List[dict]] = None


class BatchPatch(PatchModel):
    date: Optional[str] = None
    aggregator_id: Optional[str] = None
    aggregator: Optional[str] = None
    location: Optional[str] = None
    crates: Optional[int] = None
    weight: Optional[int] = None
    formula: Optional[str] = None
    operator: Optional[str] = None
    pre_grade: Optional[str] = None
    post_grade: Optional[str] = None
    truck: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class AggregatorPatch(PatchModel):
    name: Optional[str] = None
    location: Optional[str] = None
    contact: Optional[str] = None
    status: Optional[str] = None
    joined: Optional[str] = None
    batches: Optional[int] = None
    crates: Optional[int] = None
    spoilage_rate: Optional[float] = None
    revenue: Optional[int] = None
    trucks: Optional[int] = None
    notes: Optional[str] = None


class TrialPatch(PatchModel):
    formula: Optional[str] = None
    date: Optional[str] = None
    av_conc: Optional[float] = None
    starch_conc: Optional[float] = None
    app_vol: Optional[float] = None
    shelf_days: Optional[int] = None
    weight_loss: Optional[float] = None
    visual_day7: Optional[str] = None
    microbial: Optional[float] = None
    status: Optional[str] = None
    lead: Optional[str] = None
    notes: Optional[str] = None


class CTONotePatch(PatchModel):
    title: Optional[str] = None
    body: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None


class AlertPatch(PatchModel):
    status: Optional[str] = None
    message: Optional[str] = None
    severity: Optional[str] = None
    cooldown_until: Optional[str] = None


class SensorReadingPatch(PatchModel):
    truck_id: Optional[str] = None
    timestamp: Optional[str] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    gas_ppm: Optional[float] = None
    vibration_g: Optional[float] = None
    gps: Optional[Dict[str, float]] = None
    severity: Optional[str] = None

    @field_validator("truck_id", "timestamp", "severity")
    @classmethod
    def _optional_non_empty(cls, value: Optional[str]):
        if value is not None and not str(value).strip():
            raise ValueError("must not be empty")
        return value


CRATE_GRADES = {"A", "B", "C", "D"}
CRATE_STATUSES = {"available", "in_use", "dispatched", "returned", "damaged", "lost"}
CRATE_CONDITIONS = {"serviceable", "damaged", "lost"}


class CrateCreate(WriteModel):
    grade: str

    @field_validator("grade")
    @classmethod
    def _valid_grade(cls, value: str):
        if value not in CRATE_GRADES:
            raise ValueError("grade must be one of A, B, C, D")
        return value


class CratePatch(PatchModel):
    grade: Optional[str] = None
    status: Optional[str] = None
    condition: Optional[str] = None
    current_aggregator_id: Optional[str] = None
    current_batch_ref: Optional[str] = None

    @field_validator("grade")
    @classmethod
    def _valid_grade(cls, value: Optional[str]):
        if value is not None and value not in CRATE_GRADES:
            raise ValueError("grade must be one of A, B, C, D")
        return value

    @field_validator("status")
    @classmethod
    def _valid_status(cls, value: Optional[str]):
        if value is not None and value not in CRATE_STATUSES:
            raise ValueError(f"status must be one of {sorted(CRATE_STATUSES)}")
        return value

    @field_validator("condition")
    @classmethod
    def _valid_condition(cls, value: Optional[str]):
        if value is not None and value not in CRATE_CONDITIONS:
            raise ValueError(f"condition must be one of {sorted(CRATE_CONDITIONS)}")
        return value


class CrateAssign(WriteModel):
    aggregator_id: str
    batch_ref: str

    @field_validator("aggregator_id", "batch_ref")
    @classmethod
    def _required_text(cls, value: str):
        if not str(value).strip():
            raise ValueError("must not be empty")
        return value


class CrateReturn(WriteModel):
    condition: str = "serviceable"

    @field_validator("condition")
    @classmethod
    def _valid_condition(cls, value: str):
        if value not in CRATE_CONDITIONS:
            raise ValueError(f"condition must be one of {sorted(CRATE_CONDITIONS)}")
        return value


class OperatorCreate(WriteModel):
    name: str
    role: str
    pin: str

    @field_validator("name", "role")
    @classmethod
    def _required_text(cls, value: str):
        if not str(value).strip():
            raise ValueError("must not be empty")
        return value

    @field_validator("pin")
    @classmethod
    def _valid_pin(cls, value: str):
        if not str(value).isdigit() or not 4 <= len(str(value)) <= 6:
            raise ValueError("pin must be 4-6 digits")
        return str(value)


class OperatorPatch(PatchModel):
    name: Optional[str] = None
    role: Optional[str] = None
    pin: Optional[str] = None
    status: Optional[str] = None

    @field_validator("pin")
    @classmethod
    def _valid_pin(cls, value: Optional[str]):
        if value is not None and (not str(value).isdigit() or not 4 <= len(str(value)) <= 6):
            raise ValueError("pin must be 4-6 digits")
        return value

    @field_validator("status")
    @classmethod
    def _valid_status(cls, value: Optional[str]):
        if value is not None and value not in {"active", "inactive"}:
            raise ValueError("status must be active or inactive")
        return value


class OperatorPinVerify(WriteModel):
    pin: str
