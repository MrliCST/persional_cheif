# AI 私厨 (Personal Chef)

基于 LangChain 的 AI 私人厨师应用，支持食材识别、智能食谱推荐、食谱收藏等功能。

## 功能特性

### 🍳 核心功能
- **食材识别**：上传食材照片，AI 自动识别并评估食材新鲜度
- **智能食谱推荐**：基于可用食材，通过 web_search 检索并推荐适合的食谱
- **多维度评分**：从营养价值、制作难度等维度对食谱进行量化评分排序

### ❤️ 食谱收藏
- **食谱卡片收藏**：AI 推荐的食谱以卡片形式展示，点击小心心即可收藏
- **智能食谱名称提取**：支持多种格式的食谱名称识别：
  - `🥇 推荐No.1｜食谱名`（标准格式）
  - `推荐No.1｜食谱名`（缺少奖牌）
  - `🥇 No.1｜食谱名`（缺少"推荐"）
  - `🥇 推荐No.1｜食谱名（评分）`（带评分）
- **收藏对话框**：点击"收藏食谱"按钮弹出对话框，支持：
  - 快速收藏：点击自动检测到的食谱标签一键收藏
  - 手动输入：手动输入食谱名称并添加备注
- **收藏状态即时反馈**：收藏后小心心立即变红，无需等待刷新

### 🛒 购物清单
- 一键将食谱食材加入购物清单
- 购物清单管理（增删改查）

### 💬 对话管理
- 多轮对话，支持上下文记忆
- 历史消息查看
- 新对话创建

## 技术栈

- **后端**：Python + LangChain + FastAPI
- **前端**：原生 JavaScript + HTML + Tailwind CSS
- **AI 模型**：通义千问 Qwen3.5-Plus（多模态）
- **数据库**：SQLite
- **搜索工具**：Tavily Search

## 项目结构

```
app/
├── agents/
│   └── personal_chief.py    # AI 厨师 Agent（系统提示词、对话逻辑）
├── api/
│   └── v1/
│       ├── chat.py           # 对话 API（SSE 流式）
│       ├── favorites.py      # 收藏 API
│       └── shopping_list.py  # 购物清单 API
├── db/
│   ├── database.py           # 数据库连接
│   └── operations.py         # 数据库操作
├── models/
│   └── schemas.py            # 数据模型
├── static/
│   └── js/
│       ├── chat.js           # 对话管理（消息发送、渲染、收藏逻辑）
│       ├── favorites.js      # 收藏功能模块
│       ├── shopping_list.js  # 购物清单模块
│       └── init.js           # 页面初始化
└── main.py                   # 应用入口
```

## 快速开始

1. 安装依赖：
```bash
pip install -r requirements.txt
```

2. 配置环境变量（创建 `.env` 文件）：
```
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DASHSCOPE_API_KEY=your_api_key
TAVILY_API_KEY=your_tavily_api_key
```

3. 启动应用：
```bash
python app/main.py
```

4. 打开浏览器访问 `http://localhost:8000`

## 最近更新

### 2026-05-06
- ✨ 新增食谱收藏功能，支持 AI 回答中自动提取食谱名称
- ✨ 新增收藏对话框，支持快速收藏和手动输入
- ✨ 新增"收藏此回答"浮动按钮，每条 AI 消息末尾均可收藏
- 🎨 优化食谱名称提取逻辑，支持多种格式变体
- 🐛 修复收藏后小心心不变红的问题
- 📝 优化 AI 系统提示词，规范食谱输出格式
