# 合同审核系统 (Contract Review System)

合同条款风险分析与协作审核工具，支持 7 个 LLM provider 的流式分析。

## 功能特性

- 📄 **合同上传**: 支持 PDF、Word (.docx)、纯文本格式
- 🖼️ **图片分析**: 自动识别并分析合同中的图片/图表
- 🔍 **风险识别**: 基于合同类型模板智能识别风险条款
- ✏️ **在线编辑**: 分屏协作审核，左侧原文编辑，右侧建议同步
- 🔁 **循环审核**: 修改后可重新审核，持续改进
- 💾 **版本保存**: 支持下载最终文档（Word 格式）

## 技术栈

| Layer | 技术 |
|-------|------|
| 前端 | React + Tailwind + TipTap |
| 后端 | FastAPI + Python 3.12 |
| 模型 | LiteLLM (支持 7 个 provider) |
| 部署 | Docker Compose |

## 快速开始

### 1. 配置

```bash
cp .env.example .env
```

编辑 `.env` 文件，选择模型 provider：

```env
# 选择 provider: claude / openai / deepseek / qwen / kimi / minimax / ollama
MODEL_PROVIDER=claude

# Claude
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Ollama (本地)
# OLLAMA_MODEL=llama3.2-vision:latest
```

### 2. 启动

```bash
docker compose up --build
```

访问 `http://localhost:3000`

### 3. 使用流程

1. **上传合同** — 拖拽或点击上传 PDF/Word/文本文件
2. **选择类型** — 选择合同类型（劳动合同、采购合同等）
3. **选择模型** — 从顶部下拉切换不同 AI 模型
4. **开始分析** — 点击「开始分析」，等待流式建议生成
5. **阅读建议** — 右侧面板显示逐条建议，点击可定位到原文
6. **编辑修改** — 左侧编辑器中修改原文内容
7. **重新审核** — 点击「重新审核」更新建议
8. **下载文档** — 点击「下载」导出为 Word 文档

## 支持的模型

| Provider | 模型 | Vision | 说明 |
|----------|------|--------|------|
| claude | claude-sonnet-4-6 | ✅ | 默认，推荐 |
| openai | gpt-4o | ✅ | |
| deepseek | deepseek-chat | ❌ | 成本低 |
| qwen | qwen-plus | ✅ | 阿里云 |
| kimi | moonshot-v1-8k | ✅ | Moonshot |
| minimax | MiniMax-M2.7 | ✅ | |
| ollama | llama3.2-vision:latest | ✅ | 本地运行 |

切换 provider 后，当前合同会使用新模型重新分析。

## 目录结构

```
contract-review/
├── backend/
│   ├── main.py              # FastAPI 入口，所有路由
│   ├── config.py            # 配置管理（Settings）
│   ├── schemas.py           # Pydantic 数据模型
│   ├── services/
│   │   ├── parser.py        # PDF/Word 解析（文本+图片）
│   │   ├── model_service.py # LiteLLM 模型服务
│   │   └── exporter.py      # Word 导出
│   └── prompts/             # 合同类型提示词模板
│       ├── 劳动合同.yaml
│       ├── 采购合同.yaml
│       ├── 租赁合同.yaml
│       ├── 保密协议.yaml
│       └── generic.yaml
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # 主界面
│   │   ├── components/
│   │   │   ├── SplitEditor.tsx   # 分屏编辑器
│   │   │   ├── LeftPane.tsx      # TipTap 原文编辑
│   │   │   ├── RightPane.tsx     # 建议面板
│   │   │   └── ProviderSelect.tsx # 模型选择器
│   │   ├── extensions/
│   │   │   ├── ClauseMark.ts     # 自定义 TipTap Mark
│   │   │   └── index.ts          # re-export
│   │   ├── hooks/
│   │   │   └── useAnalysis.ts    # 分析工作流状态机
│   │   └── services/
│   │       └── api.ts            # API 调用封装
│   └── package.json
├── docker-compose.yml
├── .env.example
└── CLAUDE.md              # 开发者文档
```

## 自定义合同类型提示词

在 `backend/prompts/` 下添加 YAML 文件即可：

```yaml
contract_type: 租赁合同
description: 适用于房屋租赁、设备租赁等

risk_categories:
  - name: 押金风险
    keywords: [押金, 保证金]
    severity: HIGH

clause_completion_rules:
  - missing: 押金退还条款
    suggestion: 应明确押金退还条件和期限

modification_templates:
  - clause: 提前解约
    risk: 解约权不对等
    rewrite: 双方均有权在X个月前书面通知解约
```

## 提示词模板说明

| 字段 | 说明 |
|------|------|
| `contract_type` | 合同类型名称 |
| `risk_categories` | 风险类别列表，含关键词和等级 |
| `clause_completion_rules` | 缺失条款补全建议 |
| `modification_templates` | 条款修改建议模板 |

## 隐私说明

- **本地模式 (Ollama)**：所有数据仅在本地处理，不上传到任何服务器
- **在线模式**：合同文本和图片会上传到对应 AI 服务商，请确保 API 可信

## License

MIT
