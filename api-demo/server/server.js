require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = Number(process.env.PORT || 3001);
const ALLOWED_SCENES = new Set(["student", "office", "startup", "cat", "space", "city"]);
const ROLE_TO_SCENE = {
  "大学生": "student",
  "社畜": "office",
  "创业者": "startup",
  "猫": "cat",
  "外星人": "space"
};
const STAT_KEYS = ["mood", "money", "luck", "crazy"];
const MODEL_FAILURE_LIMIT = 2;
const MODEL_COOLDOWN_MS = 90000;
let modelFailureCount = 0;
let modelDisabledUntil = 0;

app.use(cors());
app.use(express.json({ limit: "64kb" }));

const systemPrompt = [
  "Return strict JSON only.",
  "Put final JSON in message.content.",
  "No markdown, no explanation, no thinking text.",
  "Write short, light, absurd Chinese interactive life stories.",
  "Avoid bloody, vulgar, illegal, infringing, political, or unsafe content."
].join("\n");

const fallbackEvents = {
  "大学生": [
    fallbackEvent("凌晨一点，论文只写了标题。室友问你要不要一起点夜宵。", "点最大份", "你吃出了灵感，也吃出了困意。", { mood: 8, money: -14, luck: -2, crazy: 10 }, "打开文献", "你读完摘要后开始敬畏知识。", { mood: -4, money: 4, luck: 6, crazy: -3 }, "student"),
    fallbackEvent("老师突然说下节课随堂展示。你的 PPT 还停留在新建页面。", "硬讲极简风", "三页空白被你讲成了哲学。", { mood: 10, money: 0, luck: 10, crazy: 14 }, "求助组员", "组员发来一个层层嵌套的压缩包。", { mood: -8, money: 0, luck: 2, crazy: 8 }, "student")
  ],
  "社畜": [
    fallbackEvent("老板问这个需求简单吧，会议室空气突然变得很懂事。", "回复问题不大", "你被拉进三个会议，问题长出了翅膀。", { mood: -12, money: 0, luck: -4, crazy: 9 }, "说需要评估", "你获得了二十分钟神圣缓冲区。", { mood: 5, money: 0, luck: 6, crazy: -2 }, "office"),
    fallbackEvent("你刚坐下，测试环境突然炸了。", "先重启服务", "服务暂时好了，但你知道这只是开始。", { mood: -10, money: 0, luck: -5, crazy: 10 }, "说这是缓存问题", "大家沉默了三秒，然后居然信了。", { mood: 5, money: 0, luck: 10, crazy: 15 }, "office")
  ],
  "创业者": [
    fallbackEvent("投资人问商业模式，你的脑海里弹出一张没填完的表。", "讲平台生态", "投资人点头，你也不知道他懂了还是困了。", { mood: 8, money: 6, luck: 5, crazy: 10 }, "诚实说验证中", "你收获了一句很真实。", { mood: -2, money: 0, luck: 8, crazy: -4 }, "startup"),
    fallbackEvent("第一位付费用户出现了，但备注写着买错了能退吗。", "真诚退款", "用户感动，转介绍了一个真的会用的人。", { mood: 5, money: -4, luck: 11, crazy: -2 }, "询问原因", "你收获三页反馈和一份命名危机。", { mood: -2, money: 0, luck: 7, crazy: 6 }, "startup")
  ],
  "猫": [
    fallbackEvent("铲屎官买了新猫窝，但快递箱看起来更有建筑美学。", "入住快递箱", "你宣布这里是新王宫。", { mood: 12, money: 0, luck: 5, crazy: 9 }, "试试猫窝", "你睡了三分钟，给足了面子。", { mood: 5, money: 0, luck: 2, crazy: -2 }, "cat"),
    fallbackEvent("人类正在开视频会议，你发现键盘正好适合躺下。", "占领键盘", "会议里出现一串神秘字符。", { mood: 11, money: 0, luck: 8, crazy: 14 }, "坐在镜头前", "会议效率提升，因为所有人都在夸你。", { mood: 9, money: 0, luck: 7, crazy: 6 }, "cat")
  ],
  "外星人": [
    fallbackEvent("你降落在便利店门口，自动门打开，你以为地球在欢迎外交使团。", "向门鞠躬", "店员也点头，跨文明礼仪完成。", { mood: 8, money: 0, luck: 7, crazy: 8 }, "研究自动门", "门开了二十次，你肃然起敬。", { mood: 5, money: 0, luck: 2, crazy: 12 }, "space"),
    fallbackEvent("你第一次看见奶茶菜单，上面有许多甜度和小料。", "全都加一点", "杯子像一颗可饮用小行星。", { mood: 9, money: -12, luck: 3, crazy: 14 }, "选店员推荐", "你开始理解地球人的温柔陷阱。", { mood: 7, money: -6, luck: 5, crazy: -2 }, "space")
  ]
};

app.get("/health", (req, res) => {
  res.json({ ok: true, provider: getProviderConfig().provider });
});

app.post("/api/next", async (req, res) => {
  const input = normalizeNextRequest(req.body);
  if (!input.ok) {
    logFallback("next", "请求体校验失败，已返回 fallback。");
    return res.json(getFallbackEvent(req.body && req.body.role, 1, 0));
  }

  const fallback = getFallbackEvent(input.role, input.step, input.history.length);
  if (isModelCoolingDown()) {
    logFallback("next", `model cooldown active for ${getCooldownSeconds()}s`);
    return res.json(fallback);
  }

  try {
    const prompt = buildNextPrompt(input);
    const raw = await callModelWithRetry(prompt);
    const parsed = parseModelJson(raw);
    rememberModelSuccess();
    return res.json(normalizeEvent(parsed, input.role, fallback));
  } catch (error) {
    rememberModelFailure();
    logFallback("next", error.message);
    return res.json(fallback);
  }
});

app.post("/api/ending", async (req, res) => {
  const input = normalizeEndingRequest(req.body);
  const fallback = getFallbackEnding(req.body && req.body.role, req.body && req.body.stats);
  if (!input.ok) {
    logFallback("ending", "请求体校验失败，已返回 fallback。");
    return res.json(fallback);
  }

  if (isModelCoolingDown()) {
    logFallback("ending", `model cooldown active for ${getCooldownSeconds()}s`);
    return res.json(fallback);
  }

  try {
    const prompt = buildEndingPrompt(input);
    const raw = await callModelWithRetry(prompt);
    const parsed = parseModelJson(raw);
    rememberModelSuccess();
    return res.json(normalizeEnding(parsed, input.role, fallback));
  } catch (error) {
    rememberModelFailure();
    logFallback("ending", error.message);
    return res.json(fallback);
  }
});

function fallbackEvent(story, textA, resultA, effectsA, textB, resultB, effectsB, scene) {
  return {
    story,
    choices: [
      { text: textA, result: resultA, effects: effectsA },
      { text: textB, result: resultB, effects: effectsB }
    ],
    scene
  };
}

function normalizeNextRequest(body) {
  const role = typeof body?.role === "string" ? body.role.trim() : "";
  const step = Number(body?.step);
  const stats = normalizeStats(body?.stats);
  const history = normalizeHistory(body?.history);
  return {
    ok: Boolean(role) && Number.isInteger(step) && step >= 1 && step <= 6 && Boolean(stats),
    role,
    step,
    stats: stats || defaultStats(),
    history
  };
}

function normalizeEndingRequest(body) {
  const role = typeof body?.role === "string" ? body.role.trim() : "";
  const stats = normalizeStats(body?.stats);
  const history = normalizeHistory(body?.history);
  return {
    ok: Boolean(role) && Boolean(stats),
    role,
    stats: stats || defaultStats(),
    history
  };
}

function normalizeStats(stats) {
  if (!stats || typeof stats !== "object") return null;
  const output = {};
  for (const key of STAT_KEYS) {
    const value = Number(stats[key]);
    if (!Number.isFinite(value)) return null;
    output[key] = clamp(Math.round(value), 0, 100);
  }
  return output;
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-8).map(item => ({
    story: safeText(item?.story, 120),
    choice: safeText(item?.choice, 80),
    result: safeText(item?.result, 120)
  }));
}

function buildNextPrompt(input) {
  const history = input.history.slice(-2);
  return [
    `生成第${input.step}/6步中文互动剧情。`,
    `身份=${input.role}`,
    `属性=${JSON.stringify(input.stats)}`,
    `历史=${JSON.stringify(history)}`,
    "必须承接历史里最近一次 result，让下一幕像同一段人生继续发展。",
    "返回一个真实剧情 JSON，不要返回字段说明，不要返回“选项A/选项B/30字内剧情”等占位词。",
    "JSON 必须只有这些字段：story, choices, scene。",
    "story 是 20 到 35 字中文剧情。",
    "choices 必须正好两个，每个包含 text、result、effects。",
    "effects 包含 mood、money、luck、crazy，数值范围 -20 到 20。",
    "scene 只能是 student、office、startup、cat、space、city。"
  ].join("\n");
}

function buildEndingPrompt(input) {
  return [
    "生成中文荒诞人生结局。",
    `身份=${input.role}`,
    `最终属性=${JSON.stringify(input.stats)}`,
    `历史=${JSON.stringify(input.history.slice(-3))}`,
    "返回一个真实结局 JSON，不要返回字段说明，不要返回“短标题”等占位词。",
    "JSON 必须只有这些字段：title, description, shareText。",
    "title 是 6 到 14 字中文标题。",
    "description 是 50 到 80 字中文结局描述。",
    "shareText 格式：我在《一分钟人生岔路口》里活成了：加上标题。"
  ].join("\n");
}

async function callModelWithRetry(userPrompt) {
  const config = getProviderConfig();
  if (!config.apiKey || !config.baseUrl) {
    throw new Error(`${config.provider} 环境变量未配置完整`);
  }

  let lastError;
  const timeouts = [12000];
  for (let attempt = 1; attempt <= timeouts.length; attempt += 1) {
    try {
      return await callModel({ ...config, timeoutMs: timeouts[attempt - 1] }, userPrompt);
    } catch (error) {
      lastError = error;
      console.warn(`[LLM retry] provider=${config.provider} attempt=${attempt} failed: ${error.message}`);
    }
  }
  throw lastError;
}

function getProviderConfig() {
  if (process.env.LLM_API_KEY || process.env.LLM_BASE_URL) {
    return {
      provider: "openai",
      baseUrl: process.env.LLM_BASE_URL,
      apiKey: process.env.LLM_API_KEY,
      model: process.env.LLM_MODEL || "mimo-v2.5"
    };
  }

  if (process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_BASE_URL) {
    return {
      provider: "anthropic",
      baseUrl: process.env.ANTHROPIC_BASE_URL,
      apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
      model: process.env.ANTHROPIC_MODEL || process.env.ANTHROPIC_DEFAULT_SONNET_MODEL || "claude-3-5-sonnet-latest"
    };
  }

  return {
    provider: "openai",
    baseUrl: process.env.LLM_BASE_URL,
    apiKey: process.env.LLM_API_KEY,
    model: process.env.LLM_MODEL || "gpt-4o-mini"
  };
}

async function callModel(config, userPrompt) {
  if (config.provider === "anthropic") {
    return callAnthropic(config, userPrompt);
  }
  return callOpenAICompatible(config, userPrompt);
}

async function callOpenAICompatible(config, userPrompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 7000);
  try {
    const response = await fetch(buildOpenAIUrl(config.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 600,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.55,
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`OpenAI-compatible status ${response.status}: ${await safeResponseText(response)}`);
    }
    const data = await response.json();
    const content = extractOpenAIText(data);
    if (typeof content !== "string" || !content.trim()) {
      throw new Error(`OpenAI-compatible empty content: ${JSON.stringify(data).slice(0, 300)}`);
    }
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

function extractOpenAIText(data) {
  const message = data?.choices?.[0]?.message;
  if (typeof message?.content === "string" && message.content.trim()) {
    return message.content.trim();
  }
  if (typeof data?.choices?.[0]?.text === "string" && data.choices[0].text.trim()) {
    return data.choices[0].text.trim();
  }
  return "";
}

async function callAnthropic(config, userPrompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 7000);
  try {
    const response = await fetch(buildAnthropicUrl(config.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 600,
        temperature: 0.55,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt }
        ]
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Anthropic status ${response.status}: ${await safeResponseText(response)}`);
    }
    const data = await response.json();
    const content = extractAnthropicText(data);
    if (!content) {
      throw new Error(`Anthropic empty content: ${JSON.stringify(data).slice(0, 300)}`);
    }
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeAnthropicPrefill(content) {
  const clean = String(content || "").trim();
  if (!clean) return "";
  if (clean.startsWith("{") || clean.startsWith("```")) return clean;
  return `{${clean}`;
}

function extractAnthropicText(data) {
  if (typeof data?.content === "string") return data.content.trim();
  if (typeof data?.completion === "string") return data.completion.trim();
  if (typeof data?.message?.content === "string") return data.message.content.trim();
  if (Array.isArray(data?.message?.content)) {
    const text = data.message.content
      .filter(item => item && typeof item.text === "string")
      .map(item => item.text)
      .join("\n")
      .trim();
    if (text) return text;
  }
  if (typeof data?.choices?.[0]?.message?.content === "string") {
    return data.choices[0].message.content.trim();
  }
  if (!Array.isArray(data?.content)) return "";
  return data.content
    .filter(item => item && typeof item.text === "string")
    .map(item => item.text)
    .join("\n")
    .trim();
}

async function safeResponseText(response) {
  try {
    const text = await response.text();
    return text.slice(0, 300);
  } catch (error) {
    return "无法读取错误响应";
  }
}

function parseModelJson(content) {
  const candidates = [
    content,
    stripMarkdownFence(content),
    extractJsonObject(content),
    repairTrailingBraces(stripMarkdownFence(content))
  ].filter(Boolean);

  let lastError;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Model JSON parse failed: ${lastError?.message || "unknown"}; preview=${String(content).slice(0, 300)}`);
}

function extractJsonObject(text) {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return "";
  return text.slice(first, last + 1);
}

function stripMarkdownFence(text) {
  const clean = String(text || "").trim();
  return clean
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function repairTrailingBraces(text) {
  const clean = String(text || "").trim();
  const first = clean.indexOf("{");
  if (first === -1) return "";
  const candidate = clean.slice(first);
  const missing = countMissingClosingBraces(candidate);
  if (missing <= 0 || missing > 4) return "";
  return `${candidate}${"}".repeat(missing)}`;
}

function countMissingClosingBraces(text) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (const char of text) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
  }
  return depth;
}

function normalizeEvent(value, role, fallback) {
  const story = safeText(value?.story, 90) || fallback.story;
  const scene = ALLOWED_SCENES.has(value?.scene) ? value.scene : ROLE_TO_SCENE[role] || "city";
  const sourceChoices = Array.isArray(value?.choices) ? value.choices.slice(0, 2) : [];
  while (sourceChoices.length < 2) {
    sourceChoices.push(fallback.choices[sourceChoices.length]);
  }

  return {
    story,
    choices: sourceChoices.slice(0, 2).map((choice, index) => ({
      text: safeText(choice?.text, 40) || fallback.choices[index].text,
      result: safeText(choice?.result, 70) || fallback.choices[index].result,
      effects: normalizeEffects(choice?.effects)
    })),
    scene
  };
}

function normalizeEffects(effects) {
  const output = {};
  for (const key of STAT_KEYS) {
    const value = Number(effects?.[key]);
    output[key] = Number.isFinite(value) ? clamp(Math.round(value), -25, 25) : 0;
  }
  return output;
}

function normalizeEnding(value, role, fallback) {
  const title = safeText(value?.title, 40) || fallback.title;
  const description = safeText(value?.description, 140) || fallback.description;
  return {
    title,
    description,
    shareText: safeText(value?.shareText, 100) || `我在《一分钟人生岔路口》里活成了：${title}`
  };
}

function getFallbackEvent(role, step = 1, historyLength = 0) {
  const baseList = fallbackEvents[role] || fallbackEvents["社畜"];
  const list = baseList.concat(makeQuickFallbackEvents(role));
  const seed = Number.isFinite(Number(step)) ? Number(step) - 1 : Number(historyLength) || 0;
  const index = Math.abs(seed) % list.length;
  return list[index];
}

function makeQuickFallbackEvents(role) {
  const cleanRole = typeof role === "string" && role.trim() ? role.trim() : "玩家";
  const scene = ROLE_TO_SCENE[cleanRole] || "city";
  return [
    fallbackEvent(`命运生成器短暂打了个喷嚏，${cleanRole}的下一幕先由本地剧本接管。`, "顺势点头", "你假装一切都在计划内，场面居然稳定了。", { mood: 4, money: 0, luck: 4, crazy: 6 }, "认真观察", "你发现命运只是加载慢了点，并没有真的离开。", { mood: 2, money: 0, luck: 6, crazy: 3 }, scene),
    fallbackEvent(`${cleanRole}收到一张写着“今日剧情临时改道”的便签。`, "沿着便签走", "你绕开了拥堵的命运，捡到一点意外好运。", { mood: 6, money: 0, luck: 8, crazy: 5 }, "把便签收好", "你获得了纪念品，虽然不知道能不能报销。", { mood: 4, money: 2, luck: 2, crazy: 7 }, scene),
    fallbackEvent(`系统提示：大模型正在思考人生，${cleanRole}需要先自己发挥。`, "临场发挥", "你发挥得很像那么回事，旁边的人开始鼓掌。", { mood: 8, money: 0, luck: 5, crazy: 8 }, "选择低调", "你低调到命运差点没找到你，但这也算一种安全。", { mood: 3, money: 0, luck: 4, crazy: -2 }, scene),
    fallbackEvent(`${cleanRole}面前出现两个按钮，其中一个写着“别慌”。`, "按下别慌", "按钮亮了，空气也跟着冷静三秒。", { mood: 9, money: 0, luck: 3, crazy: 3 }, "按另一个", "另一个按钮播放了掌声，你决定接受鼓励。", { mood: 5, money: 0, luck: 5, crazy: 9 }, scene)
  ];
}

function getFallbackEnding(role, stats) {
  const cleanRole = typeof role === "string" && role.trim() ? role.trim() : "玩家";
  const cleanStats = normalizeStats(stats) || defaultStats();
  let title = `${cleanRole}版平行人生体验官`;
  if (cleanStats.crazy >= 75) title = `${cleanRole}版离谱值超标观察对象`;
  if (cleanStats.luck >= 80) title = `${cleanRole}版全靠玄学通关选手`;
  if (cleanStats.mood <= 15) title = `${cleanRole}版心态归零但流程完整的人`;
  return {
    title,
    description: "大模型暂时离线，但你的人生仍然完成了生成。六次选择之后，命运决定先给你一个稳定又好笑的兜底结局。",
    shareText: `我在《一分钟人生岔路口》里活成了：${title}`
  };
}

function logFallback(type, reason) {
  console.warn(`[FALLBACK] route=/api/${type} reason="${reason}" action="using local fallback"`);
}

function isModelCoolingDown() {
  return Date.now() < modelDisabledUntil;
}

function getCooldownSeconds() {
  return Math.ceil(Math.max(0, modelDisabledUntil - Date.now()) / 1000);
}

function rememberModelSuccess() {
  modelFailureCount = 0;
  modelDisabledUntil = 0;
}

function rememberModelFailure() {
  modelFailureCount += 1;
  if (modelFailureCount >= MODEL_FAILURE_LIMIT) {
    modelDisabledUntil = Date.now() + MODEL_COOLDOWN_MS;
    console.warn(`[LLM cooldown] disabled model calls for ${MODEL_COOLDOWN_MS / 1000}s after ${modelFailureCount} consecutive failures`);
  }
}

function defaultStats() {
  return { mood: 50, money: 50, luck: 50, crazy: 50 };
}

function safeText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function trimTrailingSlash(value) {
  return String(value).replace(/\/+$/, "");
}

function buildOpenAIUrl(baseUrl) {
  const clean = trimTrailingSlash(baseUrl);
  if (clean.endsWith("/chat/completions")) return clean;
  return `${clean}/chat/completions`;
}

function buildAnthropicUrl(baseUrl) {
  const clean = trimTrailingSlash(baseUrl);
  if (clean.endsWith("/v1/messages")) return clean;
  if (clean.endsWith("/v1")) return `${clean}/messages`;
  return `${clean}/v1/messages`;
}

app.listen(PORT, () => {
  const config = getProviderConfig();
  console.log(`Life Crossroads API demo server listening on http://localhost:${PORT}`);
  console.log(`LLM provider=${config.provider}, model=${config.model}, baseUrl=${config.baseUrl || "未配置"}`);
});
