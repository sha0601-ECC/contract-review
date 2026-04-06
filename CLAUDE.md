# CLAUDE.md — 合同审核系统

## 项目概述

合同条款风险分析与协作审核工具，支持 7 个 LLM provider 的流式分析。

- **Git**: `git@github.com:sha0601-ECC/contract-review.git`
- **前端**: React + Tailwind + TipTap (Vite, port 3000)
- **后端**: FastAPI + Python 3.12 (Uvicorn, port 8000)
- **模型**: LiteLLM 统一封装，支持 claude/openai/deepseek/qwen/kimi/minimax/ollama
- **部署**: Docker Compose

## 快速命令

```bash
# 启动全部服务
docker compose up --build

# 单独启动某服务
docker compose up -d ollama
docker compose up -d backend
docker compose up -d frontend

# 重启某服务
docker compose restart backend

# 查看日志
docker compose logs -f backend
```

## 模型 Provider 配置

使用 `MODEL_PROVIDER` 环境变量选择 provider（替代旧的 `MODEL_MODE`）：

| Provider | API Key 环境变量 | 默认模型 | Vision |
|----------|-----------------|---------|--------|
| claude | ANTHROPIC_API_KEY | claude-sonnet-4-6 | ✅ |
| openai | OPENAI_API_KEY | gpt-4o | ✅ |
| deepseek | DEEPSEEK_API_KEY | deepseek-chat | ❌ |
| qwen | DASHSCOPE_API_KEY | qwen-plus | ✅ |
| kimi | MOONSHOT_API_KEY | moonshot-v1-8k | ✅ |
| minimax | MINIMAX_API_KEY | MiniMax-M2.7 | ✅ |
| ollama | (无) | llama3.2-vision:latest | ✅ |

前端 ProviderSelect 组件支持切换 provider，切换后当前合同重新分析。

## 核心文件

### 后端
- `backend/main.py` — 所有路由（parse/analyze/export），暂无 routes.py 拆分
- `backend/config.py` — Settings 类，所有 API key 和 model name 配置
- `backend/services/model_service.py` — LiteLLM 封装，`PROVIDER_CONFIG` 定义 provider 映射
- `backend/services/parser.py` — PDF/Word 文本+图片提取
- `backend/services/exporter.py` — HTML+base64 → .docx 导出
- `backend/schemas.py` — Pydantic 模型（AnalyzeRequest 等）
- `backend/prompts/*.yaml` — 合同类型提示词模板

### 前端
- `frontend/src/App.tsx` — 主界面，状态管理
- `frontend/src/components/LeftPane.tsx` — TipTap 编辑器，ClauseMark/Image/Highlight 扩展
- `frontend/src/components/RightPane.tsx` — 建议面板，流式显示
- `frontend/src/components/ProviderSelect.tsx` — Provider 下拉选择器
- `frontend/src/extensions/ClauseMark.ts` — 自定义 TipTap Mark（含 clause_id/risk_level）
- `frontend/src/extensions/index.ts` — re-export ClauseMark
- `frontend/src/hooks/useAnalysis.ts` — 分析工作流状态机
- `frontend/src/services/api.ts` — API 调用封装

### 部署
- `docker-compose.yml` — ollama/backend/frontend 三服务
- `backend/Dockerfile` — pip 使用清华镜像（pypi.tuna.tsinghua.edu.cn）

## 已知限制 / 待完成

- [ ] `/contracts/save` 路由未实现（只导出，不持久化）
- [ ] 无数据库，状态全在内存/localStorage
- [ ] routes.py 未拆分（所有路由在 main.py）
- [ ] 图片拖拽插入未实现（仅剪贴板粘贴）
- [ ] PDF 导出未实现（仅支持 Word）
- [ ] 前端 ProviderSelect 不显示当前 provider 状态

## 开发注意

- **Ollama 依赖**：`docker-compose.yml` 中 `depends_on` 用 `service_started` 而非 `service_healthy`（Ollama 容器内无 curl/wget/nc）
- **pip 镜像**：Dockerfile 使用清华镜像解决网络问题
- **前端热重载**：docker-compose volumes 挂载了源码目录
- **Git**: 使用 SSH（git@github.com:sha0601-ECC/contract-review.git）
