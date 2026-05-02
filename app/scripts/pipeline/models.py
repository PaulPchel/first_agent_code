"""Pydantic models for the menu parsing pipeline."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class SourceType(str, Enum):
    PDF = "pdf"
    HTML = "html"
    IMAGE = "image"
    UNKNOWN = "unknown"


class RestaurantEntry(BaseModel):
    """A single row from the restaurants CSV, filtered to Parse / Cal."""

    row_number: int
    name: str
    url: str
    slug: str = ""
    source_type: SourceType = SourceType.UNKNOWN


class ParsedDish(BaseModel):
    """A single dish extracted by the LLM structurer."""

    dish_name: str
    description: str | None = None
    price: float | None = None
    calories: float | None = None
    protein: float | None = Field(None, description="grams")
    fat: float | None = Field(None, description="grams")
    carbs: float | None = Field(None, description="grams")


class RestaurantResult(BaseModel):
    """Full extraction result for one restaurant."""

    name: str
    slug: str = ""
    url: str
    source_type: SourceType
    raw_file: str = ""
    text_file: str = ""
    dishes: list[ParsedDish] = []
    error: str | None = None
