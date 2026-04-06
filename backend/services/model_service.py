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


# Provider → LiteLLM config
# liteLLM uses "provider/model" format and auto-detects API base
PROVIDER_CONFIG: dict[str, dict] = {
    "claude": {
        "model": "claude/claude-sonnet-4-6",
        "api_key_env": "ANTHROPIC_API_KEY",
    },
    "openai": {
        "model": "openai/gpt-4o",
        "api_key_env": "OPENAI_API_KEY",
    },
    "deepseek": {
        "model": "deepseek/deepseek-chat",
        "api_base": "https://api.deepseek.com",
        "api_key_env": "DEEPSEEK_API_KEY",
    },
    "qwen": {
        "model": "qwen/qwen-plus",
        "api_base": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "api_key_env": "DASHSCOPE_API_KEY",
    },
    "kimi": {
        "model": "moonshot/kimi-moon-shot",
        "api_base": "https://api.moonshot.cn/v1",
        "api_key_env": "MOONSHOT_API_KEY",
    },
    "minimax": {
        "model": "minimax/MiniMax-M2.7",
        "api_base": "https://api.minimax.chat/v1",
        "api_key_env": "MINIMAX_API_KEY",
    },
    "ollama": {
        "model": "ollama/llama3.2-vision:latest",
        "api_base": "http://ollama:11434",
        "api_key_env": None,
    },
}


class ModelService:
    """Unified model service supporting multiple providers via LiteLLM."""

    def __init__(self):
        self.provider = settings.model_provider
        self._configure_litellm()

    def _configure_litellm(self) -> None:
        """Configure LiteLLM based on selected provider."""
        config = PROVIDER_CONFIG.get(self.provider, PROVIDER_CONFIG["claude"])

        # Set API key from environment
        api_key_env = config.get("api_key_env")
        if api_key_env:
            env_val = os.environ.get(api_key_env) or self._get_api_key_from_settings(api_key_env)
            if env_val:
                os.environ[api_key_env] = env_val

        # Set API base URL if specified
        api_base = config.get("api_base")
        if api_base:
            litellm.api_base = api_base

    def _get_api_key_from_settings(self, key_name: str) -> Optional[str]:
        """Get API key from settings based on environment variable name."""
        key_map = {
            "ANTHROPIC_API_KEY": settings.anthropic_api_key,
            "OPENAI_API_KEY": settings.openai_api_key,
            "DEEPSEEK_API_KEY": settings.deepseek_api_key,
            "DASHSCOPE_API_KEY": settings.dashscope_api_key,
            "MOONSHOT_API_KEY": settings.moonshot_api_key,
            "MINIMAX_API_KEY": settings.minimax_api_key,
        }
        return key_map.get(key_name)

    def _get_model_name(self, provider: str) -> str:
        """Get model name for the given provider."""
        model_map = {
            "claude": settings.anthropic_model,
            "openai": settings.openai_model,
            "deepseek": settings.deepseek_model,
            "qwen": settings.qwen_model,
            "kimi": settings.kimi_model,
            "minimax": settings.minimax_model,
            "ollama": settings.ollama_model,
        }
        return model_map.get(provider, PROVIDER_CONFIG[provider]["model"])

    def _provider_supports_vision(self, provider: str) -> bool:
        """Check if provider supports image inputs."""
        # Known vision-capable models
        vision_providers = {
            "claude": True,
            "openai": True,  # gpt-4o vision
            "ollama": True,  # llama3.2-vision
            "qwen": True,    # qwen-vl series
            "kimi": True,    # moonshot-v1 supports vision
            "deepseek": False,
            "minimax": False,
        }
        return vision_providers.get(provider, False)

    def _load_prompt_template(self, contract_type: str) -> dict:
        """Load YAML prompt template for contract type."""
        template_path = prompts_dir / f"{contract_type}.yaml"
        if not template_path.exists():
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
        has_images = bool(images) and self._provider_supports_vision(self.provider)

        # Truncate text based on provider context limits
        max_text = 8000 if self.provider == "ollama" else 15000

        if has_images:
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
                        {"type": "text", "text": f"请分析以下合同文本和图片：\n\n{text[:max_text]}"},
                        *image_contents,
                    ],
                },
            ]
        else:
            # Text only
            img_note = "（注意：当前模型不支持图片分析，仅分析文本）" if images else ""
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"请分析以下合同文本{img_note}：\n\n{text[:max_text]}"},
            ]

        return messages

    def _build_system_prompt(self, template: dict) -> str:
        """Build system prompt from YAML template."""
        sections = [
            "你是一个专业的合同审查助手，帮助用户识别合同风险、补充缺失条款、提出修改建议。",
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
        sections.append('    { "clause_id": "...", "clause_text": "...", "risk_level": "HIGH|MEDIUM|LOW|INFO", "category": "...", "suggestion": "...", "rewrite": "..." }')
        sections.append('  ],')
        sections.append('  "images": [')
        sections.append('    { "image_id": "...", "image_index": 0, "risk_level": "HIGH|MEDIUM|LOW|INFO", "category": "...", "suggestion": "...", "action": "delete|replace|keep" }')
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

        # Determine provider (allow override from request)
        provider = request.provider or self.provider
        model_name = self._get_model_name(provider)

        # Reset litellm state for this call
        litellm.api_base = PROVIDER_CONFIG.get(provider, {}).get("api_base")

        # Set API key for this provider
        config = PROVIDER_CONFIG.get(provider, {})
        api_key_env = config.get("api_key_env")
        if api_key_env:
            key = os.environ.get(api_key_env) or self._get_api_key_from_settings(api_key_env)
            if key:
                os.environ[api_key_env] = key

        extra_kwargs = {}
        if provider != "ollama":
            extra_kwargs["api_key"] = os.environ.get(api_key_env) if api_key_env else None

        # streaming
        try:
            response = completion(
                model=model_name,
                messages=messages,
                stream=True,
                temperature=0.3,
                response_format={"type": "json_object"},
                **extra_kwargs,
            )

            full_response = ""
            for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    if full_response.strip().startswith("{"):
                        yield {"type": "partial", "content": full_response}

            # Parse final result
            if full_response.strip().startswith("{"):
                try:
                    result = json.loads(full_response)
                    clauses = [ClauseSuggestion(**c) for c in result.get("clauses", [])]
                    images = [ImageSuggestion(**img) for img in result.get("images", [])]

                    for clause in clauses:
                        yield {
                            "type": "clause",
                            "clause": clause.model_dump(),
                            "total_clauses": len(clauses),
                            "total_images": len(images),
                        }

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
