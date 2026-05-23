import {
  initParticleSystem,
  addParticleBurst,
  addTrail,
  updateParticles,
  drawParticles,
  resizeParticleCanvas,
  particleSystem
} from './particles.js';

/* =========================================
   CYBER LIFE SIMULATOR
========================================= */

const LOGICAL_W = 540;
const LOGICAL_H = 960;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const particleCanvas =
  document.getElementById('particle-canvas');

const pCtx =
  particleCanvas.getContext('2d');

/* =========================================
   字体
========================================= */

const FONT_TITLE =
  '900 42px Orbitron';

const FONT_BIG =
  '700 30px Rajdhani';

const FONT_TEXT =
  '600 22px Rajdhani';

const FONT_SMALL =
  '600 16px Rajdhani';

/* =========================================
   工具
========================================= */

function clamp(v,a,b){
  return Math.max(a,Math.min(b,v));
}

function random(a,b){
  return Math.random()*(b-a)+a;
}

function roundRect(x,y,w,h,r){

  ctx.beginPath();

  ctx.moveTo(x+r,y);

  ctx.lineTo(x+w-r,y);

  ctx.quadraticCurveTo(x+w,y,x+w,y+r);

  ctx.lineTo(x+w,y+h-r);

  ctx.quadraticCurveTo(
    x+w,
    y+h,
    x+w-r,
    y+h
  );

  ctx.lineTo(x+r,y+h);

  ctx.quadraticCurveTo(
    x,
    y+h,
    x,
    y+h-r
  );

  ctx.lineTo(x,y+r);

  ctx.quadraticCurveTo(
    x,
    y,
    x+r,
    y
  );

  ctx.closePath();
}

function splitText(text,maxWidth){

  const lines=[];

  let current='';

  for(let c of text){

    const test=current+c;

    if(
      ctx.measureText(test).width>
      maxWidth
    ){
      lines.push(current);
      current=c;
    }else{
      current=test;
    }
  }

  if(current)lines.push(current);

  return lines;
}

/* =========================================
   角色系统
========================================= */


const CHARACTERS = [

  {
    id:'cat',

    name:'流浪猫',

    title:'Street Cat',

    color:'#ffb703',

    avatar:'🐈',

    desc:
      '你最大的梦想是晒太阳和不被驱赶。',

    stats:{
      mood:80,
      money:10,
      luck:60,
      crazy:40
    }
  },

  {
    id:'student',

    name:'大学生',

    title:'Deadline Survivor',

    color:'#00d0ff',

    avatar:'🎓',

    desc:
      '你在DDL和早八之间挣扎求生。',

    stats:{
      mood:55,
      money:25,
      luck:55,
      crazy:50
    }
  },

  {
    id:'worker',

    name:'社畜',

    title:'Corporate Slave',

    color:'#ff4ecd',

    avatar:'💼',

    desc:
      '你每天都在等下班通知。',

    stats:{
      mood:35,
      money:65,
      luck:35,
      crazy:70
    }
  },

  {
    id:'founder',

    name:'创业者',

    title:'Dream Chaser',

    color:'#00ff99',

    avatar:'🚀',

    desc:
      '你坚信下一个风口属于自己。',

    stats:{
      mood:60,
      money:45,
      luck:70,
      crazy:65
    }
  },

  {
    id:'alien',

    name:'外星人',

    title:'Unknown Visitor',

    color:'#9b5cff',

    avatar:'👽',

    desc:
      '你假装自己是普通地球人。',

    stats:{
      mood:50,
      money:50,
      luck:90,
      crazy:90
    }
  }

];

/* =========================================
   事件
========================================= */

const EVENTS = [

  {
    text:'你半夜刷视频时突然看到“7天财富自由训练营”。',

    a:'立刻报名',

    b:'继续摆烂',

    da:{
      money:-10,
      crazy:8
    },

    db:{
      mood:5
    },

    ar:'你开始被成功学洗脑。',
    br:'你继续躺平刷短视频。'
  },

  {
    text:'你的朋友突然想拉你一起开奶茶店。',

    a:'激情创业',

    b:'婉拒',

    da:{
      money:-25,
      mood:10,
      crazy:15
    },

    db:{
      money:5,
      mood:-3
    },

    ar:'你们开始通宵研究logo。',
    br:'你成功保住积蓄。'
  },

  {
    text:'AI突然学会了你的说话方式。',

    a:'继续训练AI',

    b:'立刻断网',

    da:{
      money:10,
      crazy:20
    },

    db:{
      mood:5,
      luck:-5
    },

    ar:'AI开始替你回复消息。',
    br:'你避免了电子人格觉醒。'
  },

  {
    text:'老板凌晨两点给你发消息：“在吗？”',

    a:'秒回',

    b:'装死',

    da:{
      money:10,
      mood:-15,
      crazy:10
    },

    db:{
      mood:10,
      money:-5
    },

    ar:'你获得“优秀员工”称号。',
    br:'老板开始怀疑你。'
  },

  {
    text:'你的彩票差一个数字就中大奖。',

    a:'继续买',

    b:'彻底戒赌',

    da:{
      money:-15,
      crazy:12,
      luck:5
    },

    db:{
      mood:-5,
      luck:-3
    },

    ar:'你坚信下一次必中。',
    br:'你终于恢复理智。'
  },

  {
    text:'有人邀请你测试神秘脑机接口。',

    a:'直接连接',

    b:'拒绝实验',

    da:{
      crazy:25,
      mood:8,
      luck:10
    },

    db:{
      mood:-2
    },

    ar:'你开始听见WiFi声音。',
    br:'你保住了大脑。'
  },

  {
    text:'你的猫突然开始会说话。',

    a:'认真交流',

    b:'假装没听见',

    da:{
      crazy:18,
      mood:15
    },

    db:{
      mood:-5
    },

    ar:'猫要求增加罐头预算。',
    br:'你怀疑自己熬夜过度。'
  }

];

/* =========================================
   结局
========================================= */

/* =========================================
   结局
========================================= */

const ENDINGS = [

  {
    title:'宇宙首富',
    desc:'你成功财富自由，甚至买下了月球别墅。'
  },

  {
    title:'数字幽灵',
    desc:'互联网仍在自动发布你的动态。'
  },

  {
    title:'稳定人生',
    desc:'你终于学会按时睡觉。'
  },

  {
    title:'彻底疯狂',
    desc:'你开始和冰箱聊天。'
  },

  {
    title:'神秘失踪',
    desc:'没人知道你去了哪里。'
  },

  {
    title:'流浪传奇',
    desc:'你的故事在街头广为流传。'
  },

  {
    title:'创业失败',
    desc:'你现在欠了三十年的贷款。'
  },

  {
    title:'地球观察员',
    desc:'你决定返回母星提交观察报告。'
  }

];

/* =========================================
   状态
========================================= */

const state = {
    scrollY:0,
    velocity:0,
    isDragging:false,
    lastY:0,
    scene:'select',

    selected:0,

    step:0,
    typingText:'',
    typingIndex:0,
    shake:0,
    transition:0,
    collection:{
      endings:[],
      characters:[]
    },
    stats:{
        mood:50,
        money:50,
        luck:50,
        crazy:50
    },

  current:null,

  result:'',

  ending:null,

  profile:null
};

let buttons=[];

/* =========================================
   存档系统
========================================= */

function saveCollection(){

  localStorage.setItem(
    'cyberLifeCollection',
    JSON.stringify(state.collection)
  );
}

function loadCollection(){

  const data =
    localStorage.getItem(
      'cyberLifeCollection'
    );

  if(data){

    try{

      state.collection =
        JSON.parse(data);

    }catch(e){

      console.log(e);
    }
  }
}

/* =========================================
   UI
========================================= */

function drawBackground(t){

  const bg =
    ctx.createLinearGradient(
      0,
      0,
      0,
      LOGICAL_H
    );

  bg.addColorStop(0,'#0f172a');
  bg.addColorStop(1,'#020617');

  ctx.fillStyle=bg;

  ctx.fillRect(
    0,
    0,
    LOGICAL_W,
    LOGICAL_H
  );

  for(let i=0;i<5;i++){

    const x =
      100+
      Math.sin(t*.0004+i)*160;

    const y =
      200+
      Math.cos(t*.0006+i)*220;

    const r=120;

    const g =
      ctx.createRadialGradient(
        x,
        y,
        0,
        x,
        y,
        r
      );

    g.addColorStop(
      0,
      `rgba(${i%2?255:0},180,255,.12)`
    );

    g.addColorStop(1,'transparent');

    ctx.fillStyle=g;

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      r,
      0,
      Math.PI*2
    );

    ctx.fill();
  }

}

function drawTitle(){

  const grad =
    ctx.createLinearGradient(
      100,
      0,
      400,
      0
    );

  grad.addColorStop(0,'#00d0ff');
  grad.addColorStop(.5,'white');
  grad.addColorStop(1,'#ff4ecd');

  ctx.fillStyle=grad;

  ctx.shadowBlur=20;

  ctx.shadowColor='#00d0ff';

  ctx.font=FONT_TITLE;

  ctx.fillText(
    'CYBER LIFE',
    90,
    100
  );

  ctx.shadowBlur=0;
}

function drawCard(x,y,w,h,color){

  ctx.save();

  const grad =
    ctx.createLinearGradient(
      x,
      y,
      x,
      y+h
    );

  grad.addColorStop(
    0,
    'rgba(255,255,255,.08)'
  );

  grad.addColorStop(
    1,
    'rgba(255,255,255,.02)'
  );

  ctx.fillStyle=grad;

  ctx.strokeStyle=
    'rgba(255,255,255,.08)';

  ctx.lineWidth=1.2;

  ctx.shadowBlur=20;

  ctx.shadowColor=color;

  roundRect(x,y,w,h,28);

  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawButton(
  x,
  y,
  w,
  h,
  text,
  color
){

  ctx.save();

  const grad =
    ctx.createLinearGradient(
      x,
      y,
      x,
      y+h
    );

  grad.addColorStop(0,color);
  grad.addColorStop(1,'#111827');

  ctx.fillStyle=grad;

  ctx.shadowBlur=20;

  ctx.shadowColor=color;

  roundRect(x,y,w,h,22);

  ctx.fill();

  ctx.fillStyle='white';

  ctx.font='700 20px Rajdhani';

  ctx.textAlign='center';

  ctx.textBaseline='middle';

  ctx.fillText(
    text,
    x+w/2,
    y+h/2
  );

  ctx.restore();
}

/* =========================================
   角色选择
========================================= */

function drawSelect(t){

  buttons=[];

  drawTitle();

  ctx.fillStyle='rgba(255,255,255,.6)';

  ctx.font=FONT_TEXT;

  ctx.fillText(
    '选择你的人生身份',
    120,
    160
  );

  CHARACTERS.forEach((c,i)=>{

    const baseY = 190 + i * 145;
    const y = baseY + state.scrollY;

    const selected=
      state.selected===i;

    drawCard(
      50,
      y,
      440,
      120,
      c.color
    );

    if(selected){

      ctx.strokeStyle=c.color;

      ctx.lineWidth=3;

      roundRect(
        50,
        y,
        440,
        160,
        28
      );

      ctx.stroke();
    }

    ctx.fillStyle=c.color;

    ctx.font='900 52px Orbitron';

    ctx.fillText(
      c.avatar,
      80,
      y+95
    );

    ctx.fillStyle='white';

    ctx.font=FONT_BIG;

    ctx.fillText(
      c.name,
      160,
      y+58
    );

    ctx.font=FONT_SMALL;

    ctx.fillStyle=
      'rgba(255,255,255,.7)';

    ctx.fillText(
      c.title,
      160,
      y+88
    );

    const lines=
      splitText(c.desc,260);

    lines.forEach((line,k)=>{

      ctx.fillText(
        line,
        160,
        y+120+k*22
      );

    });

    buttons.push({
      id:'char'+i,
      x:50,
      y,
      w:440,
      h:120
    });
  });
  const startY = 920 + state.scrollY;
  const collectionY = 1005 + state.scrollY;
  drawButton(
    140,
    startY,
    260,
    60,
    '进入人生',
    CHARACTERS[state.selected].color
  );

  drawButton(
    140,
    collectionY,
    260,
    50,
    '人生图鉴',
    '#ff4ecd'
  );

  buttons.push({
    id:'collection',
    x:140,
    y:collectionY,
    w:260,
    h:50
  });

  buttons.push({
    id:'start',
    x:140,
    y:startY,
    w:260,
    h:60
  });

  const maxScroll = 0;
  const minScroll = -((CHARACTERS.length - 3) * 145);

  state.scrollY += state.velocity;
  state.velocity *= 0.92;

  if(state.scrollY > maxScroll){
    state.scrollY *= 0.2;
    state.velocity = 0;
  }

  if(state.scrollY < minScroll){
    state.scrollY += (minScroll - state.scrollY) * 0.2;
    state.velocity = 0;
  }
}

/* =========================================
   开局档案
========================================= */

function drawProfile(){

  const c = state.profile;

  drawTitle();

  drawCard(
    50,
    220,
    440,
    420,
    c.color
  );

  ctx.fillStyle=c.color;

  ctx.font='900 100px Orbitron';

  ctx.fillText(
    c.avatar,
    200,
    360
  );

  ctx.fillStyle='white';

  ctx.font='700 36px Rajdhani';

  ctx.fillText(
    c.name,
    150,
    450
  );

  ctx.font=FONT_TEXT;

  ctx.fillStyle=
    'rgba(255,255,255,.75)';

  ctx.fillText(
    c.title,
    170,
    490
  );

  const stats = [

    ['心态',c.stats.mood],
    ['财富',c.stats.money],
    ['运气',c.stats.luck],
    ['离谱',c.stats.crazy]

  ];

  stats.forEach((s,i)=>{

    const y=560+i*42;

    ctx.fillStyle='white';

    ctx.fillText(
      `${s[0]} ${s[1]}`,
      100,
      y
    );

  });

  drawButton(
    150,
    760,
    240,
    70,
    '开始人生',
    c.color
  );

  buttons=[{
    id:'play',
    x:150,
    y:760,
    w:240,
    h:70
  }];
}

/* =========================================
   游戏
========================================= */

function drawStats(){

  const keys=[
    ['心态','mood'],
    ['财富','money'],
    ['运气','luck'],
    ['离谱','crazy']
  ];

  keys.forEach((k,i)=>{

    const x=40;

    const y=70+i*38;

    ctx.fillStyle=
      'rgba(255,255,255,.08)';

    roundRect(
      x,
      y,
      180,
      14,
      7
    );

    ctx.fill();

    ctx.fillStyle=
      state.profile.color;

    roundRect(
      x,
      y,
      180*
      (state.stats[k[1]]/100),
      14,
      7
    );

    ctx.fill();

    ctx.fillStyle='white';

    ctx.font=FONT_SMALL;

    ctx.fillText(
      `${k[0]} ${state.stats[k[1]]}`,
      x,
      y-6
    );
  });

}

function drawGame(t){

  buttons=[];

  drawStats();

  const event = state.current;

  drawCard(
    40,
    260,
    460,
    260,
    state.profile.color
  );

  ctx.fillStyle='white';

  ctx.font=FONT_TEXT;

  const lines=
    splitText(event.text,360);

  lines.forEach((line,i)=>{

    ctx.fillText(
      line,
      80,
      340+i*38
    );

  });

  drawButton(
    70,
    640,
    180,
    90,
    event.a,
    state.profile.color
  );

  drawButton(
    290,
    640,
    180,
    90,
    event.b,
    '#374151'
  );

  buttons.push({
    id:'a',
    x:70,
    y:640,
    w:180,
    h:90
  });

  buttons.push({
    id:'b',
    x:290,
    y:640,
    w:180,
    h:90
  });

  if(state.result){

    drawCard(
      50,
      780,
      440,
      90,
      '#ffd166'
    );

    ctx.fillStyle='#ffd166';

    ctx.fillText(
      state.result,
      80,
      835
    );
  }

}

/* =========================================
   结局
========================================= */

function drawEnding(){

  drawTitle();

  drawCard(
    60,
    240,
    420,
    320,
    state.profile.color
  );

  ctx.fillStyle=
    state.profile.color;

  ctx.font='900 70px Orbitron';

  ctx.fillText(
    state.profile.avatar,
    210,
    340
  );

  ctx.fillStyle='white';

  ctx.font='700 36px Rajdhani';

  ctx.fillText(
    state.ending.title,
    130,
    430
  );

  ctx.font=FONT_TEXT;

  ctx.fillText(
    state.ending.desc,
    100,
    500
  );

  drawButton(
    140,
    760,
    260,
    70,
    '重新开始',
    state.profile.color
  );

  buttons=[{
    id:'restart',
    x:140,
    y:760,
    w:260,
    h:70
  }];
}

/* =========================================
   图鉴界面
========================================= */

function drawCollection(){
  console.log("进入图鉴界面");
  buttons=[];

  drawTitle();

  ctx.fillStyle='white';

  ctx.font=FONT_BIG;

  ctx.fillText(
    '人生图鉴 COLLECTION',
    90,
    150
  );

  /* =========================
     角色图鉴
  ========================= */

  ctx.font=FONT_TEXT;

  ctx.fillStyle='#00d0ff';

  CHARACTERS.forEach((c,i)=>{

    const unlocked =
      state.collection.characters
      .includes(c.id);

    const x=60+(i%2)*220;

    const y = 250 + Math.floor(i/2)*130 + state.scrollY;

    drawCard(
      x,
      y,
      180,
      100,
      unlocked
        ? c.color
        : '#374151'
    );

    ctx.globalAlpha=
      unlocked ? 1 : .3;

    ctx.font='50px Orbitron';

    ctx.fillStyle='white';

    ctx.fillText(
      unlocked ? c.avatar : '?',
      x+20,
      y+65
    );

    ctx.font=FONT_SMALL;

    ctx.fillText(
      unlocked
        ? c.name
        : '未解锁',
      x+80,
      y+60
    );

    ctx.globalAlpha=1;
  });

  /* =========================
     结局图鉴
  ========================= */

  ctx.fillStyle='#ff4ecd';

  ctx.font=FONT_TEXT;

  ENDINGS.forEach((e,i)=>{

    const unlocked =
      state.collection.endings
      .includes(e.title);

    const y = 600 + i * 70 + state.scrollY;

    drawCard(
      60,
      y,
      420,
      55,
      unlocked
        ? '#ff4ecd'
        : '#374151'
    );

    ctx.fillStyle='white';

    ctx.font=FONT_SMALL;

    ctx.fillText(
      unlocked
        ? e.title
        : '？？？？',
      90,
      y+35
    );
  });

  drawButton(
    140,
    880,
    260,
    60,
    '返回',
    '#00d0ff'
  );

  buttons.push({
    id:'back',
    x:140,
    y:880,
    w:260,
    h:60
  });
}

/* =========================================
   游戏逻辑
========================================= */

function startProfile(){

  state.profile =
    CHARACTERS[state.selected];

  state.stats =
    JSON.parse(
      JSON.stringify(
        state.profile.stats
      )
    );

  if(!state.collection.characters.includes(state.profile.id))
  {
    state.collection.characters.push(state.profile.id);
    saveCollection();
  }

  state.scene='profile';

  addParticleBurst(
    particleSystem,
    270,
    300,
    60
  );
}

function startGame(){

  state.scene='game';

  state.step=0;

  state.current=EVENTS[0];
}

function choose(side){

  const e=state.current;

  if(side===0){

    state.result=e.ar;

    applyDelta(e.da);

  }else{

    state.result=e.br;

    applyDelta(e.db);
  }

  addParticleBurst(
    particleSystem,
    random(100,400),
    random(300,700),
    30
  );

  /* =========================
     突发死亡/提前结束
  ========================= */

  const s=state.stats;

  if(s.crazy>=100){

    state.ending=ENDINGS[3];

    state.scene='ending';

    return;
  }

  if(s.money<=0){

    state.ending=ENDINGS[5];

    state.scene='ending';

    return;
  }

  if(s.mood<=0){

    state.ending=ENDINGS[4];

    state.scene='ending';

    return;
  }

  if(Math.random()<0.12){

    const randomEnding=[
      ENDINGS[1],
      ENDINGS[4],
      ENDINGS[6]
    ];

    state.ending=
      randomEnding[
        Math.floor(
          Math.random()*
          randomEnding.length
        )
      ];

    state.scene='ending';

    return;
  }

  state.step++;

  /* =========================
     不固定轮数
  ========================= */

  if(state.step>=6+Math.floor(Math.random()*4)){

    setTimeout(()=>{
      finishGame();
    },1000);

  }else{

    setTimeout(()=>{

      state.current=
        EVENTS[
          Math.floor(
            Math.random()*EVENTS.length
          )
        ];

      state.result='';

    },1000);
  }
}

function applyDelta(delta){

  for(let k in delta){

    state.stats[k]=
      clamp(
        state.stats[k]+delta[k],
        0,
        100
      );
  }
}

function finishGame(){

  state.scene='ending';

  const s=state.stats;

  if(
    state.profile.id==='alien'
    &&
    s.crazy>85
  ){

    state.ending=ENDINGS[7];

  }else if(
    s.money>85
  ){

    state.ending=ENDINGS[0];

  }else if(
    s.crazy>80
  ){

    state.ending=ENDINGS[1];

  }else if(
    s.mood>75
  ){

    state.ending=ENDINGS[2];

  }else if(
    s.money<20
  ){

    state.ending=ENDINGS[6];

  }else{

    state.ending=
      ENDINGS[
        Math.floor(
          Math.random()*ENDINGS.length
        )
      ];
  }
  if(!state.collection.endings.includes(state.ending.title))
  {
    state.collection.endings.push(state.ending.title);
    saveCollection();
  }
  addParticleBurst(
    particleSystem,
    270,
    400,
    120
  );
}

/* =========================================
   点击
========================================= */

function hit(x,y){
  if(state.isDragging) return;
  for(let b of buttons){

    if(
      x>=b.x &&
      x<=b.x+b.w &&
      y>=b.y &&
      y<=b.y+b.h
    ){
      return b;
    }
  }

  return null;
}

canvas.addEventListener(
  'pointerdown',
  e=>{

    const rect=
      canvas.getBoundingClientRect();

    const x=
      (e.clientX-rect.left)*
      (LOGICAL_W/rect.width);

    const y=
      (e.clientY-rect.top)*
      (LOGICAL_H/rect.height);

    if(state.scene === 'select' && Math.abs(state.velocity) > 5){
      return;
    }

    
    const btn=hit(x,y);

    if(!btn)return;

    if(btn.id.startsWith('char')){

      state.selected=
        Number(
          btn.id.replace(
            'char',
            ''
          )
        );
    }

    if(btn.id==='start'){
      startProfile();
    }

    if(btn.id==='play'){
      startGame();
    }

    if(btn.id==='a'){
      choose(0);
    }

    if(btn.id==='b'){
      choose(1);
    }

    if(btn.id==='restart'){

      state.scene='select';
    }

    if(btn.id==='collection'){
      state.scene='collection';
    }

    if(btn.id==='back'){
      state.scene='select';
    }
  }
);

canvas.addEventListener('pointerdown', (e)=>{
  state.isDragging = true;
  state.lastY = e.clientY;
});

canvas.addEventListener('pointermove', (e)=>{
  if(!state.isDragging) return;
  if(state.scene !== 'select' && state.scene !== 'collection') return;
  const dy = e.clientY - state.lastY;

  state.scrollY += dy;
  state.velocity = dy;

  state.lastY = e.clientY;
});

canvas.addEventListener('pointerup', ()=>{
  state.isDragging = false;
});

/* =========================================
   Resize
========================================= */

function resize(){

  particleCanvas.width=
    window.innerWidth;

  particleCanvas.height=
    window.innerHeight;

  resizeParticleCanvas(
    particleSystem,
    window.innerWidth,
    window.innerHeight
  );
}

window.addEventListener(
  'resize',
  resize
);

/* =========================================
   主循环
========================================= */

function loop(t){

  drawBackground(t);

  if(state.scene==='select'){
    drawSelect(t);
  }

  if(state.scene==='profile'){
    drawProfile();
  }

  if(state.scene==='game'){
    drawGame(t);
  }

  if(state.scene==='ending'){
    drawEnding();
  }

  if(state.scene==='collection'){
    drawCollection();
  }

  updateParticles(
    particleSystem
  );

  drawParticles(
    pCtx,
    particleSystem
  );

  requestAnimationFrame(loop);
}

/* =========================================
   INIT
========================================= */

loadCollection();

initParticleSystem(
  window.innerWidth,
  window.innerHeight
);

resize();

requestAnimationFrame(loop);