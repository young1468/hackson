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

app.use(cors());
app.use(express.json({ limit: "64kb" }));

const systemPrompt = [
  "你是一个荒诞人生互动短剧生成器，必须返回严格 JSON。",
  "剧情短、轻松、荒诞、有反差，适合社交分享。",
  "禁止血腥、低俗、违法违规、侵权、政治敏感、未成年人不适宜内容。",
  "每次只生成一个事件和两个选择。",
  "不要输出 Markdown，不要输出解释，不要输出 JSON 以外的任何内容。"
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
  res.json({ ok: true });
});

app.post("/api/next", async (req, res) => {
  const input = normalizeNextRequest(req.body);
  if (!input.ok) {
    return res.json(getFallbackEvent(req.body && req.body.role));
  }

  const fallback = getFallbackEvent(input.role);
  try {
    const prompt = buildNextPrompt(input);
    const raw = await callModelWithRetry(prompt);
    const parsed = parseModelJson(raw);
    return res.json(normalizeEvent(parsed, input.role, fallback));
  } catch (error) {
    console.warn("LLM next unavailable, using fallback:", error.message);
    return res.json(fallback);
  }
});

app.post("/api/ending", async (req, res) => {
  const input = normalizeEndingRequest(req.body);
  const fallback = getFallbackEnding(req.body && req.body.role, req.body && req.body.stats);
  if (!input.ok) {
    return res.json(fallback);
  }

  try {
    const prompt = buildEndingPrompt(input);
    const raw = await callModelWithRetry(prompt);
    const parsed = parseModelJson(raw);
    return res.json(normalizeEnding(parsed, input.role, fallback));
  } catch (error) {
    console.warn("LLM ending unavailable, using fallback:", error.message);
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
  return [
    "请根据当前状态生成下一段互动剧情。",
    `当前身份：${input.role}`,
    `当前步数：第 ${input.step} / 6 步`,
    `当前属性：${JSON.stringify(input.stats)}`,
    `历史选择：${JSON.stringify(input.history)}`,
    "生成要求：剧情不超过 60 个中文字符；两个选择都要具体、轻松、荒诞、有反差；结果不超过 50 个中文字符；effects 表示属性变化。",
    "effects 的 mood、money、luck、crazy 必须是 -25 到 25 之间的数字。",
    "scene 必须是 student、office、startup、cat、space、city 之一。",
    "返回 JSON schema：",
    "{",
    '  "story": "你刚坐下，测试环境突然炸了。",',
    '  "choices": [',
    '    { "text": "先重启服务", "result": "服务暂时好了，但你知道这只是开始。", "effects": { "mood": -10, "money": 0, "luck": -5, "crazy": 10 } },',
    '    { "text": "说这是缓存问题", "result": "大家沉默了三秒，然后居然信了。", "effects": { "mood": 5, "money": 0, "luck": 10, "crazy": 15 } }',
    "  ],",
    '  "scene": "office"',
    "}"
  ].join("\n");
}

function buildEndingPrompt(input) {
  return [
    "请根据最终状态生成一个荒诞人生结局。",
    `当前身份：${input.role}`,
    `最终属性：${JSON.stringify(input.stats)}`,
    `历史选择：${JSON.stringify(input.history)}`,
    "生成要求：标题短、有记忆点；描述 60 到 100 个中文字符；shareText 适合直接复制分享。",
    "返回 JSON schema：",
    "{",
    '  "title": "全靠玄学活下来的打工仙人",',
    '  "description": "你没有解决所有问题，但每次问题都自己消失了。老板觉得你深不可测，同事觉得你会法术。",',
    '  "shareText": "我在《一分钟人生岔路口》里活成了：全靠玄学活下来的打工仙人"',
    "}"
  ].join("\n");
}

async function callModelWithRetry(userPrompt) {
  const key = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL || "gpt-4o-mini";
  if (!key || !baseUrl) {
    throw new Error("LLM env not configured");
  }

  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await callModel({ key, baseUrl, model, userPrompt });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function callModel({ key, baseUrl, model, userPrompt }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`${trimTrailingSlash(baseUrl)}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.85,
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`LLM status ${response.status}`);
    }
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("LLM empty content");
    }
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

function parseModelJson(content) {
  try {
    return JSON.parse(content);
  } catch (error) {
    const jsonText = extractJsonObject(content);
    if (!jsonText) throw error;
    return JSON.parse(jsonText);
  }
}

function extractJsonObject(text) {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return "";
  return text.slice(first, last + 1);
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

function getFallbackEvent(role) {
  const list = fallbackEvents[role] || fallbackEvents["社畜"];
  return list[Math.floor(Math.random() * list.length)];
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

app.listen(PORT, () => {
  console.log(`Life Crossroads API demo server listening on http://localhost:${PORT}`);
});
