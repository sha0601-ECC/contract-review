import os
import yaml
import json
import base64
from pathlib import Path
from typing import AsyncGenerator, Optional

import litellm
from litellm import completion

from schemas import AnalyzeRequest, ClauseSuggestion, ImageSuggestion
from config import settings

prompts_dir = Path(__file__).parent.parent / "prompts"


class ModelService:
    """Unified model service supporting both local (Ollama) and online (Claude/OpenAI)."""

    def __init__(self):
        self.model_mode = settings.model_mode
        self._setup_litellm()

    def _setup_litellm(self):
        """Configure LiteLLM based on mode."""
        if self.model_mode == "local":
            litellm.base_url = settings.ollama_base_url
            self.model = settings.ollama_model
        else:
            # Online mode
            if settings.anthropic_api_key:
                os.environ["ANTHROPIC_API_KEY"] = settings.anthropic_api_key
            if settings.openai_api_key:
                os.environ["OPENAI_API_KEY"] = settings.openai_api_key

    def _load_prompt_template(self, contract_type: str) -> dict:
        """Load YAML prompt template for contract type."""
        template_path = prompts_dir / f"{contract_type}.yaml"
        if not template_path.exists():
            # Fallback to generic template
            template_path = prompts_dir / "generic.yaml"

        with open(template_path, encoding="utf-8") as f:
            return yaml.safe_load(f)

    def _build_messages(
        self,
        text: str,
        images: list[str],
        template: dict,
    ) -> list[dict]:
        """Build messages for model, including images if supported."""
        system_prompt = self._build_system_prompt(template)

        if images and self.model_mode == "local":
            # Ollama vision - use base64 images in user message
            image_contents = []
            for img_b64 in images[:5]:  # Limit images
                image_contents.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{img_b64}"},
                })

            messages = [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"请分析以下合同文本和图片：\n\n{text[:8000]}"},
                        *image_contents,
                    ],
                },
            ]
        elif images and self.model_mode == "online":
            # Claude Vision - use base64 images
            image_contents = []
            for img_b64 in images[:10]:
                image_contents.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{img_b64}"},
                })

            messages = [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"请分析以下合同文本和图片：\n\n{text[:15000]}"},
                        *image_contents,
                    ],
                },
            ]
        else:
            # Text only
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"请分析以下合同文本：\n\n{text[:15000]}"},
            ]

        return messages

    def _build_system_prompt(self, template: dict) -> str:
        """Build system prompt from YAML template."""
        sections = [
            f"你是一个专业的合同审查助手，帮助用户识别合同风险、补充缺失条款、提出修改建议。",
            "",
            f"合同类型：{template.get('contract_type', '通用')}",
            "",
        ]

        if "risk_categories" in template:
            sections.append("风险类别：")
            for cat in template["risk_categories"]:
                severity = cat.get("severity", "MEDIUM")
                keywords = ", ".join(cat.get("keywords", []))
                sections.append(f"- [{severity}] {cat['name']}（关键词：{keywords}）")
            sections.append("")

        sections.append("请以结构化的JSON格式返回分析结果：")
        sections.append("{")
        sections.append('  "clauses": [')
        sections.append('    {')
        sections.append('      "clause_id": "条款唯一标识",')
        sections.append('      "clause_text": "相关条款原文",')
        sections.append('      "risk_level": "HIGH|MEDIUM|LOW|INFO",')
        sections.append('      "category": "风险类别",')
        sections.append('      "suggestion": "建议内容",')
        sections.append('      "rewrite": "修改后文本（可选）"')
        sections.append('    }')
        sections.append('  ],')
        sections.append('  "images": [')
        sections.append('    {')
        sections.append('      "image_id": "图片唯一标识",')
        sections.append('      "image_index": 0,')
        sections.append('      "risk_level": "HIGH|MEDIUM|LOW|INFO",')
        sections.append('      "category": "图片风险类别",')
        sections.append('      "suggestion": "图片处理建议",')
        sections.append('      "action": "delete|replace|keep"')
        sections.append('    }')
        sections.append('  ]')
        sections.append("}")

        if "clause_completion_rules" in template:
            sections.append("")
            sections.append("条款补全规则：")
            for rule in template["clause_completion_rules"]:
                sections.append(f"- 缺失：{rule['missing']} → 建议：{rule['suggestion']}")

        if "modification_templates" in template:
            sections.append("")
            sections.append("修改建议模板：")
            for tpl in template["modification_templates"]:
                sections.append(f"- 条款：{tpl['clause']} → 风险：{tpl['risk']} → 修改：{tpl['rewrite']}")

        return "\n".join(sections)

    async def analyze(
        self,
        request: AnalyzeRequest,
    ) -> AsyncGenerator[dict, None]:
        """Stream analysis results clause by clause."""
        template = self._load_prompt_template(request.contract_type)
        messages = self._build_messages(request.text, request.images, template)

        # Select model based on mode
        if self.model_mode == "local":
            model_name = settings.ollama_model
        else:
            # Prefer Claude for vision tasks
            model_name = settings.anthropic_model if not request.images else settings.anthropic_model

        try:
            response = completion(
                model=model_name,
                messages=messages,
                stream=True,
                temperature=0.3,
                response_format={"type": "json_object"},
            )

            full_response = ""
            for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_response += content

                    # Try to parse partial JSON
                    try:
                        # Collect all chunks and yield when we have complete objects
                        if full_response.strip().startswith("{"):
                            # Yield partial progress
                            yield {"type": "partial", "content": full_response}
                    except Exception:
                        pass

            # Final parse and emit complete results
            if full_response.strip().startswith("{"):
                try:
                    result = json.loads(full_response)
                    clauses = [
                        ClauseSuggestion(**c)
                        for c in result.get("clauses", [])
                    ]
                    images = [
                        ImageSuggestion(**img)
                        for img in result.get("images", [])
                    ]

                    # Emit each clause suggestion
                    for i, clause in enumerate(clauses):
                        yield {
                            "type": "clause",
                            "clause": clause.model_dump(),
                            "total_clauses": len(clauses),
                            "total_images": len(images),
                        }

                    # Emit each image suggestion
                    for img in images:
                        yield {
                            "type": "image",
                            "image": img.model_dump(),
                            "total_clauses": len(clauses),
                            "total_images": len(images),
                        }

                    yield {"type": "done", "total_clauses": len(clauses), "total_images": len(images)}

                except json.JSONDecodeError as e:
                    yield {"type": "error", "message": f"JSON parse error: {e}"}
                    yield {"type": "done"}
            else:
                yield {"type": "error", "message": "Unexpected response format"}
                yield {"type": "done"}

        except Exception as e:
            yield {"type": "error", "message": str(e)}
            yield {"type": "done"}
