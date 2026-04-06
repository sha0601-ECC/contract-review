import os
import json
import base64
from pathlib import Path
from typing import Optional
from urllib.parse import quote

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel

from services.parser import parse_contract
from services.model_service import ModelService
from services.exporter import html_to_docx
from schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    ContractType,
    ClauseSuggestion,
    ImageSuggestion,
)

app = FastAPI(title="Contract Review API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_service = ModelService()
prompts_dir = Path(__file__).parent / "prompts"


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/contracts/types", response_model=list[ContractType])
async def get_contract_types():
    """Return all available contract type templates."""
    types = []
    for yaml_file in sorted(prompts_dir.glob("*.yaml")):
        with open(yaml_file, encoding="utf-8") as f:
            import yaml
            data = yaml.safe_load(f)
            types.append(ContractType(
                id=yaml_file.stem,
                name=data.get("contract_type", yaml_file.stem),
                description=data.get("description", ""),
            ))
    return types


@app.post("/contracts/parse")
async def parse_contract_file(file: UploadFile = File(...)):
    """Upload a contract file (PDF/Word/text) and extract text + images."""
    suffix = Path(file.filename).suffix.lower()
    if suffix not in [".pdf", ".docx", ".doc", ".txt"]:
        raise HTTPException(400, f"Unsupported file type: {suffix}")

    content = await file.read()

    try:
        result = await parse_contract(content, suffix, file.filename)
        return result
    except Exception as e:
        raise HTTPException(500, f"Failed to parse file: {e}")


@app.post("/contracts/analyze")
async def analyze_contract(request: AnalyzeRequest):
    """
    Analyze contract text (+ optional images) and return suggestions.
    Uses SSE for streaming results.
    """
    async def stream():
        async for item in model_service.analyze(request):
            yield f"data: {json.dumps(item, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )


class ExportRequest(BaseModel):
    html_content: str
    images: list[str] = []  # base64 encoded
    filename: str = "contract"


@app.post("/contracts/export")
async def export_contract(request: ExportRequest):
    """Export HTML content + images as a Word document."""
    try:
        docx_bytes = html_to_docx(request.html_content, request.images)
        filename = f"{request.filename}_审核后.docx"
        encoded_filename = quote(filename)
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
            },
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to export document: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
