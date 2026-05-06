# AI 私厨管家 — 基于 LangChain 与多模态模型的实现计划

## 一、项目概述

**AI 私厨管家** 是一款基于 LangChain 框架与多模态大模型的智能烹饪助手应用。用户可以通过文字描述、图片上传或语音输入的方式，获取个性化的菜谱推荐、烹饪步骤指导、食材识别与营养分析等服务。项目旨在利用大语言模型的推理能力与多模态感知能力，打造一个"懂食材、会做菜、能定制"的 AI 私厨管家。

---

## 二、技术栈选型

| 层级 | 技术/工具 | 说明 |
|------|-----------|------|
| 编程语言 | Python ≥3.14 | 项目基础语言 |
| LLM 框架 | LangChain ≥1.2.17 | 模型调用、链式编排、Agent 构建 |
| 文本模型 | DeepSeek Chat / OpenAI GPT | 核心对话与推理引擎 |
| 多模态模型 | GPT-4V / Claude Vision / DeepSeek-VL | 图像识别（食材识别、菜品识别） |
| 语音模型 | OpenAI Whisper（语音转文字） / TTS（文字转语音） | 语音交互 |
| 工具调用 | LangChain Tools / Function Calling | 外部工具集成（天气查询、食材采购等） |
| 向量存储 | Chroma / FAISS | 菜谱知识库检索 |
| 嵌入模型 | OpenAI Embeddings / text2vec | 语义向量化 |
| 环境管理 | uv | 包管理与虚拟环境 |
| API 管理 | python-dotenv | 环境变量与密钥管理 |

---

## 三、核心功能模块

### 1. 智能对话模块
- 基于 LangChain ChatModel 构建对话引擎
- 支持多轮对话上下文记忆（ConversationBufferMemory / ConversationSummaryMemory）
- 系统角色设定为"专业私厨管家"，具备烹饪知识库

### 2. 多模态感知模块
- **图像识别**：上传食材/菜品图片，识别食材种类、新鲜度、菜品名称
- **语音交互**：语音输入需求 → Whisper 转文字 → LLM 处理 → TTS 语音回复
- **菜谱图片生成**：根据菜谱描述生成菜品效果图（DALL-E / Stable Diffusion）

### 3. 菜谱推荐与定制模块
- 基于用户偏好（口味、忌口、营养需求）推荐菜谱
- 支持 RAG（检索增强生成）：从本地菜谱知识库中检索相关内容
- 个性化定制：根据冰箱现有食材推荐"清冰箱"菜谱

### 4. 烹饪指导模块
- 分步骤烹饪指导，支持步骤追问
- 定时器提醒功能
- 单位换算、替代食材建议

### 5. 营养与健康管理模块
- 菜品营养分析（热量、蛋白质、脂肪、碳水等）
- 每日/每周饮食记录与建议
- 特殊饮食需求支持（减脂、增肌、糖尿病、素食等）

### 6. 工具集成模块（LangChain Tools）
- 天气查询工具（影响食材推荐）
- 食材价格查询工具
- 购物清单生成工具
- 日历提醒工具（规划一周菜单）

---

## 四、系统架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    用户交互层                             │
│  [Web UI / 小程序 / 命令行]  ←→  [语音 / 图片 / 文字]    │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                    API 网关层                             │
│           FastAPI / Gradio 接口服务                       │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                   LangChain 编排层                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │ ChatModel│  │  Agent   │  │   Chain (LCEL)       │   │
│  │ 对话管理  │  │ 工具调用  │  │  链式编排与路由      │   │
│  └──────────┘  └──────────┘  └──────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                   模型服务层                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ DeepSeek │  │  GPT-4V  │  │ Whisper  │  │ TTS    │ │
│  │ 文本推理  │  │ 图像理解  │  │ 语音转文字│  │ 语音合成│ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                   数据与知识层                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │ Chroma   │  │  SQLite  │  │   菜谱知识库           │   │
│  │ 向量数据库│  │ 关系数据库│  │   (Markdown / JSON)   │   │
│  └──────────┘  └──────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 五、开发阶段规划

### 第一阶段：基础搭建（第 1-2 周）
- [ ] 项目初始化与环境配置（uv + pyproject.toml）
- [ ] LangChain ChatModel 集成（DeepSeek + OpenAI）
- [ ] 基础对话链构建（Prompt Template + LLM Chain）
- [ ] 多轮对话记忆功能实现
- [ ] 配置文件与密钥管理（.env）

### 第二阶段：核心功能开发（第 3-5 周）
- [ ] 菜谱知识库构建与向量化（Chroma + Embeddings）
- [ ] RAG 检索增强生成实现（菜谱问答）
- [ ] 多模态图像识别集成（食材/菜品识别）
- [ ] 语音交互集成（Whisper STT + TTS）
- [ ] LangChain Agent 与 Tool 开发
  - [ ] 天气查询工具
  - [ ] 食材替代建议工具
  - [ ] 购物清单生成工具

### 第三阶段：智能增强（第 6-7 周）
- [ ] 个性化推荐算法（基于用户偏好向量）
- [ ] 营养分析功能（调用计算 API 或 LLM 推理）
- [ ] 烹饪步骤动态生成与引导
- [ ] 多工具协同 Agent（AutoGPT 风格任务分解）

### 第四阶段：应用封装（第 8-9 周）
- [ ] Web 界面开发（Gradio / Streamlit）
- [ ] RESTful API 封装（FastAPI）
- [ ] 用户会话管理
- [ ] 部署与测试

---

## 六、项目目录结构规划

```
LangChain_project/
├── Plan.md                    # 项目计划文档
├── pyproject.toml             # 项目依赖配置
├── .env                       # 环境变量（API Key 等）
├── .gitignore
├── README.md
│
├── src/
│   ├── __init__.py
│   ├── config.py              # 全局配置
│   ├── models/
│   │   ├── __init__.py
│   │   ├── chat_model.py      # 对话模型封装
│   │   ├── vision_model.py    # 视觉模型封装
│   │   └── voice_model.py     # 语音模型封装
│   │
│   ├── chains/
│   │   ├── __init__.py
│   │   ├── chat_chain.py      # 对话链
│   │   ├── recipe_chain.py    # 菜谱推荐链
│   │   └── nutrition_chain.py # 营养分析链
│   │
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── chef_agent.py      # 私厨管家 Agent
│   │   └── tools/
│   │       ├── __init__.py
│   │       ├── weather.py     # 天气查询工具
│   │       ├── shopping.py    # 购物清单工具
│   │       └── substitute.py  # 食材替代工具
│   │
│   ├── memory/
│   │   ├── __init__.py
│   │   └── conversation.py    # 对话记忆管理
│   │
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── vector_store.py    # 向量数据库管理
│   │   └── retriever.py       # 检索器
│   │
│   ├── knowledge/
│   │   ├── __init__.py
│   │   └── recipes/           # 菜谱知识库（Markdown/JSON）
│   │
│   └── app/
│       ├── __init__.py
│       ├── web.py             # Web 界面
│       └── api.py             # API 服务
│
├── notebook/
│   ├── one/                   # 第一阶段探索 Notebook
│   └── two/                   # 第二阶段探索 Notebook
│
└── tests/
    ├── __init__.py
    ├── test_chat.py
    ├── test_recipe.py
    └── test_agent.py
```

---

## 七、关键技术实现要点

### 7.1 LangChain LCEL 链式编排
```python
# 示例：菜谱推荐链
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

prompt = ChatPromptTemplate.from_template(
    "你是一位专业的私厨管家。根据以下食材：{ingredients}，"
    "以及用户偏好：{preferences}，推荐一道合适的菜品并给出详细步骤。"
)
model = ChatOpenAI(model="deepseek-chat", temperature=0.7)
chain = prompt | model | StrOutputParser()
```

### 7.2 多模态图像识别
```python
# 示例：食材图片识别
import base64
from openai import OpenAI

client = OpenAI()
response = client.chat.completions.create(
    model="gpt-4-vision-preview",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "请识别图中的食材并给出可能的菜品建议"},
                {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,{base64_image}"}}
            ]
        }
    ]
)
```

### 7.3 RAG 菜谱检索
```python
# 示例：从向量数据库检索相关菜谱
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

vector_store = Chroma(
    collection_name="recipes",
    embedding_function=OpenAIEmbeddings(),
    persist_directory="./chroma_db"
)
retriever = vector_store.as_retriever(search_kwargs={"k": 3})
```

### 7.4 Agent 工具调用
```python
# 示例：私厨管家 Agent
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain.tools import tool

@tool
def get_weather(city: str) -> str:
    """查询指定城市的天气"""
    # 调用天气 API
    return f"{city}今日天气：晴，25°C"

tools = [get_weather, generate_shopping_list, suggest_substitute]
agent = create_tool_calling_agent(model, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
```

---

## 八、风险与应对策略

| 风险 | 影响 | 应对策略 |
|------|------|---------|
| API 调用成本高 | 多模态模型费用较高 | 使用缓存机制、本地小模型替代部分任务 |
| 多模态识别准确率 | 食材/菜品识别可能出错 | 结合用户确认机制，提供多选纠错 |
| 语音交互延迟 | 影响用户体验 | 异步处理、流式输出 |
| 知识库覆盖不足 | 菜谱推荐质量下降 | 持续扩充知识库，接入外部菜谱 API |
| 用户隐私安全 | 图片/语音数据敏感 | 本地处理优先，数据脱敏，明确隐私政策 |

---

## 九、扩展方向（远期规划）

- **IoT 集成**：连接智能冰箱、智能厨具，实现食材库存自动管理
- **视频指导**：生成烹饪教学视频（结合视频生成模型）
- **社区分享**：用户上传自创菜谱，形成社区生态
- **多语言支持**：支持中英文等多语言交互
- **移动端 App**：基于 Flutter / React Native 开发移动应用

---

> **文档版本**：v1.0  
> **创建日期**：2026-05-05  
> **项目状态**：规划阶段
