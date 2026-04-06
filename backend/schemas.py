from pydantic import BaseModel
from typing import Optional


class ContractType(BaseModel):
    id: str
    name: str
    description: str = ""


class ParsedContract(BaseModel):
    text: str
    images: list[str]  # base64 encoded images
    filename: str


class AnalyzeRequest(BaseModel):
    text: str
    contract_type: str
    images: list[str] = []  # base64 encoded images


class ClauseSuggestion(BaseModel):
    clause_id: str
    clause_text: str
    risk_level: str  # HIGH / MEDIUM / LOW / INFO
    category: str
    suggestion: str
    rewrite: Optional[str] = None


class ImageSuggestion(BaseModel):
    image_id: str
    image_index: int
    risk_level: str
    category: str
    suggestion: str
    action: str  # "delete" / "replace" / "keep"


class AnalyzeResult(BaseModel):
    type: str  # "clause" / "image" / "done"
    clause: Optional[ClauseSuggestion] = None
    image: Optional[ImageSuggestion] = None
    total_clauses: int = 0
    total_images: int = 0


class AnalyzeResponse(BaseModel):
    clauses: list[ClauseSuggestion]
    images: list[ImageSuggestion]
