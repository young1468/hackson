import {
  initParticleSystem,
  addParticleBurst,
  updateParticles,
  drawParticles,
  resizeParticleCanvas,
  particleSystem
} from "./particles.js";

const API_BASE = window.API_BASE || "http://localhost:3001";
const TOTAL_STEPS = 6;
const LOGICAL_W = 540;
const LOGICAL_H = 960;
const STAT_KEYS = ["mood", "money", "luck", "crazy"];

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const particleCanvas = document.getElementById("particle-canvas");
const pCtx = particleCanvas.getContext("2d");

const FONT_TITLE = '900 34px "PingFang SC", "Microsoft YaHei", sans-serif';
const FONT_BIG = '800 28px "PingFang SC", "Microsoft YaHei", sans-serif';
const FONT_TEXT = '700 21px "PingFang SC", "Microsoft YaHei", sans-serif';
const FONT_SMALL = '600 15px "PingFang SC", "Microsoft YaHei", sans-serif';

const ROLES = [
  {
    id: "student",
    name: "大学生",
    title: "DDL Runner",
    color: "#00d0ff",
    avatar: "学",
    desc: "你有三份作业、两门考试和一颗想睡到自然醒的心。",
    stats: { mood: 62, money: 38, luck: 55, crazy: 35 }
  },
  {
    id: "office",
    name: "社畜",
    title: "Office Survivor",
    color: "#ffb703",
    avatar: "班",
    desc: "你熟练掌握会议点头、表情包回复和把咖啡当护身符。",
    stats: { mood: 52, money: 58, luck: 45, crazy: 42 }
  },
  {
    id: "startup",
    name: "创业者",
    title: "Pitch Fighter",
    color: "#ff4ecd",
    avatar: "创",
    desc: "你拥有一个商业计划、一张空白表格和明天起飞的错觉。",
    stats: { mood: 68, money: 42, luck: 48, crazy: 62 }
  },
  {
    id: "cat",
    name: "猫",
    title: "House Boss",
    color: "#00ff99",
    avatar: "喵",
    desc: "你没有工作，但全家都在为你的情绪价值打工。",
    stats: { mood: 74, money: 28, luck: 64, crazy: 55 }
  },
  {
    id: "space",
    name: "外星人",
    title: "Earth Visitor",
    color: "#a78bfa",
    avatar: "星",
    desc: "你刚降落地球，误以为便利店关东煮是能量核心。",
    stats: { mood: 60, money: 24, luck: 58, crazy: 75 }
  }
];

const LOCAL_EVENTS = {
  student: [
    event("凌晨一点，论文只写了标题，室友说夜宵也是学术燃料。", "边吃边写", "你吃出了灵感，也吃出了困意。论文开头像菜单。", { mood: 8, money: -14, luck: -2, crazy: 10 }, "打开文献", "你读完摘要后开始敬畏知识，顺便睡着二十分钟。", { mood: -4, money: 4, luck: 6, crazy: -3 }),
    event("老师突然说下节课随堂展示，你的 PPT 还停在新建页面。", "极简硬讲", "三页空白被你讲成了哲学，老师说很有留白意识。", { mood: 10, luck: 10, crazy: 14 }, "请求组员", "组员发来一个压缩包，里面还有三个压缩包。", { mood: -8, luck: 2, crazy: 8 }),
    event("校园卡只剩三块二，但食堂窗口今天出了隐藏菜。", "冲隐藏菜", "阿姨看你眼神坚定，多给了一勺。", { mood: 12, money: -3, luck: 12, crazy: 3 }, "白饭配想象力", "你把白饭吃出了纪录片旁白感。", { mood: -4, money: 6, crazy: 8 }),
    event("考前夜群里流传重点，文件名叫最终最终真最终。", "相信重点", "考卷确实有重点，只是在你没看的下一页。", { mood: -10, luck: -8, crazy: 4 }, "自己梳理", "你发现会的不多，但至少知道不会在哪里。", { mood: 3, luck: 8, crazy: -4 }),
    event("你抢到图书馆插座位，旁边键盘声像小型降雨。", "戴耳机专注", "耳机没电，你开始和键盘雨达成节奏合作。", { mood: -3, luck: -2, crazy: 8 }, "换到窗边", "阳光很好，你的学习效率和植物同步提升。", { mood: 9, luck: 6, crazy: -2 }),
    event("宿舍突然停电，大家围着充电宝像围着古代火种。", "贡献充电宝", "你成为临时首领，但手机只剩百分之九。", { mood: 6, luck: 6, crazy: 8 }, "保存电量", "你省下电，却错过了室友的冷笑话大会。", { luck: -3, crazy: -2 })
  ],
  office: [
    event("老板问这个需求简单吧，会议室空气突然很懂事。", "问题不大", "你被拉进三个会议，问题长出了翅膀。", { mood: -12, luck: -4, crazy: 9 }, "需要评估", "你获得二十分钟神圣缓冲区。", { mood: 5, luck: 6, crazy: -2 }),
    event("测试环境突然不动了，同事们看向你，像你认识每行日志。", "重启服务", "服务暂时好了，但你知道这只是第一集。", { mood: -8, luck: -3, crazy: 8 }, "说是缓存", "大家沉默三秒，然后居然信了。", { mood: 6, luck: 10, crazy: 15 }),
    event("下午茶只剩最后一杯奶茶，标签写着无糖加珍珠。", "拿下它", "你喝到珍珠，也喝到了同事的凝视。", { mood: 9, luck: -2, crazy: 4 }, "让给别人", "你获得办公室好人卡，附带一块苏打饼。", { mood: 3, luck: 6, crazy: -1 }),
    event("日报系统下班前提醒你：今天还没有任何产出。", "写推进若干", "这句话像万能胶，粘住了今天。", { mood: 4, luck: 5, crazy: 6 }, "认真列十条", "你发现自己忙了一天，但忙得像开了静音。", { mood: -3, luck: 3, crazy: -2 }),
    event("上线前十分钟，产品说按钮颜色不够命运感。", "调亮一点", "产品满意了，按钮像刚考上公务员一样精神。", { mood: 3, luck: 4, crazy: 7 }, "请求下版", "你保住上线窗口，也获得一条未来待办。", { mood: 7, luck: 2, crazy: -3 }),
    event("你准备下班，电脑弹出系统更新：预计 47 分钟。", "现在更新", "更新完天都黑了，但电脑像换了清爽发型。", { mood: -5, luck: 3, crazy: 2 }, "明天再说", "你合上电脑，更新提示在梦里继续追你。", { mood: 8, luck: -3, crazy: 5 })
  ],
  startup: [
    event("投资人问商业模式，你脑海弹出一张没填完的表。", "讲平台生态", "投资人点头，你也不知道他懂了还是困了。", { mood: 8, money: 6, luck: 5, crazy: 10 }, "诚实验证中", "空气短暂停顿，但你收获了一句很真实。", { mood: -2, luck: 8, crazy: -4 }),
    event("群里有人问工资什么时候发，群名忽然很创业。", "热血语音", "大家听完沉默，财务发来余额截图更热血。", { mood: -7, money: -8, luck: -3, crazy: 11 }, "先发一半", "钱包瘦了，团队稳了，咖啡降级为速溶。", { mood: 5, money: -18, luck: 6, crazy: -2 }),
    event("竞品上线同款功能，还多了一个会动的按钮。", "开会反击", "会议产出三十个想法和更会动的按钮。", { mood: -4, money: -3, luck: 2, crazy: 13 }, "先问用户", "用户说按钮动不动都行，关键是别卡。", { mood: 4, luck: 9, crazy: -5 }),
    event("路演现场投影仪不认电脑，资本市场先识别风险。", "脱稿讲", "你越讲越顺，PPT 成为不在场的传奇。", { mood: 10, money: 5, luck: 12, crazy: 8 }, "换设备", "设备好了，字体乱了，标题像刚长途旅行。", { mood: -6, luck: -3, crazy: 5 }),
    event("第一位付费用户出现，备注写着买错了能退吗。", "真诚退款", "用户感动，转介绍了一个真的会用的人。", { mood: 5, money: -4, luck: 11, crazy: -2 }, "询问原因", "你收获三页反馈和一份产品命名危机。", { mood: -2, luck: 7, crazy: 6 }),
    event("深夜服务器账单弹出，你第一次觉得云也会下账单。", "优化资源", "账单降了，代码也像刚搬家一样整齐。", { mood: 6, money: 12, luck: 5, crazy: -3 }, "充值续命", "服务稳了，钱包轻了，你给云端点了夜宵。", { mood: -2, money: -15, luck: 2, crazy: 4 })
  ],
  cat: [
    event("铲屎官买了新猫窝，但快递箱更有建筑美学。", "入住纸箱", "你宣布这里是新王宫，猫窝成为停车场。", { mood: 12, luck: 5, crazy: 9 }, "试试猫窝", "你睡了三分钟，给足了人类面子。", { mood: 5, luck: 2, crazy: -2 }),
    event("凌晨四点，你想起客厅还有一条看不见的赛道。", "全速冲刺", "人类惊醒，你完成个人最好成绩。", { mood: 10, luck: -2, crazy: 15 }, "安静巡视", "你像小区保安检查每个角落，威严但不扰民。", { mood: 4, luck: 5, crazy: -4 }),
    event("碗里还有粮，但你看见碗底一小块白色。", "呼叫人类", "人类补满了碗，你确认世界恢复秩序。", { mood: 9, luck: 4, crazy: 6 }, "象征性吃", "粮还行，但原则上仍需投诉。", { mood: 3, luck: 2, crazy: 2 }),
    event("人类开视频会议，你发现键盘正好适合躺下。", "占领键盘", "会议出现神秘字符，同事认为这是高级加密。", { mood: 11, luck: 8, crazy: 14 }, "坐在镜头前", "会议效率提升，因为所有人都在夸你。", { mood: 9, luck: 7, crazy: 6 }),
    event("新玩具是一只会响的小球，你决定评估它。", "疯狂扑球", "小球滚进沙发底，狩猎进入考古阶段。", { mood: 8, luck: -3, crazy: 9 }, "冷淡走开", "人类立刻开始逗你，玩具变成人类玩具。", { mood: 6, luck: 5, crazy: 4 }),
    event("阳光落在地板上，形成刚好容纳猫的黄金地段。", "立刻躺平", "你被晒成温热的主宰，生活恢复高级。", { mood: 13, luck: 6, crazy: -3 }, "先绕三圈", "仪式完成，阳光地段正式归你所有。", { mood: 8, luck: 4, crazy: 5 })
  ],
  space: [
    event("你降落在便利店门口，自动门像在欢迎外交使团。", "向门鞠躬", "店员也点头，你们完成跨文明礼仪。", { mood: 8, luck: 7, crazy: 8 }, "研究自动门", "门开了二十次，地球科技让你肃然起敬。", { mood: 5, luck: 2, crazy: 12 }),
    event("你第一次看奶茶菜单，上面有许多甜度和小料。", "全都加一点", "杯子沉甸甸，像一颗可饮用小行星。", { mood: 9, money: -12, luck: 3, crazy: 14 }, "店员推荐", "你开始理解地球人的温柔陷阱。", { mood: 7, money: -6, luck: 5, crazy: -2 }),
    event("地铁广播提醒先下后上，你以为这是地球哲学课。", "认真记录", "你写下：文明核心是让门口保持流动。", { mood: 5, luck: 6, crazy: 4 }, "跟人群走", "你被精准送进车厢，像被社会算法排序。", { mood: -2, luck: 5, crazy: 8 }),
    event("共享单车需要扫码，你把二维码当成部落图腾。", "拍照研究", "你没解锁车，但收获端正的图腾照片。", { mood: -2, luck: -3, crazy: 6 }, "请路人帮忙", "路人教会你扫码，你把他列为地球导师。", { mood: 8, money: -2, luck: 9, crazy: -3 }),
    event("你听见有人说摸鱼，于是开始寻找水源和鱼。", "认真询问", "大家笑了，然后告诉你这是一种精神游泳。", { mood: 6, luck: 5, crazy: 10 }, "假装听懂", "你点头过于坚定，被邀请加入午休散步小队。", { mood: 7, luck: 7, crazy: 5 }),
    event("你被邀请参加广场舞，地面似乎拥有集体意识。", "加入队形", "动作不标准，但大家夸你有星际风。", { mood: 12, luck: 8, crazy: 13 }, "旁边记录", "你写下：地球人用同步移动维护邻里关系。", { mood: 6, luck: 5, crazy: 5 })
  ]
};

const LOCAL_ENDINGS = [
  { title: "全靠玄学活下来的打工仙人", desc: "你没有解决所有问题，但每次问题都自己消失了。大家觉得你深不可测。" },
  { title: "离谱值超标观察对象", desc: "你的人生报告被标注为请勿用常识解释，围观群众决定先给你鼓掌。" },
  { title: "余额三块但精神富翁", desc: "你的钱包很安静，但经历很热闹。朋友问你怎么撑过来，你说主要靠心态。" },
  { title: "心态归零但流程完整", desc: "你一度只剩躯壳在点击选项，但仍然完成六步，命运给你发了参与奖。" },
  { title: "被生活随机播放的人", desc: "你的六次选择像歌单随机播放，上一秒励志，下一秒跑偏，但节奏居然踩住了。" }
];

const state = {
  scene: "select",
  selected: 0,
  step: 0,
  stats: { mood: 50, money: 50, luck: 50, crazy: 50 },
  current: null,
  result: "",
  ending: null,
  share: "",
  profile: null,
  history: [],
  usedLocal: new Set(),
  loading: false,
  locked: false,
  runId: 0,
  toast: ""
};

let buttons = [];

function event(text, a, ar, da, b, br, db) {
  return { text, a, b, ar, br, da: normalizeDelta(da), db: normalizeDelta(db) };
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function random(a, b) {
  return Math.random() * (b - a) + a;
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function splitText(text, maxWidth) {
  const lines = [];
  for (const paragraph of String(text || "").split("\n")) {
    let current = "";
    for (const c of paragraph) {
      const test = current + c;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = c;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function normalizeDelta(delta) {
  const output = {};
  for (const key of STAT_KEYS) {
    const value = Number(delta && delta[key]);
    output[key] = Number.isFinite(value) ? clamp(value, -25, 25) : 0;
  }
  return output;
}

function normalizeApiEvent(data) {
  if (!data || typeof data.story !== "string" || !Array.isArray(data.choices)) return null;
  const choices = data.choices.slice(0, 2);
  if (choices.length !== 2) return null;
  return event(
    data.story.slice(0, 90),
    String(choices[0].text || "顺着命运走").slice(0, 16),
    String(choices[0].result || "命运绕了一下，但还能继续。").slice(0, 80),
    choices[0].effects,
    String(choices[1].text || "换个姿势试试").slice(0, 16),
    String(choices[1].result || "世界短暂沉默，然后继续运转。").slice(0, 80),
    choices[1].effects
  );
}

function apiHistory() {
  return state.history.map(item => ({
    story: item.story,
    choice: item.choice,
    result: item.result
  }));
}

async function postJson(path, payload) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`API ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

function drawBackground(t) {
  const bg = ctx.createLinearGradient(0, 0, 0, LOGICAL_H);
  bg.addColorStop(0, "#0f172a");
  bg.addColorStop(1, "#020617");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  for (let i = 0; i < 5; i++) {
    const x = 100 + Math.sin(t * 0.0004 + i) * 160;
    const y = 200 + Math.cos(t * 0.0006 + i) * 220;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 120);
    g.addColorStop(0, `rgba(${i % 2 ? 255 : 0},180,255,.12)`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 120, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTitle() {
  const grad = ctx.createLinearGradient(40, 0, 500, 0);
  grad.addColorStop(0, "#00d0ff");
  grad.addColorStop(0.5, "white");
  grad.addColorStop(1, "#ff4ecd");
  ctx.fillStyle = grad;
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#00d0ff";
  ctx.font = FONT_TITLE;
  ctx.textAlign = "center";
  ctx.fillText("一分钟人生岔路口", LOGICAL_W / 2, 86);
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";
}

function drawCard(x, y, w, h, color) {
  ctx.save();
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, "rgba(255,255,255,.08)");
  grad.addColorStop(1, "rgba(255,255,255,.02)");
  ctx.fillStyle = grad;
  ctx.strokeStyle = "rgba(255,255,255,.08)";
  ctx.lineWidth = 1.2;
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;
  roundRect(x, y, w, h, 28);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawButton(x, y, w, h, text, color, disabled = false) {
  ctx.save();
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, disabled ? "rgba(120,130,150,.55)" : color);
  grad.addColorStop(1, "#111827");
  ctx.fillStyle = grad;
  ctx.shadowBlur = disabled ? 0 : 18;
  ctx.shadowColor = color;
  roundRect(x, y, w, h, 22);
  ctx.fill();
  ctx.fillStyle = disabled ? "rgba(255,255,255,.65)" : "white";
  ctx.font = "700 18px \"PingFang SC\", \"Microsoft YaHei\", sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = splitText(text, w - 26).slice(0, 2);
  lines.forEach((line, i) => ctx.fillText(line, x + w / 2, y + h / 2 + (i - (lines.length - 1) / 2) * 24));
  ctx.restore();
}

function drawToast() {
  if (!state.toast) return;
  drawCard(42, 884, 456, 48, "#ffd166");
  ctx.fillStyle = "#ffd166";
  ctx.font = FONT_SMALL;
  ctx.textAlign = "center";
  ctx.fillText(state.toast, LOGICAL_W / 2, 914);
  ctx.textAlign = "left";
}

function drawSelect() {
  buttons = [];
  drawTitle();
  ctx.fillStyle = "rgba(255,255,255,.64)";
  ctx.font = FONT_TEXT;
  ctx.fillText("选择你的人生身份", 150, 132);

  ROLES.forEach((role, i) => {
    const y = 170 + i * 130;
    const selected = state.selected === i;
    drawCard(40, y, 460, 108, role.color);
    if (selected) {
      ctx.strokeStyle = role.color;
      ctx.lineWidth = 3;
      roundRect(40, y, 460, 108, 28);
      ctx.stroke();
    }
    ctx.fillStyle = role.color;
    ctx.font = "900 34px \"PingFang SC\", \"Microsoft YaHei\", sans-serif";
    ctx.fillText(role.avatar, 70, y + 66);
    ctx.fillStyle = "white";
    ctx.font = FONT_BIG;
    ctx.fillText(role.name, 125, y + 42);
    ctx.font = FONT_SMALL;
    ctx.fillStyle = "rgba(255,255,255,.74)";
    ctx.fillText(role.title, 125, y + 70);
    buttons.push({ id: `char${i}`, x: 40, y, w: 460, h: 108 });
  });

  drawButton(140, 850, 260, 62, "进入人生", ROLES[state.selected].color);
  buttons.push({ id: "start", x: 140, y: 850, w: 260, h: 62 });
}

function drawProfile() {
  const role = state.profile;
  drawTitle();
  drawCard(50, 180, 440, 440, role.color);
  ctx.fillStyle = role.color;
  ctx.font = "900 76px \"PingFang SC\", \"Microsoft YaHei\", sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(role.avatar, 270, 306);
  ctx.fillStyle = "white";
  ctx.font = "800 34px \"PingFang SC\", \"Microsoft YaHei\", sans-serif";
  ctx.fillText(role.name, 270, 374);
  ctx.font = FONT_TEXT;
  ctx.fillStyle = "rgba(255,255,255,.75)";
  ctx.fillText(role.title, 270, 414);
  ctx.textAlign = "left";

  const statLines = [
    ["心态", role.stats.mood],
    ["钱包", role.stats.money],
    ["运气", role.stats.luck],
    ["离谱值", role.stats.crazy]
  ];
  statLines.forEach((item, i) => {
    ctx.fillStyle = "white";
    ctx.font = FONT_TEXT;
    ctx.fillText(`${item[0]} ${item[1]}`, 130, 485 + i * 34);
  });

  drawButton(150, 760, 240, 70, "开始人生", role.color);
  buttons = [{ id: "play", x: 150, y: 760, w: 240, h: 70 }];
}

function drawStats() {
  const labels = [
    ["心态", "mood"],
    ["钱包", "money"],
    ["运气", "luck"],
    ["离谱值", "crazy"]
  ];
  labels.forEach((item, i) => {
    const x = 40;
    const y = 60 + i * 38;
    ctx.fillStyle = "rgba(255,255,255,.08)";
    roundRect(x, y, 180, 14, 7);
    ctx.fill();
    ctx.fillStyle = state.profile.color;
    roundRect(x, y, 180 * (state.stats[item[1]] / 100), 14, 7);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = FONT_SMALL;
    ctx.fillText(`${item[0]} ${state.stats[item[1]]}`, x, y - 6);
  });
}

function drawGame() {
  buttons = [];
  drawStats();
  ctx.fillStyle = state.profile.color;
  ctx.font = FONT_SMALL;
  ctx.textAlign = "right";
  ctx.fillText(`第 ${Math.min(state.step + 1, TOTAL_STEPS)} / ${TOTAL_STEPS} 步`, 498, 70);
  ctx.textAlign = "left";

  drawCard(40, 230, 460, 270, state.profile.color);
  ctx.fillStyle = "white";
  ctx.font = FONT_TEXT;
  const text = state.loading ? "命运生成中……\nAI 正在实时续写你的下一幕。" : (state.current && state.current.text) || "命运正在加载。";
  splitText(text, 380).slice(0, 5).forEach((line, i) => ctx.fillText(line, 78, 305 + i * 36));

  if (state.loading) {
    drawButton(120, 640, 300, 78, "生成中……", state.profile.color, true);
    return;
  }

  if (state.result) {
    drawCard(50, 580, 440, 150, "#ffd166");
    ctx.fillStyle = "#ffd166";
    ctx.font = FONT_SMALL;
    ctx.fillText("这一选择带来的结果", 78, 620);
    ctx.fillStyle = "white";
    ctx.font = FONT_TEXT;
    splitText(state.result, 380).slice(0, 3).forEach((line, i) => ctx.fillText(line, 78, 660 + i * 32));
    const label = state.step >= TOTAL_STEPS ? "查看结局" : "确定，进入下一幕";
    drawButton(120, 790, 300, 70, label, state.profile.color);
    buttons.push({ id: "continue", x: 120, y: 790, w: 300, h: 70 });
    return;
  }

  if (!state.current) return;
  drawButton(70, 640, 180, 90, state.current.a, state.profile.color, state.locked);
  drawButton(290, 640, 180, 90, state.current.b, "#374151", state.locked);
  buttons.push({ id: "a", x: 70, y: 640, w: 180, h: 90 });
  buttons.push({ id: "b", x: 290, y: 640, w: 180, h: 90 });
}

function drawEnding() {
  buttons = [];
  drawTitle();
  drawCard(50, 190, 440, 420, state.profile.color);
  ctx.fillStyle = state.profile.color;
  ctx.font = "900 60px \"PingFang SC\", \"Microsoft YaHei\", sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(state.profile.avatar, 270, 300);
  ctx.fillStyle = "white";
  ctx.font = "800 28px \"PingFang SC\", \"Microsoft YaHei\", sans-serif";
  splitText(state.ending.title, 360).slice(0, 2).forEach((line, i) => ctx.fillText(line, 270, 370 + i * 36));
  ctx.font = FONT_TEXT;
  splitText(state.ending.desc, 360).slice(0, 4).forEach((line, i) => ctx.fillText(line, 270, 470 + i * 32));
  ctx.textAlign = "left";

  drawCard(50, 640, 440, 100, "#00d0ff");
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.font = FONT_SMALL;
  splitText(state.share, 390).slice(0, 3).forEach((line, i) => ctx.fillText(line, 76, 674 + i * 24));

  drawButton(70, 800, 180, 68, "复制文案", state.profile.color, !state.share);
  drawButton(290, 800, 180, 68, "重新开始", "#374151");
  buttons.push({ id: "copy", x: 70, y: 800, w: 180, h: 68 });
  buttons.push({ id: "restart", x: 290, y: 800, w: 180, h: 68 });
}

function startProfile() {
  state.profile = ROLES[state.selected];
  state.stats = JSON.parse(JSON.stringify(state.profile.stats));
  state.scene = "profile";
  state.toast = "";
  addParticleBurst(particleSystem, 270, 300, 60, state.profile.color);
}

function startGame() {
  state.runId += 1;
  state.scene = "game";
  state.step = 0;
  state.history = [];
  state.usedLocal = new Set();
  state.result = "";
  state.current = null;
  loadNextEvent(state.runId);
}

function localEvent() {
  const pool = LOCAL_EVENTS[state.profile.id] || LOCAL_EVENTS.student;
  const available = pool.filter((_, i) => !state.usedLocal.has(i));
  const chosen = available.length ? pick(available) : pick(pool);
  const idx = pool.indexOf(chosen);
  state.usedLocal.add(idx);
  return chosen;
}

async function loadNextEvent(runId) {
  state.loading = true;
  state.locked = true;
  state.toast = "命运生成中……";
  try {
    const data = await postJson("/api/next", {
      role: state.profile.name,
      step: state.step + 1,
      stats: state.stats,
      history: apiHistory()
    });
    if (runId !== state.runId) return;
    state.current = normalizeApiEvent(data) || localEvent();
    state.toast = "";
  } catch (_) {
    if (runId !== state.runId) return;
    state.current = localEvent();
    state.toast = "API 暂不可用，已使用本地剧情。";
  } finally {
    if (runId === state.runId) {
      state.loading = false;
      state.locked = false;
    }
  }
}

function choose(side) {
  if (state.locked || state.loading || state.result || !state.current) return;
  const e = state.current;
  const choice = side === 0
    ? { text: e.a, result: e.ar, delta: e.da }
    : { text: e.b, result: e.br, delta: e.db };
  applyDelta(choice.delta);
  state.result = choice.result;
  state.history.push({ story: e.text, choice: choice.text, result: choice.result });
  state.step += 1;
  state.locked = true;
  addParticleBurst(particleSystem, random(100, 400), random(300, 700), 36, state.profile.color);
}

function applyDelta(delta) {
  for (const key of STAT_KEYS) {
    state.stats[key] = clamp(state.stats[key] + (delta[key] || 0), 0, 100);
  }
}

function continueGame() {
  if (!state.result) return;
  state.result = "";
  if (state.step >= TOTAL_STEPS) {
    finishGame();
    return;
  }
  loadNextEvent(state.runId);
}

function localEnding() {
  if (state.stats.crazy >= 78) return LOCAL_ENDINGS[1];
  if (state.stats.money <= 15) return LOCAL_ENDINGS[2];
  if (state.stats.mood <= 15) return LOCAL_ENDINGS[3];
  if (state.stats.luck >= 78) return LOCAL_ENDINGS[0];
  return LOCAL_ENDINGS[4];
}

async function finishGame() {
  state.scene = "ending";
  state.ending = { title: "命运生成中……", desc: "AI 正在整理你的一分钟人生，请稍等。" };
  state.share = "";
  const runId = state.runId;
  try {
    const data = await postJson("/api/ending", {
      role: state.profile.name,
      stats: state.stats,
      history: apiHistory()
    });
    if (runId !== state.runId) return;
    state.ending = {
      title: String(data && data.title || localEnding().title).slice(0, 24),
      desc: String(data && data.description || localEnding().desc).slice(0, 120)
    };
    state.share = String(data && data.shareText || `我在《一分钟人生岔路口》里活成了：${state.ending.title}`).slice(0, 100);
  } catch (_) {
    if (runId !== state.runId) return;
    state.ending = localEnding();
    state.share = `我在《一分钟人生岔路口》里活成了：${state.ending.title}`;
    state.toast = "API 暂不可用，已使用本地结局。";
  }
  addParticleBurst(particleSystem, 270, 400, 120, state.profile.color);
}

function copyShare() {
  if (!state.share) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(state.share)
      .then(() => { state.toast = "分享文案已复制。"; })
      .catch(() => { state.toast = "复制失败，可以截图分享。"; });
  } else {
    state.toast = "浏览器不支持复制，可以截图分享。";
  }
}

function hit(x, y) {
  return buttons.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
}

canvas.addEventListener("pointerdown", e => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (LOGICAL_W / rect.width);
  const y = (e.clientY - rect.top) * (LOGICAL_H / rect.height);
  const btn = hit(x, y);
  if (!btn) return;
  if (btn.id.startsWith("char")) state.selected = Number(btn.id.replace("char", ""));
  if (btn.id === "start") startProfile();
  if (btn.id === "play") startGame();
  if (btn.id === "a") choose(0);
  if (btn.id === "b") choose(1);
  if (btn.id === "continue") continueGame();
  if (btn.id === "copy") copyShare();
  if (btn.id === "restart") {
    state.runId += 1;
    state.scene = "select";
    state.result = "";
    state.toast = "";
  }
});

function resize() {
  particleCanvas.width = window.innerWidth;
  particleCanvas.height = window.innerHeight;
  resizeParticleCanvas(particleSystem, window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", resize);

function loop(t) {
  drawBackground(t);
  if (state.scene === "select") drawSelect();
  if (state.scene === "profile") drawProfile();
  if (state.scene === "game") drawGame();
  if (state.scene === "ending") drawEnding();
  drawToast();
  updateParticles(particleSystem);
  drawParticles(pCtx, particleSystem);
  requestAnimationFrame(loop);
}

initParticleSystem(window.innerWidth, window.innerHeight);
resize();
requestAnimationFrame(loop);
