# AI 私厨 - 功能说明文档

> 最后更新：2026-05-06

---

## 一、项目概述

AI 私厨是一个基于 LangChain Agent 的智能食谱推荐系统。用户上传食材图片或描述食材清单，AI 自动识别食材、联网搜索食谱，并从营养价值和制作难度两个维度进行智能排序推荐。

---

## 二、核心功能

### 1. 智能食材识别
- 支持用户上传食材图片
- 使用通义千问 Qwen3.5-Plus 多模态模型识别图片中的食材
- 评估食材新鲜度与可用量，整理出"当前可用食材清单"

### 2. 联网搜索食谱
- 基于可用食材清单，自动调用 Tavily 搜索引擎查找可行菜谱
- 搜索不到的情况下 AI 才会自己发挥

### 3. 智能评估与排序
- 从**营养价值**和**制作难度**两个维度对候选食谱进行量化打分
- 根据得分排序，制作简单且营养丰富的排名靠前

### 4. 结构化推荐报告
- 输出包含以下信息的完整建议报告：
  - 食谱信息
  - 得分
  - 推荐理由
  - 食谱的参考图片

### 5. 多轮对话
- 支持流式对话（SSE，Server-Sent Events）
- 对话历史通过 SQLite 持久化存储
- 支持上下文记忆，可连续对话

### 6. 会话管理
- 新建会话
- 查看历史消息
- 清空会话

---

## 三、技术架构

### 后端
| 组件 | 技术选型 |
|------|---------|
| Web 框架 | FastAPI |
| AI Agent | LangChain Agent |
| 大语言模型 | 通义千问 Qwen3.5-Plus（多模态，支持图片/文本/音频/视频） |
| 网络搜索 | Tavily Search |
| 对话记忆 | SQLite（通过 SqliteSaver 持久化） |
| 图片存储 | 阿里云 OSS |

### 前端
- **框架**: Next.js（构建为 SPA，静态文件部署）
- **部署方式**: 构建后的静态文件放在 `app/static/` 目录，由 FastAPI 直接托管

### 开发配置
- **Python 版本**: 详见 `.python-version`
- **包管理**: uv（详见 `pyproject.toml`、`uv.lock`）
- **环境变量**: 通过 `.env` 文件加载（`python-dotenv`）

---

## 四、API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/chat/stream` | 流式对话（支持图片+文字） |
| GET | `/api/v1/chat/messages?thread_id=xxx` | 获取历史消息 |
| DELETE | `/api/v1/chat/messages?thread_id=xxx` | 清空会话 |
| GET | `/api/v1/oss/presign?filename=xxx` | 获取阿里云 OSS 图片上传签名 |

### 请求示例

**流式对话：**
```json
POST /api/v1/chat/stream
{
  "message": "帮我看看这些食材能做什么菜",
  "image_url": "https://xxx.oss-cn-beijing.aliyuncs.com/食材照片.jpg",
  "thread_id": "session_001"
}
```

---

## 五、项目结构

```
LangChain_project/
├── app/
│   ├── main.py                    # FastAPI 入口，路由挂载，静态文件托管
│   ├── agents/
│   │   └── personal_chief.py      # AI 私厨 Agent 核心逻辑
│   ├── api/v1/
│   │   ├── chat.py                # 对话 API（流式、历史、清空）
│   │   └── oss.py                 # 阿里云 OSS 上传签名 API
│   ├── common/
│   │   └── logger.py              # 日志配置
│   ├── models/
│   │   └── schemas.py             # Pydantic 数据模型
│   └── static/
│       └── index.html             # 前端页面（Next.js 构建产物）
├── db/
│   └── personal_chief.db          # SQLite 数据库（对话记忆）
├── pyproject.toml                 # Python 项目配置
├── uv.lock                        # 依赖锁定文件
└── .env                           # 环境变量（API Key 等）
```

---

## 六、启动方式

```bash
# 方式一：通过 Python 模块启动（推荐）
python -m app.main

# 方式二：通过 uvicorn 直接启动
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

服务启动后访问 `http://127.0.0.1:8001` 即可使用。

### 两种启动方式的区别

| 对比项 | `python -m app.main` | `uvicorn app.main:app` |
|--------|----------------------|------------------------|
| 启动入口 | 走 `app/main.py` 中的 `if __name__ == "__main__"` 代码块 | 直接由 uvicorn 加载 ASGI 应用 |
| 灵活性 | 启动参数硬编码在代码中（host/port/reload 固定） | 启动参数通过命令行灵活指定 |
| 适用场景 | 快速启动开发，无需记参数 | 生产部署或需要自定义参数时 |
| 本质 | 先执行 Python 脚本，脚本内部调用 uvicorn.run() | uvicorn 直接加载并运行 FastAPI 实例 |

**简单来说：** 日常开发用 `python -m app.main` 就够了；需要自定义端口、关闭热重载等场景时用 `uvicorn` 命令。

---

## 七、环境变量

需要在 `.env` 文件中配置以下变量：

| 变量名 | 说明 |
|--------|------|
| `DASHSCOPE_BASE_URL` | 通义千问 API 地址 |
| `DASHSCOPE_API_KEY` | 通义千问 API Key |
| `TAVILY_API_KEY` | Tavily 搜索 API Key |
| `OSS_ENDPOINT` | 阿里云 OSS 地域节点 |
| `OSS_BUCKET` | 阿里云 OSS Bucket 名称 |
| `ALIBABA_CLOUD_ACCESS_KEY_ID` | 阿里云 AccessKey ID |
| `ALIBABA_CLOUD_ACCESS_KEY_SECRET` | 阿里云 AccessKey Secret |
