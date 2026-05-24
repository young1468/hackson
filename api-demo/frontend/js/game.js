/* =========================================
   CYBER LIFE SIMULATOR - FIXED VERSION
   ========================================= */

import {
  initParticleSystem, addParticleBurst, addTrail,
  updateParticles, drawParticles, resizeParticleCanvas, particleSystem
} from './particles.js';

const LOGICAL_W = 540;
const LOGICAL_H = 960;
const API_BASE = window.API_BASE || 'http://localhost:3001';
const TOTAL_STEPS = 6;
const STAT_KEYS = ['mood', 'money', 'luck', 'crazy'];
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const particleCanvas = document.getElementById('particle-canvas');
const pCtx = particleCanvas.getContext('2d');

/* =========================================
   字体
   ========================================= */
const FONT_TITLE = '900 42px Orbitron';
const FONT_BIG   = '700 30px Rajdhani';
const FONT_TEXT  = '600 22px Rajdhani';
const FONT_SMALL = '600 16px Rajdhani';

/* =========================================
   工具
   ========================================= */
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function random(a, b)    { return Math.random() * (b - a) + a; }

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
  for (const paragraph of String(text || '').split('\n')) {
    let current = '';
    for (let c of paragraph) {
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
    output[key] = Number.isFinite(value) ? clamp(Math.round(value), -25, 25) : 0;
  }
  return output;
}

function normalizeApiEvent(data) {
  if (!data || typeof data.story !== 'string' || !Array.isArray(data.choices)) return null;
  const choices = data.choices.slice(0, 2);
  if (choices.length !== 2) return null;
  return {
    text: data.story.slice(0, 90),
    a: String(choices[0].text || '顺着命运走').slice(0, 16),
    b: String(choices[1].text || '换个姿势试试').slice(0, 16),
    ar: String(choices[0].result || '命运绕了一下，但还能继续。').slice(0, 80),
    br: String(choices[1].result || '世界短暂沉默，然后继续运转。').slice(0, 80),
    da: normalizeDelta(choices[0].effects),
    db: normalizeDelta(choices[1].effects)
  };
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`API ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

/* =========================================
   角色系统 (已完全恢复原版 Emoji)
   ========================================= */
const CHARACTERS = [
  {
    id: 'cat', name: '流浪猫', title: 'Street Cat', color: '#ffb703',
    avatar: '🐈',
    desc: '你最大的梦想是晒太阳和不被驱赶。',
    stats: { mood: 80, money: 10, luck: 60, crazy: 40 }
  },
  {
    id: 'student', name: '大学生', title: 'Deadline Survivor', color: '#00d0ff',
    avatar: '🎓',
    desc: '你在DDL和早八之间挣扎求生。',
    stats: { mood: 55, money: 25, luck: 55, crazy: 50 }
  },
  {
    id: 'worker', name: '社畜', title: 'Corporate Slave', color: '#ff4ecd',
    avatar: '💼',
    desc: '你每天都在等下班通知。',
    stats: { mood: 35, money: 65, luck: 35, crazy: 70 }
  },
  {
    id: 'founder', name: '创业者', title: 'Dream Chaser', color: '#00ff99',
    avatar: '🚀',
    desc: '你坚信下一个风口属于自己。',
    stats: { mood: 60, money: 45, luck: 70, crazy: 65 }
  },
  {
    id: 'alien', name: '外星人', title: 'Unknown Visitor', color: '#9b5cff',
    avatar: '👽',
    desc: '你假装自己是普通地球人。',
    stats: { mood: 50, money: 50, luck: 90, crazy: 90 }
  }
];

/* =========================================
   事件 (保持最新丰富后的事件库)
   ========================================= */
const EVENTS = {
  cat: [
    { text: "你在垃圾桶里发现一份‘猫界公务员考试通知’。", a: "报名参加", b: "继续躺平", da: { mood: -5, crazy: 10 }, db: { mood: 5 }, ar: "你成为编制猫，每天巡视三条街。", br: "你被流浪猫尊为‘躺平圣贤’。" },
    { text: "一只鸽子嘲笑你不会飞。", a: "挑战飞跃屋顶", b: "用眼神攻击", da: { crazy: 15, luck: 5 }, db: { mood: 3 }, ar: "你摔进外卖箱，获得新身份：炸鸡守护者。", br: "鸽子精神崩溃，辞职不飞了。" },
    { text: "人类开始用‘猫税’规范你的晒太阳时间。", a: "抗议喵喵游行", b: "偷偷换地方晒太阳", da: { crazy: 10 }, db: { mood: 8 }, ar: "你成为猫权革命领袖。", br: "你成功躲过税务局巡查。" },
    { text: "一个小孩想把你带回家，但他妈妈过敏。", a: "主动表演可爱", b: "装作凶猛野猫", da: { mood: 10, luck: 5 }, db: { crazy: 8 }, ar: "小孩哭闹成功说服妈妈带你回家。", br: "你成功维持了流浪猫的自由尊严。" },
    { text: "附近的猫咖店在招聘‘驻场猫网红’。", a: "去试镜", b: "拒绝被商业化", da: { money: 20, mood: -10 }, db: { mood: 15 }, ar: "你日均引流300人，但每天被摸爆了。", br: "你的自由灵魂无价。" },
    { text: "一只狗追你追了三条街，你累了。", a: "回头决战", b: "爬上电线杆等它走", da: { crazy: 12, mood: -5 }, db: { luck: 8 }, ar: "你揍赢了，狗圈都知道了你的名字。", br: "你在电线杆上看完了一个日落。" }
  ],
  student: [
    { text: "AI帮你写完作业，还顺手写了你的遗书模板。", a: "感谢AI", b: "删除AI", da: { crazy: 12 }, db: { mood: -5 }, ar: "AI开始替你上课。", br: "你恢复了纯手写痛苦人生。" },
    { text: "舍友在凌晨三点煮火锅并讨论宇宙起源。", a: "加入哲学火锅局", b: "戴耳塞装死", da: { mood: 10, crazy: 10 }, db: { mood: -3 }, ar: "你们发现火锅可以预测期末题。", br: "你错过一次宇宙级顿悟。" },
    { text: "教务系统突然提示：你已毕业（但你才大二）。", a: "直接领毕业证", b: "人工申诉", da: { money: 20, crazy: 15 }, db: { luck: -5 }, ar: "你提前进入社会副本。", br: "系统把你当Bug修复了。" },
    { text: "期末周你发现图书馆有人在睡觉占座七天了。", a: "拍照上热搜", b: "向他学习", da: { luck: 10, crazy: 5 }, db: { mood: 8 }, ar: "那人成了学校传说，你是唯一目击者。", br: "你悟出了考试周生存哲学。" },
    { text: "导师说你的论文选题‘有点意思，但太小众’。", a: "改成更主流的方向", b: "坚持研究下去", da: { money: 10, mood: -8 }, db: { crazy: 10, luck: 5 }, ar: "论文顺利过审，你失去了一点灵魂。", br: "你开始写一篇没人看但你爱的东西。" },
    { text: "学校食堂推出‘卷王套餐’，价格是普通套餐三倍。", a: "买！冲！", b: "自带泡面抵制", da: { money: -15, mood: 5 }, db: { mood: -5, crazy: 8 }, ar: "你吃到了传说中的‘努力香味’。", br: "你在宿舍发起了反消费主义运动。" }
  ],
  worker: [
    { text: "公司引入AI，你的工作变成‘假装有工作’。", a: "认真假装", b: "认真摸鱼", da: { money: 10, crazy: 5 }, db: { mood: 8 }, ar: "你被评为‘最真实AI替代品’。", br: "你晋升为摸鱼主管。" },
    { text: "老板发消息：‘在吗？’但已经凌晨4点。", a: "秒回在", b: "假装外星人劫持手机", da: { money: 5, crazy: 10 }, db: { mood: -10 }, ar: "你获得凌晨召唤者称号。", br: "老板开始怀疑宇宙存在。" },
    { text: "公司推出‘快乐上班制度’但必须笑出声打卡。", a: "专业笑声训练", b: "录音循环播放", da: { money: 8, crazy: 12 }, db: { mood: -5 }, ar: "你成为笑声KPI冠军。", br: "系统判定你情绪异常。" },
    { text: "HR说下季度绩效考核改成‘内卷指数评分’。", a: "全力卷到顶", b: "假装没看到邮件", da: { money: 15, mood: -15 }, db: { mood: 5, luck: -5 }, ar: "你拿了奖金，但头发少了一半。", br: "你在邮件浪潮里获得了短暂的宁静。" },
    { text: "同事拉你入伙做副业，卖‘焦虑缓解水晶’。", a: "入伙", b: "拒绝但买了一颗", da: { money: 20, crazy: 15 }, db: { mood: 5 }, ar: "你的第一个水晶卖给了你的老板。", br: "你把水晶放在工位上，感觉好多了。" },
    { text: "公司组织‘团建跑步’，但是周六凌晨六点。", a: "积极参加", b: "发烧请假（没发烧）", da: { mood: -10, money: 5 }, db: { mood: 10, luck: -5 }, ar: "你获得了‘狼性先锋’奖杯。", br: "你睡到中午，这一天无比美好。" }
  ],
  founder: [
    { text: "投资人说你的项目‘很有想象力（但像做梦）’。", a: "继续融资路演", b: "改行卖煎饼", da: { money: -10, crazy: 15 }, db: { money: 10, mood: 5 }, ar: "你成功融资空气币项目。", br: "煎饼摊成为独角兽企业。" },
    { text: "你的产品被AI自动复制1000个版本。", a: "打不过就加入", b: "起诉AI", da: { crazy: 10 }, db: { luck: -5 }, ar: "你成为AI生态一部分。", br: "你赢了官司但输了市场。" },
    { text: "用户反馈：你的产品很好用，但没人知道是干嘛的。", a: "强化概念包装", b: "直接改名玄学产品", da: { money: 15, crazy: 12 }, db: { mood: 5 }, ar: "你进入概念经济时代。", br: "产品变成赛博护身符。" },
    { text: "你的联合创始人昨晚出走，带走了密码和猫。", a: "发律师函", b: "默默修改密码再买只猫", da: { money: -5, crazy: 10 }, db: { mood: -5, luck: 8 }, ar: "你们和解了，猫成了公司吉祥物。", br: "你的新猫叫‘重新出发’。" },
    { text: "媒体要采访你，称你为‘这代人的创业精神’。", a: "接受采访大谈愿景", b: "婉拒，专心做产品", da: { money: 10, crazy: 8 }, db: { luck: 10 }, ar: "你上了头条，但没人下载你的App。", br: "你悄悄把版本从0.1更新到了0.2。" },
    { text: "你发现你的竞争对手是你的大学同学。", a: "约他喝咖啡谈合并", b: "全力竞争", da: { money: 20, mood: 5 }, db: { money: -5, crazy: 12 }, ar: "你们合并了，股权分配吵了半年。", br: "你获得了一段可歌可泣的商战回忆。" }
  ],
  alien: [
    { text: "地球人怀疑你是AI，但你其实在怀疑他们。", a: "启动反观察计划", b: "装作普通人", da: { crazy: 20 }, db: { mood: 5 }, ar: "你成功混入人类数据库。", br: "你差点通过图灵测试。" },
    { text: "你的母星发来消息：请停止社交媒体冲浪。", a: "假装没收到", b: "回母星申请延长地球假期", da: { crazy: 15 }, db: { luck: 10 }, ar: "你被停职观察宇宙文明。", br: "母星批准你继续摸鱼。" },
    { text: "人类邀请你参加‘正常人类行为培训班’。", a: "认真学习微笑", b: "展示外星礼仪", da: { crazy: 10 }, db: { mood: -5 }, ar: "你成为优秀人类样本。", br: "培训班紧急关闭。" },
    { text: "你不小心用外星语言回复了老板的微信。", a: "说是输入法故障", b: "坚持说那是方言", da: { luck: 10, crazy: 5 }, db: { crazy: 15 }, ar: "老板信了，还夸你很有个性。", br: "老板开始学你的‘方言’。" },
    { text: "有人开始写关于你的纪录片，标题是‘ta不像地球人’。", a: "配合拍摄", b: "悄悄毁掉所有素材", da: { mood: 10, crazy: 15 }, db: { luck: -5 }, ar: "纪录片在宇宙频道播出了。", br: "你成功保住了身份，但很累。" },
    { text: "地球的咖啡让你产生了情感，母星不允许有情感。", a: "继续喝，管它呢", b: "戒掉咖啡回归理性", da: { mood: 15, crazy: 10 }, db: { mood: -10, luck: 5 }, ar: "你爱上了地球，忘记了回家的路。", br: "你保持了冷静，但偶尔想念那杯拿铁。" }
  ]
};

/* =========================================
   结局
   ========================================= */
const ENDINGS = {
  cat: [
    { title: "猫界神明",   desc: "你被供奉在所有垃圾桶之上。" },
    { title: "罐头资本家", desc: "你垄断了整个城市的鱼罐头市场。" },
    { title: "流浪哲学家", desc: "你在屋顶讲述存在主义喵喵论。" }
  ],
  student: [
    { title: "延毕仙人",       desc: "你在校园修炼了八年青春。" },
    { title: "AI替身毕业生",   desc: "你的论文由AI和运气共同完成。" },
    { title: "知识逃逸者",     desc: "你成功逃离所有考试系统。" }
  ],
  worker: [
    { title: "摸鱼之神", desc: "公司因你摸鱼效率提升而上市。" },
    { title: "工位幽灵", desc: "你的存在只体现在打卡系统里。" },
    { title: "加班成仙", desc: "你在凌晨三点悟道升天。" }
  ],
  founder: [
    { title: "空气独角兽", desc: "你的公司估值来自想象力。" },
    { title: "失败学大师", desc: "你开设创业失败课程爆红。" },
    { title: "风口制造机", desc: "你本身就是一个风口。" }
  ],
  alien: [
    { title: "地球观察主管", desc: "你写报告说人类是实验性物种。" },
    { title: "系统外生命",   desc: "你被踢出宇宙文明名单。" },
    { title: "误入人间",     desc: "你再也回不去母星WiFi。" }
  ]
};

/* =========================================
   紧急结局（stats 触发）
   ========================================= */
const CRISIS_ENDINGS = {
  crazy:  { title: "精神超载",   desc: "你的离谱值爆表，宇宙选择了你。" },
  money:  { title: "赛博破产",   desc: "你的财富归零，但精神依然富有。" },
  mood:   { title: "情绪崩塌",   desc: "你的心态降至冰点，决定躺平永久。" }
};

/* =========================================
   状态
   ========================================= */
const state = {
  usedEvents:  new Set(),
  scrollY:     0,
  velocity:    0,
  isDragging:  false,
  lastY:       0,
  scene:       'select',
  selected:    0,
  step:        0,
  shake:       0,
  transition:  0,
  collection:  { endings: [], characters: [] },
  stats:       { mood: 50, money: 50, luck: 50, crazy: 50 },
  current:     null,
  result:      '',
  ending:      null,
  share:       '',
  toast:       '',
  history:     [],
  profile:     null,
  loading:     false,
  runId:       0,
  mode:        localStorage.getItem('lifeCrossroadsMode') || 'api',
  choosing:    false, // 防止狂点按钮
  maxSteps:    TOTAL_STEPS
};

let buttons = [];

/* =========================================
   存档系统
   ========================================= */
function saveCollection() {
  localStorage.setItem('cyberLifeCollection', JSON.stringify(state.collection));
}

function loadCollection() {
  const data = localStorage.getItem('cyberLifeCollection');
  if (data) {
    try { state.collection = JSON.parse(data); } catch (e) { console.error(e); }
  }
}

function addEndingToCollection(ending) {
  if (ending && !state.collection.endings.includes(ending.title)) {
    state.collection.endings.push(ending.title);
    saveCollection();
  }
}

/* =========================================
   UI
   ========================================= */
function drawBackground(t) {
  const bg = ctx.createLinearGradient(0, 0, 0, LOGICAL_H);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(1, '#020617');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
  for (let i = 0; i < 5; i++) {
    const x = 100 + Math.sin(t * 0.0004 + i) * 160;
    const y = 200 + Math.cos(t * 0.0006 + i) * 220;
    const r = 120;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${i % 2 ? 255 : 0},180,255,.12)`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTitle() {
  const grad = ctx.createLinearGradient(100, 0, 400, 0);
  grad.addColorStop(0, '#00d0ff');
  grad.addColorStop(0.5, 'white');
  grad.addColorStop(1, '#ff4ecd');
  ctx.fillStyle = grad;
  ctx.shadowBlur = 20;
  ctx.shadowColor = '#00d0ff';
  ctx.font = FONT_TITLE;
  ctx.fillText('CYBER LIFE', 90, 100);
  ctx.shadowBlur = 0;
}

function drawCard(x, y, w, h, color) {
  ctx.save();
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, 'rgba(255,255,255,.08)');
  grad.addColorStop(1, 'rgba(255,255,255,.02)');
  ctx.fillStyle = grad;
  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth = 1.2;
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;
  roundRect(x, y, w, h, 28);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawButton(x, y, w, h, text, color) {
  ctx.save();
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, color);
  grad.addColorStop(1, '#111827');
  ctx.fillStyle = grad;
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;
  roundRect(x, y, w, h, 22);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.font = '700 20px Rajdhani';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.restore();
}

function drawToast() {
  if (!state.toast) return;
  drawCard(50, 885, 440, 46, '#ffd166');
  ctx.fillStyle = '#ffd166';
  ctx.font = FONT_SMALL;
  ctx.textAlign = 'center';
  splitText(state.toast, 390).slice(0, 1).forEach(line => ctx.fillText(line, LOGICAL_W / 2, 914));
  ctx.textAlign = 'left';
}

function drawModeToggle() {
  const isApi = state.mode === 'api';
  const label = isApi ? 'API模式' : '离线模式';
  const color = isApi ? '#00d0ff' : '#ffd166';
  drawButton(352, 122, 138, 46, label, color);
  buttons.push({ id: 'mode', x: 352, y: 122, w: 138, h: 46 });
}

/* =========================================
   角色选择 (UI已完全还原)
   ========================================= */
function drawSelect(t) {
  buttons = [];
  drawTitle();
  drawModeToggle();
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.font = FONT_TEXT;
  ctx.fillText('选择你的人生身份', 120, 160);

  CHARACTERS.forEach((c, i) => {
    const baseY = 190 + i * 145;
    const y = baseY + state.scrollY;
    const selected = state.selected === i;
    drawCard(50, y, 440, 120, c.color);
    if (selected) {
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 3;
      roundRect(50, y, 440, 120, 28);
      ctx.stroke();
    }

    // UI 完全恢复你原版的排版
    ctx.fillStyle = c.color;
    ctx.font = '900 52px Orbitron';
    ctx.fillText(c.avatar, 80, y + 95);
    ctx.fillStyle = 'white';
    ctx.font = FONT_BIG;
    ctx.fillText(c.name, 160, y + 58);
    ctx.font = FONT_SMALL;
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fillText(c.title, 160, y + 88);
    const lines = splitText(c.desc, 260);
    lines.forEach((line, k) => {
      ctx.fillText(line, 160, y + 120 + k * 22);
    });

    buttons.push({ id: 'char' + i, x: 50, y, w: 440, h: 120 });
  });

  const startY      = 950 + state.scrollY;
  const collectionY = 1035 + state.scrollY;
  drawButton(140, startY, 260, 60, '进入人生', CHARACTERS[state.selected].color);
  drawButton(140, collectionY, 260, 50, '人生图鉴', '#ff4ecd');
  buttons.push({ id: 'start',      x: 140, y: startY,      w: 260, h: 60 });
  buttons.push({ id: 'collection', x: 140, y: collectionY, w: 260, h: 50 });

  const maxScroll = 0;
  const minScroll = -((CHARACTERS.length - 3) * 145);
  state.scrollY  += state.velocity;
  state.velocity *= 0.92;
  if (state.scrollY > maxScroll) { state.scrollY *= 0.2; state.velocity = 0; }
  if (state.scrollY < minScroll) { state.scrollY += (minScroll - state.scrollY) * 0.2; state.velocity = 0; }
}

/* =========================================
   开局档案 (UI已完全还原)
   ========================================= */
function drawProfile() {
  const c = state.profile;
  drawTitle();
  drawModeToggle();
  drawCard(50, 220, 440, 420, c.color);

  ctx.fillStyle = c.color;
  ctx.font = '900 100px Orbitron';
  ctx.fillText(c.avatar, 200, 360);
  ctx.fillStyle = 'white';
  ctx.font = '700 36px Rajdhani';
  ctx.fillText(c.name, 150, 450);
  ctx.font = FONT_TEXT;
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.fillText(c.title, 170, 490);

  const stats = [
    ['心态', c.stats.mood],
    ['财富', c.stats.money],
    ['运气', c.stats.luck],
    ['离谱', c.stats.crazy]
  ];
  stats.forEach((s, i) => {
    const y = 560 + i * 42;
    ctx.fillStyle = 'white';
    ctx.fillText(`${s[0]} ${s[1]}`, 100, y);
  });

  drawButton(150, 760, 240, 70, '开始人生', c.color);
  buttons = [{ id: 'play', x: 150, y: 760, w: 240, h: 70 }];
  buttons.push({ id: 'mode', x: 352, y: 122, w: 138, h: 46 });
}

/* =========================================
   游戏
   ========================================= */
function drawStats() {
  const keys = [['心态', 'mood'], ['财富', 'money'], ['运气', 'luck'], ['离谱', 'crazy']];
  keys.forEach((k, i) => {
    const x = 40;
    const y = 70 + i * 38;
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    roundRect(x, y, 180, 14, 7);
    ctx.fill();
    ctx.fillStyle = state.profile.color;
    roundRect(x, y, 180 * (state.stats[k[1]] / 100), 14, 7);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = FONT_SMALL;
    ctx.fillText(`${k[0]} ${state.stats[k[1]]}`, x, y - 6);
  });
}

function drawGame(t) {
  buttons = [];
  drawStats();
  drawModeToggle();
  const event = state.current || { text: '命运生成中……\nAI 正在续写你的下一幕。', a: '等待', b: '稍等' };

  drawCard(40, 260, 460, 260, state.profile.color);
  ctx.fillStyle = 'white';
  ctx.font = FONT_TEXT;
  const storyText = state.loading ? '命运生成中……\nAI 正在续写你的下一幕。' : event.text;
  const lines = splitText(storyText, 360).slice(0, 5);
  lines.forEach((line, i) => {
    ctx.fillText(line, 80, 340 + i * 38);
  });

  if (state.loading) {
    drawButton(140, 650, 260, 72, '生成中...', '#374151');
    return;
  }

  if (state.result) {
    drawCard(50, 600, 440, 160, '#ffd166');
    ctx.fillStyle = '#ffd166';
    ctx.font = FONT_SMALL;
    ctx.fillText('这一选择带来的结果', 80, 636);
    ctx.fillStyle = 'white';
    ctx.font = FONT_TEXT;
    splitText(state.result, 370).slice(0, 3).forEach((line, i) => {
      ctx.fillText(line, 80, 678 + i * 32);
    });
    drawButton(140, 800, 260, 70, state.step >= state.maxSteps ? '查看结局' : '确定继续', state.profile.color);
    buttons.push({ id: 'continue', x: 140, y: 800, w: 260, h: 70 });
    return;
  }

  // 如果正在等待结算，按钮变灰
  const colorA = state.choosing ? '#444' : state.profile.color;
  const colorB = state.choosing ? '#222' : '#374151';
  drawButton(70,  640, 180, 90, event.a, colorA);
  drawButton(290, 640, 180, 90, event.b, colorB);

  if (!state.choosing) {
    buttons.push({ id: 'a', x: 70,  y: 640, w: 180, h: 90 });
    buttons.push({ id: 'b', x: 290, y: 640, w: 180, h: 90 });
  }
}

/* =========================================
   结局 (UI已完全还原)
   ========================================= */
function drawEnding() {
  drawTitle();
  drawModeToggle();
  drawCard(50, 170, 440, 480, state.profile.color);

  ctx.fillStyle = state.profile.color;
  ctx.font = '900 64px Orbitron';
  ctx.fillText(state.profile.avatar, 218, 285);
  ctx.fillStyle = 'white';
  ctx.font = '700 30px Rajdhani';
  splitText(state.ending.title, 340).slice(0, 2).forEach((line, i) => ctx.fillText(line, 100, 365 + i * 38));
  ctx.font = '600 18px Rajdhani';
  splitText(state.ending.desc, 360).slice(0, 7).forEach((line, i) => ctx.fillText(line, 90, 465 + i * 28));

  if (state.share) {
    drawCard(50, 680, 440, 88, '#00d0ff');
    ctx.fillStyle = 'rgba(255,255,255,.86)';
    ctx.font = FONT_SMALL;
    splitText(state.share, 390).slice(0, 3).forEach((line, i) => ctx.fillText(line, 75, 712 + i * 22));
  }

  drawButton(70, 815, 180, 66, '复制文案', state.share ? state.profile.color : '#374151');
  drawButton(290, 815, 180, 66, '重新开始', '#374151');
  buttons = [
    { id: 'copy', x: 70, y: 815, w: 180, h: 66 },
    { id: 'restart', x: 290, y: 815, w: 180, h: 66 }
  ];
  buttons.push({ id: 'mode', x: 352, y: 122, w: 138, h: 46 });
}

/* =========================================
   图鉴界面 (UI已完全还原)
   ========================================= */
function drawCollection() {
  loadCollection();
  buttons = [];
  drawTitle();
  drawModeToggle();
  ctx.fillStyle = 'white';
  ctx.font = FONT_BIG;
  ctx.fillText('人生图鉴 COLLECTION', 90, 150);

  // 角色图鉴
  ctx.font = FONT_TEXT;
  ctx.fillStyle = '#00d0ff';
  CHARACTERS.forEach((c, i) => {
    const unlocked = state.collection.characters.includes(c.id);
    const x = 60 + (i % 2) * 220;
    const y = 250 + Math.floor(i / 2) * 130 + state.scrollY;
    drawCard(x, y, 180, 100, unlocked ? c.color : '#374151');
    ctx.globalAlpha = unlocked ? 1 : 0.3;
    ctx.font = '50px Orbitron';
    ctx.fillStyle = 'white';
    ctx.fillText(unlocked ? c.avatar : '?', x + 20, y + 65);
    ctx.font = FONT_SMALL;
    ctx.fillText(unlocked ? c.name : '未解锁', x + 80, y + 60);
    ctx.globalAlpha = 1;
  });

  // 结局图鉴
  ctx.fillStyle = '#ff4ecd';
  ctx.font = FONT_TEXT;
  // 直接展平用于绘制高度计算
  const allEndingsList = Object.values(ENDINGS).flat();
  allEndingsList.forEach((e, i) => {
    const unlocked = state.collection.endings.includes(e.title);
    const y = 600 + i * 70 + state.scrollY;
    drawCard(60, y, 420, 55, unlocked ? '#ff4ecd' : '#374151');
    ctx.fillStyle = 'white';
    ctx.font = FONT_SMALL;
    ctx.fillText(unlocked ? e.title : '？？？？', 90, y + 35);
  });

  const contentHeight = 600 + allEndingsList.length * 70 + 100;
  const viewHeight = LOGICAL_H;
  const minScroll = -(contentHeight - viewHeight);
  const maxScroll = 0;

  state.scrollY  += state.velocity;
  state.velocity *= 0.92;
  if (state.scrollY > maxScroll) { state.scrollY *= 0.2; state.velocity = 0; }
  if (state.scrollY < minScroll) { state.scrollY += (minScroll - state.scrollY) * 0.2; state.velocity = 0; }

  drawButton(140, 880, 260, 60, '返回', '#00d0ff');
  buttons.push({ id: 'back', x: 140, y: 880, w: 260, h: 60 });
}

/* =========================================
   游戏逻辑
   ========================================= */

// 修复事件重复问题：取消清空机制，真正做到不重复
function pickRandomEvent() {
  const list = EVENTS[state.profile.id];
  let available = [];
  for (let i = 0; i < list.length; i++) {
    if (!state.usedEvents.has(i)) available.push(i);
  }

  // 防御性拦截：如果真没事件了直接结束游戏（新逻辑下理论不会触发）
  if (available.length === 0) {
    finishGame();
    return;
  }

  const idx = available[Math.floor(Math.random() * available.length)];
  state.usedEvents.add(idx);
  state.current = list[idx];
}

function startProfile() {
  state.profile = CHARACTERS[state.selected];
  state.stats   = JSON.parse(JSON.stringify(state.profile.stats));
  if (!state.collection.characters.includes(state.profile.id)) {
    state.collection.characters.push(state.profile.id);
    saveCollection();
  }
  state.scene = 'profile';
  addParticleBurst(particleSystem, 270, 300, 60);
}

function startGame() {
  state.scene    = 'game';
  state.step     = 0;
  state.result   = '';
  state.share    = '';
  state.toast    = '';
  state.history  = [];
  state.choosing = false;
  state.loading  = false;
  state.runId++;
  state.maxSteps = TOTAL_STEPS;

  state.usedEvents.clear();
  loadNextEvent(state.runId);
}

async function loadNextEvent(runId) {
  state.loading = true;
  state.choosing = true;
  state.toast = state.mode === 'api' ? '命运生成中……' : '离线剧情生成中……';
  if (state.mode === 'offline') {
    state.current = pickFallbackEvent();
    state.loading = false;
    state.choosing = false;
    state.toast = '';
    return;
  }
  try {
    const data = await postJson('/api/next', {
      role: state.profile.name,
      step: state.step + 1,
      stats: state.stats,
      history: apiHistory()
    });
    if (runId !== state.runId) return;
    state.current = normalizeApiEvent(data) || pickFallbackEvent();
    state.toast = '';
  } catch (_) {
    if (runId !== state.runId) return;
    state.current = pickFallbackEvent();
    state.toast = 'API 暂不可用，已使用本地剧情。';
  } finally {
    if (runId === state.runId) {
      state.loading = false;
      state.choosing = false;
    }
  }
}

function pickFallbackEvent() {
  pickRandomEvent();
  return state.current;
}

function toggleMode() {
  state.mode = state.mode === 'api' ? 'offline' : 'api';
  localStorage.setItem('lifeCrossroadsMode', state.mode);
  state.toast = state.mode === 'api' ? '已切换到 API 生成模式。' : '已切换到离线剧情模式。';

  if (state.scene === 'game' && state.loading) {
    state.runId++;
    state.current = pickFallbackEvent();
    state.loading = false;
    state.choosing = false;
  }
}

function choose(side) {
  if (state.choosing || state.loading || state.result) return;
  state.choosing = true;

  const e = state.current;
  let choiceText = '';
  if (side === 0) {
    state.result = e.ar;
    choiceText = e.a;
    applyDelta(e.da);
  } else {
    state.result = e.br;
    choiceText = e.b;
    applyDelta(e.db);
  }

  state.history.push({ story: e.text, choice: choiceText, result: state.result });
  addParticleBurst(particleSystem, random(100, 400), random(300, 700), 30);
  state.step++;
}

function continueGame() {
  if (!state.result) return;
  state.result = '';
  if (state.step >= state.maxSteps) {
    finishGame();
  } else {
    loadNextEvent(state.runId);
  }
}

function triggerEnding(ending) {
  state.ending = ending;
  addEndingToCollection(ending);
  state.scene    = 'ending';
  state.choosing = false;
  addParticleBurst(particleSystem, 270, 400, 120);
}

function applyDelta(delta) {
  for (let k in delta) {
    state.stats[k] = clamp(state.stats[k] + delta[k], 0, 100);
  }
}

async function finishGame() {
  state.scene = 'ending';
  state.ending = {
    title: state.mode === 'api' ? '命运生成中……' : '离线结局生成中……',
    desc: state.mode === 'api' ? 'AI 正在整理你的一分钟人生，请稍等。' : '本地命运池正在整理你的六步选择。'
  };
  state.share = '';
  const runId = state.runId;
  if (state.mode === 'offline') {
    state.ending = localEnding();
    state.share = `我在《一分钟人生岔路口》里活成了：${state.ending.title}`;
    addEndingToCollection(state.ending);
    state.choosing = false;
    addParticleBurst(particleSystem, 270, 400, 120);
    return;
  }
  try {
    const data = await postJson('/api/ending', {
      role: state.profile.name,
      stats: state.stats,
      history: apiHistory()
    });
    if (runId !== state.runId) return;
    state.ending = {
      title: String(data && data.title || '').slice(0, 24) || localEnding().title,
      desc: String(data && data.description || '').slice(0, 90) || localEnding().desc
    };
    state.share = String(data && data.shareText || `我在《一分钟人生岔路口》里活成了：${state.ending.title}`).slice(0, 100);
  } catch (_) {
    if (runId !== state.runId) return;
    state.ending = localEnding();
    state.share = `我在《一分钟人生岔路口》里活成了：${state.ending.title}`;
    state.toast = 'API 暂不可用，已使用本地结局。';
  }
  addEndingToCollection(state.ending);
  state.choosing = false;
  addParticleBurst(particleSystem, 270, 400, 120);
}

function localEnding() {
  const s           = state.stats;
  const role        = state.profile.id;
  const roleEndings = ENDINGS[role];

  let endingIndex = 0;

  if (s.money > 75) {
    endingIndex = 0;
  } else if (s.crazy > 75) {
    endingIndex = 2;
  } else if (s.mood > 70) {
    endingIndex = 1;
  } else {
    endingIndex = Math.floor(Math.random() * roleEndings.length);
  }

  endingIndex = Math.min(endingIndex, roleEndings.length - 1);

  return roleEndings[endingIndex];
}

function copyShare() {
  if (!state.share) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(state.share)
      .then(() => { state.toast = '分享文案已复制。'; })
      .catch(() => { state.toast = '复制失败，可以截图分享。'; });
  } else {
    state.toast = '浏览器不支持复制，可以截图分享。';
  }
}

/* =========================================
   点击事件
   ========================================= */
function hit(x, y) {
  for (let b of buttons) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      return b;
    }
  }
  return null;
}

let pointerStartY = 0;
let pointerMoved  = false;

canvas.addEventListener('pointerdown', e => {
  state.isDragging = true;
  state.lastY      = e.clientY;
  pointerStartY    = e.clientY;
  pointerMoved     = false;
});

canvas.addEventListener('pointermove', e => {
  if (!state.isDragging) return;
  if (state.scene !== 'select' && state.scene !== 'collection') return;
  const dy = e.clientY - state.lastY;
  if (Math.abs(e.clientY - pointerStartY) > 8) pointerMoved = true;
  state.scrollY  += dy;
  state.velocity  = dy;
  state.lastY     = e.clientY;
});

canvas.addEventListener('pointerup', e => {
  state.isDragging = false;
  if (pointerMoved) { pointerMoved = false; return; }

  const rect = canvas.getBoundingClientRect();
  const x    = (e.clientX - rect.left) * (LOGICAL_W / rect.width);
  const y    = (e.clientY - rect.top)  * (LOGICAL_H / rect.height);

  const btn = hit(x, y);
  if (!btn) return;

  if (btn.id === 'mode')         { toggleMode(); return; }
  if (btn.id.startsWith('char')) { state.selected = Number(btn.id.replace('char', '')); }
  if (btn.id === 'start')        { startProfile(); }
  if (btn.id === 'play')         { startGame(); }
  if (btn.id === 'a')            { choose(0); }
  if (btn.id === 'b')            { choose(1); }
  if (btn.id === 'continue')     { continueGame(); }
  if (btn.id === 'copy')         { copyShare(); }
  if (btn.id === 'restart')      { state.runId++; state.scene = 'select'; state.toast = ''; }
  if (btn.id === 'collection')   { state.scene = 'collection'; }
  if (btn.id === 'back')         { state.scene = 'select'; }
});

/* =========================================
   Resize
   ========================================= */
function resize() {
  particleCanvas.width  = window.innerWidth;
  particleCanvas.height = window.innerHeight;
  resizeParticleCanvas(particleSystem, window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);

/* =========================================
   主循环
   ========================================= */
function loop(t) {
  // 清除上次的全局影响，保护原版排版
  ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);

  drawBackground(t);

  if (state.scene === 'select')     drawSelect(t);
  if (state.scene === 'profile')    drawProfile();
  if (state.scene === 'game')       drawGame(t);
  if (state.scene === 'ending')     drawEnding();
  if (state.scene === 'collection') drawCollection();
  drawToast();

  updateParticles(particleSystem);
  drawParticles(pCtx, particleSystem);
  requestAnimationFrame(loop);
}

/* =========================================
   INIT
   ========================================= */

/* =========================================
   背景音乐
   ========================================= */
const bgm = document.getElementById('bgm');
let bgmStarted = false;

function removeBGMListeners() {
  canvas.removeEventListener('pointerdown', startBGM);
  window.removeEventListener('click', startBGM);
  window.removeEventListener('touchstart', startBGM);
}

function startBGM() {
  if (!bgm || bgmStarted) return;
  bgm.volume = 0.45;
  bgm.muted = false;
  bgm.play()
    .then(() => {
      bgmStarted = true;
      removeBGMListeners();
    })
    .catch(err => {
      console.log('BGM autoplay blocked, will retry on next tap:', err);
    });
}

if (bgm) {
  bgm.volume = 0.45;
  bgm.load();
  canvas.addEventListener('pointerdown', startBGM, { passive: true });
  window.addEventListener('click', startBGM, { passive: true });
  window.addEventListener('touchstart', startBGM, { passive: true });
}
loadCollection();
initParticleSystem(window.innerWidth, window.innerHeight);
resize();
requestAnimationFrame(loop);
