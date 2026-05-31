---
title: Coding Agent Loop 机制分类全览
date: 2026-05-20
summary: 把 awesome-cli-coding-agents 里的编码 Agent 按 loop 机制分成 8 类，用伪代码讲清每种的驱动方式、终止条件与核心差异。
tags: AI, Agent, 工程笔记
---



> 基于 awesome-cli-coding-agents 完整列表，以 learn-claude-code 伪代码风格呈现 聚焦：loop 的**驱动方式、终止条件、核心机制差异**

---

## 分类地图

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Type 1 · Tool-Use Loop         最主流范式                               │
│  Claude Code / OpenCode / Kode / Goose / Gemini CLI / Codex / Qwen...   │
├─────────────────────────────────────────────────────────────────────────┤
│  Type 2 · CodeAct Loop          代码即 action，不用 tool_use JSON        │
│  OpenHands / CodeActAgent                                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Type 3 · Edit-Patch Loop       LLM 输出 diff 文本，框架解析 apply       │
│  Aider                                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Type 4 · ACI Loop              为 LLM 定制的 shell 接口                 │
│  SWE-agent / AutoCodeRover                                               │
├─────────────────────────────────────────────────────────────────────────┤
│  Type 5 · Proactive Heartbeat   主动唤醒，不是被动响应                   │
│  OpenClaw / NanoClaw / ZeroClaw / claw0                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Type 6 · Plan-First Loop       先生成计划，再逐步执行                   │
│  Plandex / Devon                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Type 7 · Graph Pipeline        多阶段有向图，职责严格分离               │
│  RA.Aid (LangGraph Research→Plan→Implement)                              │
├─────────────────────────────────────────────────────────────────────────┤
│  Type 8 · Agentless Pipeline    没有 loop，纯三段流水线                  │
│  Agentless                                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Type 1 · Tool-Use Loop（Claude Code 范式）

**代表项目：** Claude Code · OpenCode · Kode CLI · Goose · Gemini CLI · Codex CLI · Qwen Code · Kimi CLI · Mistral Vibe · Amazon Q · Cline · Roo Code · Kilo Code · Crush · gptme · ForgeCode · Dexto · CLAII · cursor-agent · 2501 CLI …

> **一句话：** LLM 决定调用哪个工具，框架执行，结果追加到消息历史，循环直到 LLM 停止调用工具。 这是绝大多数项目采用的范式，差异在于**工具集 + harness 机制的丰富程度**。

```python
# ── 最小核心（所有 Type 1 的共同骨架） ──────────────────────────────────
def agent_loop(user_message: str):
    messages = [{"role": "user", "content": user_message}]

    while True:
        response = llm.create(messages=messages, tools=TOOLS)

        if response.stop_reason != "tool_use":
            return response.text          # 任务完成，退出

        for tool_call in response.tool_calls:
            result = dispatch(tool_call)  # 执行工具
            messages.append(result)       # 追加观察结果

        # 循环，把结果交回给 LLM 继续判断


# ── Claude Code：在骨架上叠加的 harness 机制 ──────────────────────────────
# 真实路径：packages/claude-code/src/core/agent-loop.ts
class ClaudeCodeHarness:
    """
    Claude Code = 最小 loop + 以下 harness 机制的叠加
    每个机制都是独立的，loop 本身不变
    """

    def agent_loop(self, user_message: str):
        messages = self.session.load_history()  # 恢复会话历史
        messages.append(user_message)

        while True:
            # 【机制 1】context 压缩：防止超出 token 限制
            if self.token_estimator.count(messages) > COMPACT_THRESHOLD:
                messages = self.compactor.compress(messages)
                # 把旧消息总结成摘要，保留关键信息

            response = self.llm.create(
                messages=messages,
                tools=self.tool_registry.all(),
                system=self.load_system_prompt()   # 读取 CLAUDE.md
            )

            # 【机制 2】hooks：在工具执行前/后触发用户自定义脚本
            for tool_call in response.tool_calls:
                self.hooks.fire("PreToolUse", tool_call)   # 可阻断
                result = self.tool_registry.execute(tool_call)
                self.hooks.fire("PostToolUse", tool_call, result)
                messages.append(result)

            # 【机制 3】subagent 派生：Task 工具触发子任务
            if tool_call.name == "Task":
                subtask_result = self.spawn_subagent(tool_call.input)
                # 子 agent 有独立的 loop 和 context，完成后回报结果

            if response.stop_reason != "tool_use":
                self.hooks.fire("Stop")
                return response.text

    def load_system_prompt(self):
        """按优先级合并多个 CLAUDE.md 文件"""
        return merge([
            read("~/.claude/CLAUDE.md"),      # 全局个人配置
            read(".claude/CLAUDE.md"),         # 项目级配置
            *self.skills.load_relevant()       # 按需加载的技能文档
        ])


# ── Kode CLI：在 Tool-Use Loop 上加 SDK 层（TypeScript / Bun） ────────────
# 真实路径：packages/sdk/src/agent.ts
# 来源：shareAI-lab/Kode-Agent  shareAI-lab/kode-agent-sdk
class KodeAgent:
    """
    Kode 的核心创新：在 tool_use loop 之外引入
    三通道事件系统 + 七阶段 checkpoint（可恢复）
    适合需要嵌入到后端/浏览器扩展/IoT 设备的场景
    """

    # 三通道事件系统（关注点分离）
    CHANNELS = {
        "progress": "text_chunk, tool_use, tool_result",  # 实时输出
        "control":  "pause, resume, abort",               # 控制指令
        "monitor":  "cost, latency, checkpoint",          # 可观测性
    }

    # 七阶段 checkpoint（Safe-Fork-Point = 安全恢复点）
    CHECKPOINTS = [
        "INIT",          # 初始化
        "CONTEXT_READY", # 上下文加载完毕
        "TOOL_CALLED",   # 工具调用发出         ← Safe-Fork-Point
        "TOOL_DONE",     # 工具执行完毕         ← Safe-Fork-Point
        "LLM_CALLED",    # LLM 请求发出
        "LLM_DONE",      # LLM 回复完整
        "COMMITTED",     # 状态持久化完毕       ← Safe-Fork-Point
    ]

    async def run(self, task: str):
        state = await self.store.restore_or_init(task)  # 从 checkpoint 恢复

        while True:
            # 每个关键阶段都写 checkpoint，崩溃后可从最近 Safe-Fork-Point 续跑
            await self.checkpoint("CONTEXT_READY", state)

            response = await self.provider.create(state.messages, self.tools)

            await self.checkpoint("LLM_DONE", state)

            if response.stop_reason != "tool_use":
                break

            for tool_call in response.tool_calls:
                await self.checkpoint("TOOL_CALLED", state)
                result = await self.tools.execute(tool_call)
                await self.checkpoint("TOOL_DONE", state)

                # 向所有 subscriber 广播（前端/监控/日志）
                await self.emit("progress", {"type": "tool_result", "data": result})
                state.messages.append(result)

            await self.checkpoint("COMMITTED", state)

        # 支持 @mention 多模型路由（Kode 独有）
        # @ask-claude-sonnet-4 → 路由到 Anthropic
        # @ask-gpt-5          → 路由到 OpenAI
        # @run-agent-architect → 派生专用 subagent

    # Kode vs Claude Code 的核心差异
    # Claude Code SDK：每个并发用户 = 一个独立的 CLI 进程（进程开销大）
    # Kode SDK：无进程开销，可嵌入任意 JS runtime，单进程多租户
```

---

## Type 2 · CodeAct Loop（OpenHands 范式）

**代表项目：** OpenHands / CodeActAgent / OpenDevin

> **一句话：** 不给 LLM 20 个 JSON tool schema，而是给它一个 bash + Python + 浏览器， 让它用**代码本身**表达任何 action。代码就是工具。

```python
# openhands/controller/agent_controller.py  ← 真实路径
# openhands/agenthub/codeact_agent/codeact_agent.py

class AgentController:
    """
    核心设计：agent 是一个纯函数 f(event_history) → next_action
    所有历史（对话、代码执行结果、浏览器截图）都在 EventStream 里
    """

    async def run(self, task: str):
        # EventStream = 追加日志，不可变，是整个 session 的唯一事实来源
        self.event_stream.append(MessageAction(content=task))

        while True:
            # agent.step() 读取全部历史，输出下一个 action
            action = self.agent.step(self.state)
            # action 类型：
            #   CmdRunAction         → 执行 bash 命令
            #   IPythonRunCellAction → 执行 Python（Jupyter kernel）
            #   BrowserAction        → 点击/导航/截图
            #   AgentDelegateAction  → 派生专用 sub-agent
            #   AgentFinishAction    → 任务完成

            if isinstance(action, AgentFinishAction):
                break

            # 在 Docker 沙箱里执行 action，得到 observation
            observation = await self.runtime.execute(action)
            # observation 类型：
            #   CmdOutputObservation   → stdout + exit_code
            #   IPythonRunCellObservation → Python 执行结果
            #   BrowserOutputObservation  → 页面截图 + DOM
            #   ErrorObservation          → 错误信息

            self.event_stream.append(action)
            self.event_stream.append(observation)
            # 下一轮 agent.step() 会读到这次的 action + observation


class CodeActAgent:
    """
    关键论文洞见（Wang et al. 2024）：
    代码是比 JSON schema 更好的通用 action 空间。
    - 可以表达条件逻辑、循环、复杂数据处理
    - LLM 写代码的能力比遵循特定 JSON schema 强得多
    - 解析错误率更低（代码有语法检查，JSON schema 没有）
    """

    def step(self, state: State) -> Action:
        # 把 EventStream 格式化成 LLM 能理解的对话
        messages = self._build_messages(state.history)

        # LLM 返回的是包含代码块的普通文本，不是 tool_use JSON
        response = self.llm.completion(messages)

        # 从文本中解析 action 类型和代码
        # <execute_bash>
        #   ls -la src/
        # </execute_bash>
        # <execute_ipython>
        #   import pandas as pd
        #   df = pd.read_csv('data.csv')
        #   df.describe()
        # </execute_ipython>
        action = self._parse_action(response.content)
        return action


# ── 与 Type 1 (tool_use) 的本质差别 ──────────────────────────────────────
# tool_use：
#   LLM → {"name": "bash", "input": {"command": "ls -la"}}
#   框架解析 JSON，按 schema 校验，执行
#
# CodeAct：
#   LLM → "<execute_bash>ls -la</execute_bash>"
#   框架解析 XML 标签，直接执行代码
#   优点：LLM 可以在代码里写循环、条件、复杂逻辑
#   缺点：依赖 LLM 是强代码生成器；弱模型容易越界
```

---

## Type 3 · Edit-Patch Loop（Aider 范式）

**代表项目：** Aider

> **一句话：** 不用 tool_use，也不写可执行代码。让 LLM 在普通文本里直接写 diff， 框架解析 patch 格式后 apply 到磁盘。兼容任何 LLM，包括不支持 function calling 的模型。

```python
# aider/coders/base_coder.py  ← 真实路径

class BaseCoder:
    """
    Aider 的根本选择：把 LLM 当"写 diff 的工具"，而不是"调用工具的 agent"
    好处：模型无关；坏处：格式解析脆弱（LLM 可能输出格式不对）
    """

    def run(self):
        while True:
            user_message = self.io.get_input()
            if not user_message:
                break

            # 【核心】构建上下文（这是 Aider 的核心竞争力 RepoMap）
            context = self._build_context(user_message)

            # 普通对话，不传 tools 参数
            response = self.llm.chat(context)

            # 【关键】从纯文本中解析编辑块
            edits = self.get_edits(response)
            #
            # EditBlockCoder 期望的格式（默认，强模型用）：
            # <<<<<<< SEARCH
            # def authenticate(user, pwd):
            #     return user == "admin"           ← 原始代码（精确匹配）
            # =======
            # def authenticate(user, pwd):
            #     return check_hash(user, pwd)     ← 新代码
            # >>>>>>> REPLACE
            #
            # WholeFileCoder 期望的格式（弱模型用）：
            # 直接输出整个文件的新内容，框架做全文替换
            #
            # UnifiedDiffCoder 期望的格式（研究用）：
            # 标准 unified diff（+/-行）

            # apply 到磁盘
            edited_files = self.apply_edits(edits)

            # 自动 git commit（Aider 的招牌功能）
            if edited_files:
                commit_msg = self.get_commit_msg(edits)
                self.repo.commit(edited_files, message=commit_msg)
                # commit 消息格式：
                # "fix: authenticate with bcrypt hash comparison
                #
                # Co-authored-by: aider (GPT-4o)"

    def _build_context(self, user_message: str):
        """
        RepoMap：Aider 的核心差异化机制
        用 tree-sitter 解析整个仓库，用 PageRank 找最重要的符号
        效果：几 KB 的文本 = 整个大仓库的结构摘要
        """
        repo_map = self.repomap.get_ranked_map(
            chat_files=self.chat_files,           # 当前对话文件
            mentioned_fnames=self.mentioned_files  # LLM 提到的文件
        )
        # repo_map 示例：
        # src/auth.py:
        #   def authenticate(user, pwd)
        #   def hash_password(pwd) -> str
        #   class UserSession
        return [system_prompt + diff_format_instructions, repo_map,
                *self.chat_files_content, *self.history, user_message]


# ── Architect 模式：两模型协作（Aider 独有） ─────────────────────────────
class ArchitectCoder(BaseCoder):
    """
    想清楚再动手：大模型规划，快模型实现。
    适合复杂重构（不知道改哪几个文件时）。
    """
    def send_message(self, user_message: str):
        # Step 1：architect 模型只思考，不输出 diff
        plan = self.architect_llm.chat(
            user_message + "\n\n只描述修改方案，不要输出代码"
        )

        # Step 2：editor 模型按计划写 diff
        diff_response = self.editor_llm.chat(
            plan + "\n\n现在按上述方案输出 SEARCH/REPLACE 格式的代码修改"
        )

        edits = self.get_edits(diff_response)
        self.apply_edits(edits)
```

---

## Type 4 · ACI Loop（SWE-agent 范式）

**代表项目：** SWE-agent · AutoCodeRover

> **一句话：** 核心创新不是 loop 本身，而是**为 LLM 设计的计算机接口（ACI）**。 人类用 vim/grep，AI 用专门为它设计的命令集，在真实 shell 沙箱里运行。

```python
# sweagent/agent/agents.py  ← 真实路径（DefaultAgent）
# sweagent/environment/swe_env.py  ← SWEEnv

class DefaultAgent:
    """
    论文核心洞见（Yang et al. NeurIPS 2024）：
    语言模型是一种新型用户，它们需要为自己定制的软件接口，
    而不是为人类设计的 vim/grep/less。
    """

    def run(self, issue: GitHubIssue) -> Trajectory:
        # 初始化：clone 仓库到沙箱，安装 ACI 工具集
        self.env.setup(issue.repo_url)
        self._trajectory = []

        # 把 issue 描述作为初始 prompt
        self.history = [self._build_issue_prompt(issue)]

        while True:
            # LLM 输出一个 ACI 命令（不是 JSON tool_use，是类 shell 文本）
            response = self.model.query(self.history)
            action_str = self._parse_action(response)

            # 记录轨迹（用于研究和评估）
            step = StepOutput(thought=response, action=action_str)

            # 在真实 Docker 沙箱里执行
            observation = self.env.communicate(action_str)
            # observation = 真实 shell 输出，比如：
            # "Found test_auth.py at src/tests/test_auth.py"
            # "Traceback (most recent call last): ..."
            # "All 12 tests passed."

            step.observation = observation
            self._trajectory.append(step)

            # 把观察结果作为下一轮的输入
            self.history.append({"role": "user", "content": observation})

            # 检查：agent 调用 submit → 任务完成
            if "submit" in action_str:
                break

        return Trajectory(steps=self._trajectory, patch=self.env.get_diff())


class ACIToolBundle:
    """
    专为 LLM 设计的工具集 vs 为人类设计的 shell 工具：

    人类工具 → LLM 使用困难的原因：
      grep -r "pattern" .  → 输出太多，LLM 不知道看哪里
      vim +42 file.py      → 交互式编辑器，LLM 无法使用
      find . -name "*.py"  → 路径太多，噪音大

    ACI 工具 → 专为 LLM 优化：
    """

    def find_file(self, filename: str) -> str:
        """返回精确路径列表，而不是递归输出"""
        # 输出：["src/auth.py", "tests/test_auth.py"]

    def open(self, path: str, line: int = 1) -> str:
        """在指定行附近显示内容，每行带编号，方便 LLM 引用行号"""
        # 输出：
        # [42] def authenticate(user, pwd):
        # [43]     return user == "admin"  # TODO: use hash
        # [44]

    def edit(self, start_line: int, end_line: int, new_content: str) -> str:
        """按行号范围替换，不需要匹配原始文本（比 SEARCH/REPLACE 更可靠）"""

    def search_file(self, query: str, file: str = None) -> str:
        """返回带上下文的匹配行（比 grep 友好得多）"""
        # 输出：
        # Line 42 in src/auth.py:
        #   def authenticate(user, pwd):    ← match
        #   return user == "admin"          ← context

    def submit(self) -> str:
        """显式结束信号，生成 git diff 作为最终 patch 提交"""


class SWEEnv:
    """沙箱抽象：统一 Local / Docker / Modal / AWS Fargate 接口"""

    def communicate(self, action: str) -> str:
        """用 shell sentinel 检测完成，不靠超时"""
        sentinel = f"__DONE_{uuid4()}__"
        self.shell.write(f"{action}\necho {sentinel}$?\n")
        output = self.shell.read_until(sentinel)
        return output
```

---

## Type 5 · Proactive Heartbeat Loop（OpenClaw 范式）

**代表项目：** OpenClaw · NanoClaw · ZeroClaw · claw0

> **一句话：** 颠覆"你问我答"的交互模式。Harness 每隔 N 秒**主动唤醒** agent， agent 检查有无待办，有则行动，无则休眠。agent 还能**给自己安排未来任务**（cron）。 这是从"工具"到"同事"的本质跨越。

```python
# 来源：shareAI-lab/claw0, shareAI-lab/learn-claude-code s11
# 机制：Heartbeat（30s 唤醒）+ Cron（定时任务）+ IM 频道（多渠道输入）

HEARTBEAT_INTERVAL = 30  # 秒

class ProactiveHarness:
    """
    Claude Code 模式：用户发消息 → agent 响应 → 会话结束 → 下次从空白开始
    OpenClaw 模式：agent 是持续运行的后台进程，主动检查并完成任务
    """

    def __init__(self):
        self.agent   = CoreAgent()
        self.mailbox = MailBox()    # 收集来自各渠道的消息（IM/webhook/cron）
        self.cron    = CronQueue()  # agent 自己安排的未来任务

    def start(self):
        """主循环：永不退出，定时唤醒"""
        while True:
            self._heartbeat_tick()
            time.sleep(HEARTBEAT_INTERVAL)

    def _heartbeat_tick(self):
        """每 30 秒触发一次：收集 → 决策 → 行动"""
        # 1. 收集所有待处理的输入
        inputs = []
        inputs += self.mailbox.drain()      # WhatsApp/Slack/Discord/微信 消息
        inputs += self.cron.due_tasks()     # 已到期的定时任务
        inputs += self.channel.poll()       # Webhook 事件

        if not inputs:
            return  # 没事情，继续睡眠

        # 2. 把所有 input 组织成 prompt，调用 agent loop
        prompt = self._format_inputs(inputs)
        result = self.agent.run(prompt)
        # agent.run() 就是标准的 Type 1 tool_use loop

        # 3. 发回响应
        for input_item in inputs:
            input_item.reply(result)

    # ── Cron：agent 给自己安排未来任务 ─────────────────────────────────
    # Agent 调用 schedule_task 工具时：
    # {
    #   "name": "schedule_task",
    #   "input": {
    #     "task": "检查 CI/CD 是否成功，如果失败发通知",
    #     "cron": "*/5 * * * *"   ← 每 5 分钟
    #   }
    # }
    # Harness 把这个任务存入 CronQueue，到期时注入 mailbox
    # 效果：agent 可以自我调度，实现真正的自主性

    # ── 与 Claude Code 的核心差异 ──────────────────────────────────────
    # Claude Code：
    #   会话驱动 — 用户启动 → agent 响应 → 会话结束
    #   每次会话从空白开始（无状态）
    #
    # OpenClaw：
    #   时间驱动 — harness 定时触发，不需要用户
    #   持久记忆跨会话（向量存储 + 结构化记忆）
    #   多渠道输入（Telegram/Slack/Discord/WhatsApp 统一入口）


# ── ZeroClaw：Rust 实现的轻量版（<5MB RAM） ──────────────────────────────
# 相同 heartbeat 逻辑，但：
# - trait-driven 架构（Provider/Tool/Memory/Channel 各自可替换）
# - 沙箱执行（不直接操作宿主文件系统）
# - 混合向量+关键词搜索（本地记忆检索）
# - 目标：运行在 $10 硬件上
```

---

## Type 6 · Plan-First Loop（Plandex 范式）

**代表项目：** Plandex · Devon

> **一句话：** 先让 LLM 生成结构化的**执行计划**（改哪些文件、分几步、顺序如何）， 人类确认后再进入执行循环。减少中途偏离，适合跨多文件的大功能开发。

```python
# 来源：plandex-ai/plandex  ← Go 实现
# 机制：Plan 阶段 → 确认 → Execute 阶段（两个独立循环）

class PlandexAgent:
    """
    核心理念：先想清楚整个任务再动手。
    这与 Claude Code"边想边做"的直觉式执行形成对比。
    """

    def run(self, task: str):
        # ── Phase 1: Plan（规划循环） ───────────────────────────────────
        plan = self._build_plan(task)

        # 展示计划，等待用户确认
        print(plan.render())
        # 输出示例：
        # Plan: Add OAuth2 authentication
        # ─────────────────────────────────
        # Step 1: Create src/auth/oauth.go
        #         → Implement OAuth2 client with PKCE flow
        # Step 2: Modify src/server/routes.go
        #         → Add /auth/callback and /auth/login routes
        # Step 3: Create tests/auth_test.go
        #         → Unit tests for token exchange
        # Step 4: Update docs/API.md
        #         → Document new auth endpoints
        if not self.io.confirm("Execute this plan?"):
            return

        # ── Phase 2: Execute（执行循环） ────────────────────────────────
        for step in plan.steps:
            self._execute_step(step)

    def _build_plan(self, task: str) -> Plan:
        """规划阶段：只读不写，用 2M token 上下文理解整个仓库"""
        messages = [task]

        while True:
            # 规划阶段只允许只读工具
            response = self.llm.create(
                messages=messages,
                tools=READ_ONLY_TOOLS,  # read_file, list_dir, search_code
                context_size="2M"       # Plandex 的特色：超大 context window
            )

            if response.stop_reason != "tool_use":
                # LLM 认为已经理解足够，输出计划
                return Plan.parse(response.text)

            # 继续读取文件理解上下文
            for tool_call in response.tool_calls:
                result = self.read_tools.execute(tool_call)
                messages.append(result)

    def _execute_step(self, step: PlanStep):
        """执行单个步骤：标准 tool_use loop，但只针对这一步"""
        messages = [f"Execute step: {step.description}\n\nFile: {step.target_file}"]

        while True:
            response = self.llm.create(messages=messages, tools=ALL_TOOLS)
            if response.stop_reason != "tool_use":
                break
            for tool_call in response.tool_calls:
                result = self.tools.execute(tool_call)
                messages.append(result)

        # 每步完成后 git commit（原子性：每步独立可回滚）
        self.repo.commit(f"step {step.index}: {step.description}")
```

---

## Type 7 · Graph Pipeline（RA.Aid 范式）

**代表项目：** RA.Aid

> **一句话：** 不是一个 loop，而是三个**职责严格分离**的 agent 节点， 用 LangGraph 有向图串联。每段有自己的工具集和 system prompt，互不干扰。

```python
# 来源：ai-christianson/RA.Aid
# 机制：LangGraph StateGraph，Research → Plan → Implement

# ── 全局状态：贯穿三阶段 ──────────────────────────────────────────────────
class PipelineState(TypedDict):
    task:        str
    research:    str   # 研究阶段产出
    plan:        str   # 规划阶段产出
    impl_result: str   # 实现阶段产出
    human_notes: str   # 可选：人类在审查节点插入的反馈


# ── 节点 1：Research Agent ─────────────────────────────────────────────────
def research_node(state):
    """只读，不写任何文件。目标：理解问题，收集上下文。"""
    agent = create_react_agent(
        llm=llm,
        tools=[read_file, list_dir, search_code, grep, web_search],
        # web_search 由 Tavily API 支持，agent 自主决定是否搜索
        system_prompt="你是研究员。理解问题，找相关代码，不写任何文件。"
    )
    result = agent.invoke({"messages": [("user", state["task"])]})
    return {**state, "research": extract_summary(result)}


# ── 节点 2：Plan Agent ─────────────────────────────────────────────────────
def plan_node(state):
    """基于研究结果制定详细计划，仍然不写代码。"""
    agent = create_react_agent(
        llm=llm,
        tools=[read_file],   # 只能读，不能写
        system_prompt="你是架构师。按研究报告制定修改计划，列出文件和步骤，不写代码。"
    )
    context = f"研究结论：{state['research']}\n任务：{state['task']}"
    result = agent.invoke({"messages": [("user", context)]})
    return {**state, "plan": extract_plan(result)}


# ── 节点 3：Implement Agent ────────────────────────────────────────────────
def implement_node(state):
    """按计划执行，可选集成 Aider 作为子工具。"""
    context = f"计划：{state['plan']}\n人类备注：{state.get('human_notes', '')}"
    agent = create_react_agent(
        llm=llm,
        tools=[read_file, write_file, edit_file, bash, aider_run],
        # aider_run：把 Aider 作为子工具调用（RA.Aid 的特色集成）
        # 这样 Implement agent 可以用 Aider 的 RepoMap 能力
        system_prompt="按计划严格执行，每步完成后运行测试验证。"
    )
    result = agent.invoke({"messages": [("user", context)]})
    return {**state, "impl_result": extract_result(result)}


# ── 构建有向图 ──────────────────────────────────────────────────────────────
graph = StateGraph(PipelineState)
graph.add_node("research",  research_node)
graph.add_node("plan",      plan_node)
graph.add_node("implement", implement_node)

# 可选：在 Plan → Implement 之间插入人类审查节点
# graph.add_node("human_review", human_review_node)
# LangGraph interrupt() 机制：暂停，序列化状态，等待外部输入后恢复

graph.set_entry_point("research")
graph.add_edge("research",  "plan")
graph.add_edge("plan",      "implement")
graph.add_edge("implement", END)

pipeline = graph.compile(
    checkpointer=SqliteSaver()   # 状态持久化，支持从任意节点重跑
)

# 运行（thread_id 支持暂停和恢复）
result = pipeline.invoke(
    {"task": "修复登录模块的 SQL 注入漏洞"},
    config={"configurable": {"thread_id": "session-001"}}
)
```

---

## Type 8 · Agentless Pipeline（无 Loop）

**代表项目：** Agentless

> **一句话：** 没有 agent loop，没有持续运行的 agent。 三步纯流水线：**Localize → Edit → Validate**，每步是一次独立的 LLM 调用。 反直觉的发现：在 SWE-bench 上，去掉 loop 之后效果反而不差。

```python
# 来源：OpenAutoCoder/Agentless  ← 论文实现
# 关键论点："持续运行的 agent loop 并非必须"

class AgentlessPipeline:
    """
    与所有其他范式的根本不同：
    这里没有 while loop，没有持续的 agent 状态，
    每步都是独立的、幂等的 LLM 调用。
    """

    def run(self, issue: GitHubIssue) -> Patch:

        # ── Step 1: Localize（定位） ─────────────────────────────────────
        # 三层定位，从粗到细
        suspicious_files = self._localize_files(issue)
        # LLM 调用 1：读 issue + 仓库结构 → 输出可能相关的文件列表

        suspicious_functions = self._localize_functions(issue, suspicious_files)
        # LLM 调用 2：读相关文件 → 输出可能有问题的函数列表

        edit_locations = self._localize_lines(issue, suspicious_functions)
        # LLM 调用 3：读具体函数 → 输出需要修改的行号范围

        # ── Step 2: Edit（生成 patch） ────────────────────────────────────
        # 对每个定位出的位置，独立生成修复 patch
        candidates = []
        for location in edit_locations:
            patch = self._generate_patch(issue, location)
            # LLM 调用 N：根据 issue + 具体位置 → 生成 unified diff
            candidates.append(patch)
            # 生成多个候选，后面选最好的

        # ── Step 3: Validate（验证并筛选） ───────────────────────────────
        best_patch = self._select_best(candidates)
        # 运行测试套件，选通过率最高的 patch
        # 如果都不通过，可以重新生成（但这不是 loop，是重试）

        return best_patch

    # 与 agent loop 的本质区别：
    # agent loop：LLM 在运行时动态决定下一步做什么
    # Agentless：所有步骤在设计时就固定了，LLM 只填充每步的内容
    #
    # 实验结论（论文）：
    # 在 SWE-bench 上 Agentless 与有 loop 的 agent 相比并不弱，
    # 原因：减少了 agent 在 loop 中"走弯路"的概率
```

---

## 分类汇总对比

```
┌──────┬────────────────┬──────────────────────────┬──────────────────────────────────┐
│ Type │ 代表项目        │ Loop 驱动方式             │ 核心机制                         │
├──────┼────────────────┼──────────────────────────┼──────────────────────────────────┤
│  1   │ Claude Code    │ LLM 决定调用工具          │ tool_use JSON + harness 叠加     │
│      │ Kode / OpenCode│                          │ (hooks/checkpoint/subagent)      │
│      │ Goose 等大多数  │                          │                                  │
├──────┼────────────────┼──────────────────────────┼──────────────────────────────────┤
│  2   │ OpenHands      │ LLM 输出代码作为 action  │ EventStream + Docker 沙箱        │
│      │ CodeActAgent   │                          │ 代码即工具，无 JSON schema        │
├──────┼────────────────┼──────────────────────────┼──────────────────────────────────┤
│  3   │ Aider          │ LLM 输出 diff 文本       │ RepoMap + 多种 patch 格式        │
│      │                │                          │ Architect 双模型协作模式          │
├──────┼────────────────┼──────────────────────────┼──────────────────────────────────┤
│  4   │ SWE-agent      │ LLM 输出 ACI 命令        │ 专为 LLM 设计的 shell 工具集     │
│      │                │                          │ 轨迹录制 + shell sentinel         │
├──────┼────────────────┼──────────────────────────┼──────────────────────────────────┤
│  5   │ OpenClaw       │ Harness 定时主动唤醒      │ Heartbeat + Cron + 多渠道 IM     │
│      │ ZeroClaw       │                          │ 持久记忆，从"工具"变"同事"        │
├──────┼────────────────┼──────────────────────────┼──────────────────────────────────┤
│  6   │ Plandex        │ 先 Plan 后 Execute       │ 规划循环（只读）+ 执行循环       │
│      │                │                          │ 每步原子 commit，2M 上下文        │
├──────┼────────────────┼──────────────────────────┼──────────────────────────────────┤
│  7   │ RA.Aid         │ LangGraph 有向图驱动      │ 三段职责分离 + human-in-loop     │
│      │                │                          │ 状态可序列化，可从任意节点重跑    │
├──────┼────────────────┼──────────────────────────┼──────────────────────────────────┤
│  8   │ Agentless      │ 无 loop，固定三步流水线   │ Localize → Edit → Validate       │
│      │                │                          │ 幂等，可并行，去掉"走弯路"概率    │
└──────┴────────────────┴──────────────────────────┴──────────────────────────────────┘
```

---

## 学习路径建议

```
入门（理解基础范式）
  → learn-claude-code s01-s04    — 从零构建 Type 1 loop
  → mini-claude-code v0→v4       — 16行→550行，逐步叠加机制

深入（读各范式核心文件）
  → Trae Agent: trae_agent/agent/trae_agent.py    — 最干净的 Type 1 实现
  → Aider: aider/coders/base_coder.py            — Type 3，理解 RepoMap
  → SWE-agent: sweagent/agent/agents.py           — Type 4，理解 ACI
  → OpenHands: openhands/controller/             — Type 2，理解 CodeAct
  → mini-SWE-agent（100行版本）                  — SWE-agent 核心提炼

进阶（harness 机制）
  → learn-claude-code s05-s12    — skill/context压缩/subagent/团队/worktree
  → kode-agent-sdk               — Type 1 + checkpoint + 事件系统的工程实现
  → claw0                        — Type 5 Heartbeat/Cron 的最小实现
```