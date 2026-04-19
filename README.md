<div align="center">

# 🌊 GWC — GalGame Web Chat-Ver3.50

**在浏览器中绽放的视觉小说 × AI 对话引擎**

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com)
[![License](https://img.shields.io/badge/license-Free-green.svg)](https://github.com)
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Desktop-orange.svg)](https://github.com)
[![中文](https://img.shields.io/badge/README-中文-red.svg)](README.md)

*Live2D · GPT-SoVITS 语音 · 剧情存档 · 模组生态*

</div>

---

## 📖 目录

- [项目简介](#-项目简介)
- [核心亮点](#-核心亮点)
- [功能全景](#-功能全景)
- [快速开始](#-快速开始)
- [使用教程](#-使用教程)
- [模组与扩展](#-模组与扩展)
- [插件开发指南](#-插件开发指南)
- [技术架构](#-技术架构)
- [常见问题](#-常见问题)
- [未来前景](#-未来前景)
- [致谢/声明/以及赞助](#-致谢与声明)

---

## 🌟 项目简介

**GWC (GalGame Web Chat)** 是一款浏览器原生的视觉小说风格 AI 聊天应用。它将 Galgame 的沉浸式体验与 AI 大语言模型的对话能力完美融合——无需任何后端服务，只需一个 OpenAI 兼容的 API 端点，即可在浏览器中运行完整的视觉小说交互体验。

想象一下：你打开浏览器，Live2D 角色在你面前生动呼吸，BGM 缓缓流淌，AI 以角色的口吻与你对话，GPT-SoVITS 合成的语音实时播放，而你做出的每一个选择都被存档系统忠实记录……这一切，仅仅需要一个浏览器。

>作者主页：[Bilibili](https://space.bilibili.com/1764510273)
项目交流群：1083739889
<img width="2466" height="1475" alt="image" src="https://github.com/user-attachments/assets/355d3d36-6391-4cde-8ddb-8e212a618886" />

---

## ✨ 核心亮点

### 🎮 完整的视觉小说体验

不是简单的聊天界面套皮。GWC 从零构建了标题画面、对话框、存档系统、BGM 播放器、快捷栏等一整套 Galgame UI 体系。双击空白处即可进入沉浸模式，享受无干扰的剧情体验。
<img width="2453" height="1472" alt="image" src="https://github.com/user-attachments/assets/43d6a6b8-d1a9-4158-afe4-7f7afac3f4b8" />

### 🤖 AI 驱动的自由剧情

传统 Galgame 的分支是预设的，GWC 的剧情由 AI 实时生成。每一次对话都是独一无二的叙事，AI 会根据你的选择和角色设定动态推进剧情，真正实现了"你的故事，你来书写"。
<img width="2464" height="1466" alt="image" src="https://github.com/user-attachments/assets/2bf9171e-27ce-4a52-91da-dfcdf11c3f47" />

### 🗣️ GPT-SoVITS 实时语音合成

集成 GPT-SoVITS TTS 引擎，支持中/日/英/韩四种语言。独创的**并发流式预加载**技术——将 AI 输出按标点符号分句，并行预取音频，实现接近零延迟的语音播放。快模式下激进切分，让语音几乎与文字同步。
<img width="2476" height="1355" alt="image" src="https://github.com/user-attachments/assets/2e46d20a-ce7c-41bc-b42e-73e2f9578db6" />

### 🎭 Live2D + 面部追踪

在浏览器中实时渲染 Live2D Cubism 模型，支持表情切换、点击交互、位置/缩放调节。更可接入 MediaPipe 实现摄像头面部追踪，让你的表情驱动角色的头部和眼球运动。

### 🪞 镜像多开系统DLC（未正式发布）

通过镜像系统 DLC，你可以同时运行多个完全隔离的"平行世界"——不同的角色、不同的剧情、不同的存档，互不干扰。每个镜像拥有独立的数据空间、媒体资源和会话历史。
<img width="849" height="980" alt="image" src="https://github.com/user-attachments/assets/ceb7032c-e6dd-442f-9b22-483ef62d3ae7" />

### 💾 完整的存档系统

100 个手动存档位 + 快速存档 + 自动存档（1-60 分钟可配），支持命名和重命名。配合 ZIP 全量备份/恢复功能，你的每一段故事都能被安全保存和迁移。
<img width="2465" height="1480" alt="image" src="https://github.com/user-attachments/assets/93a5bb7f-a861-4071-96b3-f634ebddae48" />

### 🔌 强大的模组生态

`window.$GWC` API (v4.1.0) 提供丰富的插件接口——添加标题按钮、注入对话、劫持网络请求、管理独立 UI 面板。从主题皮肤到联网搜索，从视频背景到桌面宠物，模组让 GWC 的可能性无限延伸。
<img width="2472" height="1476" alt="image" src="https://github.com/user-attachments/assets/fb886b89-a284-45b7-936c-7ecd7d366e03" />
### 📱 移动端适配

专门的移动端 UI 模式，虚拟键盘自适应，触控友好的操作体验。在手机平板上同样享受沉浸式对话。（需自行编译）
<img width="679" height="1349" alt="image" src="https://github.com/user-attachments/assets/55eb48b2-4925-415c-9454-f19f50cf4967" />

### 🌐 几乎没有后端 / 快速部署

整个应用运行在浏览器中，唯一的"服务器"是你自己配置的 LLM API 端点。无论使用 OpenAI、Claude、Gemini 还是本地运行的 Ollama，只需填入 API 地址即可开始。
<img width="2282" height="994" alt="image" src="https://github.com/user-attachments/assets/ad7e89b2-06b1-4c4e-aac3-b7675368fc46" />

---

## 🎯 功能全景

| 类别 | 功能 |
|------|------|
| **AI 对话** | OpenAI 兼容 API、流式/非流式响应、CORS 代理、模型自动发现、多 API 配置管理、Temperature 调节 |
| **角色系统** | 角色卡创建/导入/导出、世界观预设、系统提示词拼接、自定义玩家名/AI名 |
| **Live2D** | Cubism 模型渲染、多模型切换、表情切换、点击交互、分辨率控制 |
| **语音合成** | GPT-SoVITS 集成、并发流式预加载、快模式、参考音频配置、移动端适配 |
| **同声传译** | 双语输出模式、语音/文字独立语言选择 |
| **BGM 系统** | 多音频上传、顺序/随机/循环播放、音量控制、可拖拽播放器 |
| **存档系统** | 100 手动存档、快速存档、自动存档、存档命名 |
| **记忆系统** | 长期记忆压缩、定期间步摘要、注入系统提示词 |
| **剧情选项** | AI 生成故事分支、独立 API 配置 |
| **主动聊天** | AI 主动发起对话、可配间隔时间、增强陪伴感 |
| **备忘录** | 手动备忘、AI 自动日程 `<ADD_MEMO>` 标签 |
| **面部追踪** | MediaPipe 实时追踪、画中画预览、驱动 Live2D |
| **数据管理** | ZIP 全量备份/恢复、单镜像备份、智能导入检测、降级兼容 |
| **视觉调节** | 实时预览浮动面板、模型/对话/立绘/标题微调 |
| **快捷栏** | 16 个可配置快捷按钮、独立显隐控制 |
| **工作模式** | 专业/编程模式、加速打字机、详细响应 |
| **移动端** | UI 模式切换、缩放滑块、虚拟键盘适配、返回手势拦截 |

---

## 🚀 快速开始

### 环境要求

- **Node.js** 18+ （[下载地址](https://nodejs.org/)）
- **现代浏览器**（推荐 Chrome / Edge）
- **LLM API 端点**（OpenAI、Claude、Gemini、Ollama 等任意兼容端点）

### 安装与启动

#### 方式一：一键启动（Windows）

双击 `启动.bat`，脚本会自动：
1. 检测 Node.js 是否已安装
2. 首次运行自动安装依赖 (`npm install --legacy-peer-deps`)
3. 启动 Vite 开发服务器

浏览器访问 `http://localhost:5173` 即可。

#### 方式二：手动启动

```bash
# 安装依赖
npm install --legacy-peer-deps

# 启动开发服务器
npm run dev
```

#### 生产构建

```bash
# 构建
npm run build

# 预览构建结果
npm run preview
```

---

## 📚 使用教程

### 第一步：配置 AI API

1. 启动 GWC 后，点击标题界面的 **设置** 按钮
2. 进入 **API** 选项卡
3. 填入你的 API 配置：
   - **API 地址**：如 `https://api.openai.com/v1/chat/completions`
   - **API Key**：你的密钥
   - **模型**：可直接输入或点击"获取模型列表"自动发现
4. 点击 **保存配置**

> 💡 **提示**：GWC 支持任何 OpenAI 兼容的 API，包括本地运行的 Ollama (`http://localhost:11434/v1/chat/completions`)、Claude、Gemini 等。如果遇到跨域问题，参考视频
[BiliBili](https://www.bilibili.com/video/BV1E6DiBbEfm/?spm_id_from=333.1387.upload.video_card.click)视频版本可能比较旧，但不影响使用。

### 第二步：创建角色

1. 在设置中进入 **角色** 选项卡
2. 设置 **玩家名称** 和 **AI 名称**
3. 编写 **系统提示词**（System Prompt）——这决定了 AI 的性格和行为方式
4. 可选：加载 **世界观** 预设，为角色设定更丰富的背景
5. 保存角色卡

### 第三步：开始对话

1. 回到标题界面，点击 **START**
2. 在底部的输入框中输入你的消息
3. AI 会以角色身份回复，文字以打字机效果逐字显示
4. 享受沉浸式的视觉小说对话体验！

### 进阶功能

#### 🎵 BGM 背景音乐

1. 设置 → **BGM** 选项卡
2. 上传音频文件（存储在 IndexedDB 中，无需外部服务）
3. 选择播放模式：顺序 / 随机 / 循环
4. 调节音量

#### 🎭 Live2D 模型

1. 设置 → **视觉** 选项卡
2. 上传 Live2D Cubism 模型文件
3. 调节模型的位置 (X/Y) 和缩放（可点击预览调整，方便查看）
4. 可分别为聊天界面和标题界面设置不同的位置
5. 点击模型可触发表情切换（可关闭，设置-文本互动）

#### 💾 存档管理

- **手动存档**：点击快捷栏的"存档"按钮，选择存档位
- **快速存档**：一键快速存档/读档
- **自动存档**：在设置中配置自动存档间隔（1-60 分钟）

#### 🗣️ 语音合成 (TTS)

1. 确保已运行 GPT-SoVITS 服务并开放API
2. 设置 → **TTS** 选项卡
3. 配置 TTS URL 模板（支持占位符）
4. 设置参考音频用于声音克隆
5. 调节语速、音量
6. 开启 TTS 自动播放

#### 🎨 视觉调节

1. 在聊天界面开启 **视觉调节模式**
2. 浮动面板中实时预览和调节：
   - Live2D 模型位置/缩放/渲染精度
   - 对话框布局
   - 立绘位置（需安装立绘 DLC）
   - 标题背景偏移

#### 🔧 工作模式

当需要 AI 协助编程或专业问题时，开启 **工作模式**：
- AI 切换为专业模式，忽略娱乐人格约束
- 打字机速度加快
- 响应更长更详细

#### 💾 数据备份与恢复

1. 设置 → **数据** 选项卡
2. **全量备份**：导出包含所有数据（设置、存档、BGM、模型、背景、视频、立绘、镜像）的 ZIP 文件
3. **恢复**：导入 ZIP 文件，系统自动检测备份类型并智能恢复
4. 支持降级兼容——即使没有安装镜像插件，单镜像备份也能导入为主系统数据

---

## 🧩 模组与扩展

GWC 拥有丰富的模组生态，通过 `window.$GWC` API 实现插件式扩展。模组分为 **标准模组** 和 **大型 DLC** 两类。

> ⚠️ **标识说明**：带有 `[📦 选装]` 标记的模组表示 **发行源码中不包含此部分**，需要单独获取并手动安装。（大部分暂未正式发布）

### 标准模组

#### 🔍 联网搜索 — `[📦 选装]`

| 项目 | 内容 |
|------|------|
| **文件** | `联网搜索.js` |
| **兼容** | GWC v1.7.0+ / v2.1.0+ |
| **状态** | 需要 AI 支持 |

零成本、纯前端的联网搜索增强。通过浏览器本地网络与跨域代理，免费调用 **DuckDuckGo** 和 **Wikipedia** 获取实时资料。劫持底层 Fetch API，在请求发往 LLM 前自动拼合搜索结果到上下文中，让 AI 拥有实时信息获取能力。

**核心特性**：
- 完全免费，无需 API Key
- 支持 DuckDuckGo 网页搜索 + Wikipedia 条目
- 自动注入搜索结果到 LLM 上下文
- 高频轮询解决 React 异步闭包导致的开关失灵 Bug

---

#### 👁️ 视觉感知增强 (V4) — `[📦 选装]`

| 项目 | 内容 |
|------|------|
| **文件** | `视觉感知增强.js` |
| **依赖** | 支持 Vision 的多模态模型 |
| **状态** | 需要 AI 支持 |

当"主动聊天"触发时，自动对当前页面进行截图，使用 `html-to-image` 库将页面渲染为 JPEG，并将其作为多模态图像注入 AI 请求中。AI 能够"看到"你的屏幕内容，实现视觉感知级别的交互。

**核心特性**：
- 自动屏幕截图注入 AI 请求
- 智能过滤隐私敏感元素（摄像头预览、跨域 iframe）
- 设置面板中的 ON/OFF 开关
- 支持任意 Vision 多模态模型

---

#### 🎬 动态视频背景 — `[📦 选装]`

| 项目 | 内容 |
|------|------|
| **文件** | `动态视频背景插件.js` |
| **数据库** | `GWC_VideoBG_Plugin_DB` |

用动态视频替换静态背景图片，让场景更具沉浸感。视频文件存储在独立的 IndexedDB 中，支持上传、选择和即时切换。

**核心特性**：
- 视频文件本地存储，无需外部服务
- 独立数据库隔离，不干扰核心数据
- 支持常见视频格式
- 一键切换视频/静态背景

---

#### 🔄 自动更新 — `[📦 选装]`

| 项目 | 内容 |
|------|------|
| **文件** | `自动更新.js` |

自动版本检测与更新机制，确保你始终使用最新版本的 GWC。

---

#### 🎨 [ATRI] 设置面板主题 — `[📦 选装]`

| 项目 | 内容 |
|------|------|
| **文件** | `[ATRI]设置面板主题.js` |

基于《ATRI -My Dear Moments-》角色风格的主题皮肤，为设置面板注入 ATRI 风格的视觉设计。

---

### 大型 DLC

#### 🎭 立绘模式扩展包 — `[📦 选装]`

| 项目 | 内容 |
|------|------|
| **文件** | `立绘模式拓展包.js` |
| **版本** | V2.6 镜像隔离版 |
| **兼容** | GWC v2.1.0+ / IMAGE v4.4+ |
| **数据库** | `GWC_Sprite_DLC_DB` |

替代 Live2D 模型，使用 2D 静态立绘/GIF 动图作为角色形象。自动劫持原生 Live2D 渲染器，完美复用原版的位置/缩放滑块。引入"网络层窃听器"，在 JSON 解析阶段截获流式标签并瞬间切换表情，实现无缝立绘切换。

**核心特性**：
- 批量导入静态/GIF 立绘
- 按角色/表情分组管理
- 自动劫持 Live2D 渲染管线
- 流式标签驱动的表情实时切换
- V2.6 完美适配镜像多开系统，立绘图包绝对物理隔离

---

#### 📖 剧情IDE拓展包 — `[📦 选装]`

| 项目 | 内容 |
|------|------|
| **文件** | `GWC-剧情IDE拓展包.js` |
| **代码量** | 1433 行 |

完整的视觉小说脚本集成开发环境，提供场景管理、剧情分支、叙事流控制等专业级的剧情创作工具。让你从"与 AI 自由对话"升级为"精确编排剧情走向"。

**核心特性**：
- 可视化剧本编辑器
- 场景管理与切换
- 剧情分支与叙事流控制
- 专业的 VN 脚本编写体验

---

#### 🧠 Skills / RAG 拓展包 — `[📦 选装]`（已废弃，计划迁移到正在开发的后端）

| 项目 | 内容 |
|------|------|
| **文件** | `skills拓展包.js` |
| **代码量** | 442 行 |

**客户端 RAG（检索增强生成）引擎**——在浏览器中实现轻量级文档检索与注入。

**核心特性**：
- **文档分类**：Core（始终注入）+ Reference（按需检索）
- **Bigram 关键词提取 + TF 评分**：智能相关性排序
- **ZIP 批量导入**：自动分类（.md → Core，.txt → Reference）
- **多技能组管理**：每个角色可拥有多组技能预设
- **Fetch 拦截注入**：将检索到的文档自动注入系统提示词
- **抗爆炸保护**：参考注入上限 1500 字符，防止上下文溢出

---

#### 🪞 镜像系统拓展包 — `[📦 选装]`

| 项目 | 内容 |
|------|------|
| **文件** | `镜像系统拓展包.js` |
| **代码量** | 334 行 |
| **数据库** | `GWC_Image_Mirrors_DB`（mirrors + config 两个 Store） |

多实例/平行宇宙系统。创建、切换和管理"镜像"实例，每个镜像拥有完全隔离的数据——独立的会话、背景、模型、BGM。在标题界面选择镜像即可进入不同的世界线。

**核心特性**：
- 无限镜像实例创建
- 完全数据隔离（会话、媒体、设置）
- 标题界面镜像选择器
- 配合立绘/视频等 DLC 实现全面隔离

---

### 模组安装方法

在 GWC 设置 → **插件模组** 选项卡中导入模组

---

## 🛠️ 插件开发指南

GWC 通过 `window.$GWC` 全局对象（版本 4.1.0）向插件暴露 API。

### 可用 API

```javascript
const GWC = window.$GWC;

// Toast 通知
GWC.showToast("消息内容", "success", 3000);

// 读写设置
const settings = GWC.getSettings();
GWC.setSettings({ myPluginEnabled: true });

// 在标题界面添加按钮
GWC.addTitleButton("my-btn", "我的功能", "🚀", () => {
    GWC.showToast("按钮被点击了！", "info");
});

// 显示/隐藏全屏插件 UI
GWC.showPluginUI({
    title: "我的插件",
    content: "<div>...</div>"
});
GWC.hidePluginUI();

// 发送消息（模拟用户发送）
GWC.sendMessage("你好！");

// 显示对话框（视觉小说风格）
GWC.sendDialog({
    speaker: "ATRI",
    text: "夏生先生，早上好！",
    sprite: "happy",
    background: "school"
});
```

### 自定义事件

```javascript
// 监听提醒触发
window.addEventListener('trigger-reminder', (e) => { ... });

// 监听主动聊天触发
window.addEventListener('trigger-proactive-chat', (e) => { ... });

// 监听插件消息发送
window.addEventListener('plugin-send-msg', (e) => { ... });

// 监听插件强制停止
window.addEventListener('gwc-force-stop-plugin', (e) => { ... });
```

### 插件模板

```javascript
(function() {
    if (window.__MyPluginLoaded) return;
    window.__MyPluginLoaded = true;

    const GWC = window.$GWC;
    if (!GWC) throw new Error("GWC API 未就绪");

    console.log("[My Plugin] 初始化...");

    // 注册设置项
    if (GWC.getSettings().myPluginEnabled === undefined) {
        GWC.updateSettings({ myPluginEnabled: false });
    }

    // 添加标题按钮
    GWC.addTitleButton("my-plugin", "我的插件", "🌟", () => {
        GWC.showToast("插件已激活！", "success");
    });

    console.log("[My Plugin] 初始化完成！");
})();
```

---

## 🏗️ 技术架构

### 技术栈

| 层次 | 技术 |
|------|------|
| **前端框架** | React 18 |
| **构建工具** | Vite 5 |
| **CSS 方案** | Tailwind CSS 4 |
| **图标库** | Lucide React |
| **Live2D** | Cubism Core SDK |
| **TTS** | GPT-SoVITS (外部 HTTP API) |
| **面部追踪** | MediaPipe (动态加载) |
| **数据存储** | IndexedDB (主) + localStorage (兼容) |
| **备份** | JSZip 3.10 (CDN 动态加载) |
| **AI 接口** | OpenAI 兼容 API |

### 数据架构

IndexedDB (版本 10) 包含 7 个核心 Object Store：

| Store | 用途 | Key |
|-------|------|-----|
| `core_data` | 设置、会话、存档、备忘录 | String key |
| `model_files` | Live2D 模型文件 | String key |
| `app_settings` | 背景图、UI 图片 | String key |
| `bgm_files` | 背景音乐文件 | id (keyPath) |
| `bg_images` | 自定义背景图片 | id (keyPath) |
| `live2d_models` | Live2D 模型打包数据 | id (keyPath) |
| `app_mods` | 插件/模组存储 | id (keyPath) |

插件额外数据库：
- `GWC_Image_Mirrors_DB` — 镜像实例管理
- `GWC_VideoBG_Plugin_DB` — 视频背景存储
- `GWC_Sprite_DLC_DB` — 立绘图包存储

### 系统提示词拼接顺序

```
最终 System Prompt =
    自定义系统提示词 (customSystemPrompt)
  + 世界观文本 (worldviewText)
  + 实时状态注入 (当前时间、备忘录等)
  + 备忘录日程 (memoSchedule)
  + 记忆摘要 (memorySummary)
  + [Skills DLC] 检索注入的文档
```

---

## ❓ 常见问题

### Q: 遇到问题怎么办？

**遇事不决，刷新解决。** 绝大多数问题可以通过刷新浏览器页面解决。GWC 的数据存储在 IndexedDB 中，刷新不会丢失任何数据。

### Q: 支持哪些 AI 模型？

G WC 支持任何 OpenAI 兼容的 API 端点，包括但不限于：
- OpenAI GPT 系列
- Anthropic Claude（通过兼容代理）
- Google Gemini（通过兼容代理）
- 本地 Ollama
- 其他任何兼容 `/v1/chat/completions` 接口的服务

### Q: 如何解决跨域问题？

选择 CORS 代理：
- `corsproxy.io` — 默认推荐
- `codetabs` — 备选
- `fringezone` — 备选
- 自定义 — 输入你的代理地址

### Q: TTS 语音合成如何工作？

GWC 的 TTS 需要运行 GPT-SoVITS 服务。你可以：
1. 本地部署 GPT-SoVITS（推荐，延迟最低）
2. 使用远程 GPT-SoVITS 服务

### Q: 数据存储在哪里？

所有数据存储在浏览器的 IndexedDB 中，包括设置、对话记录、存档、BGM、模型文件等。使用 ZIP 备份功能可以导出所有数据。

### Q: 模组安装后会修改源码吗？

不会。GWC 的模组系统通过 API 钩子和运行时注入工作，不修改任何源码文件。移除模组文件即可恢复原始状态。

### Q: 手机可以使用吗？

可以。GWC 有专门的移动端 UI 模式，在设置中开启即可。支持触控操作和虚拟键盘自适应，平板适配更好，apk需编译，ios暂未适配。

---

## 🔮 未来前景

GWC 不仅仅是一个聊天应用，它是一个**面向开发者的全能型视觉小说引擎**。

### 🚀 长期目标

- **GWC Python后端编写**：提示可玩性与更多功能
- **AI Agent接入**：让GWC拥有成为生产力的可能
- **更好的插件生态**：编写给AI阅读的开发文档，根据你的想法全自动构建插件
- **更方便的Gal创作方式**：AI赋能，提供完整生态的剧情编辑IDE让所有人都能够轻易开放自己的GAL

---

## 🤝 致谢与声明

- **Live2D Cubism** — Live2D 模型渲染引擎
- **GPT-SoVITS** — 语音合成引擎
- **MediaPipe** — 面部追踪技术
- **React** / **Vite** / **Tailwind CSS** — 前端技术栈
- **ATRI -My Dear Moments-** — 角色灵感来源

### 免责声明/赞助

- 本项目为免费开源项目，仅供学习和研究使用
- Live2D Cubism Core SDK 的使用需遵守 Live2D 官方许可协议
- AI 生成的所有内容由相应 AI 模型负责，本项目不承担任何责任
- 赞助作者（没有任何好处，但是可能让项目开发变快？）见文章末尾

---

<div align="center">

**🌊 GWC — 让每一个故事都值得被铭记**

[![Bilibili](https://img.shields.io/badge/Bilibili-作者主页-pink.svg)](https://space.bilibili.com/1764510273)

*本项目完全免费，谨防上当受骗*

</div>
<img width="1220" height="1646" alt="mm_facetoface_collect_qrcode_1776576495207" src="https://github.com/user-attachments/assets/9254a94f-1406-4b93-85d2-3880d7f5e947" />
<img width="1170" height="1755" alt="1776581876587" src="https://github.com/user-attachments/assets/82b992bd-4014-429f-bbb9-e672e6a23c17" />
