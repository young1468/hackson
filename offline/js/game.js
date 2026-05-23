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
    id:'coder',

    name:'落魄程序员',

    title:'Code Runner',

    color:'#00d0ff',

    avatar:'⌘',

    desc:
      '你长期熬夜，依靠咖啡和Bug生存。',

    stats:{
      mood:45,
      money:70,
      luck:40,
      crazy:65
    }
  },

  {
    id:'streamer',

    name:'虚拟主播',

    title:'Virtual Idol',

    color:'#ff4ecd',

    avatar:'◉',

    desc:
      '你活在镜头和算法推荐里。',

    stats:{
      mood:65,
      money:45,
      luck:70,
      crazy:55
    }
  },

  {
    id:'hacker',

    name:'朋克黑客',

    title:'Ghost Hacker',

    color:'#00ff99',

    avatar:'⚡',

    desc:
      '你相信一切系统都能被破解。',

    stats:{
      mood:50,
      money:40,
      luck:80,
      crazy:75
    }
  }

];

/* =========================================
   事件
========================================= */

const EVENTS = [

  {
    text:'凌晨三点，你收到神秘高薪工作邀请。',

    a:'立即接单',

    b:'怀疑诈骗',

    da:{
      money:20,
      crazy:10,
      luck:5
    },

    db:{
      mood:-5,
      luck:-3
    },

    ar:'你接到了危险项目。',
    br:'你安全了，但也错过机会。'
  },

  {
    text:'AI突然开始模仿你的语气。',

    a:'继续训练',

    b:'立刻关闭',

    da:{
      money:10,
      crazy:15
    },

    db:{
      mood:5,
      luck:-5
    },

    ar:'AI学会了阴阳怪气。',
    br:'你避免了数字灾难。'
  },

  {
    text:'朋友邀请你投资元宇宙奶茶店。',

    a:'ALL IN',

    b:'冷静拒绝',

    da:{
      money:-20,
      mood:15,
      crazy:12
    },

    db:{
      money:5,
      mood:-4
    },

    ar:'你成为第一批受害者。',
    br:'你保住了存款。'
  }

];

/* =========================================
   结局
========================================= */

const ENDINGS = [

  {
    title:'赛博传奇',
    desc:'你成为了都市传说。'
  },

  {
    title:'数字幽灵',
    desc:'互联网仍然残留你的痕迹。'
  },

  {
    title:'普通人类',
    desc:'你成功活成了稳定的大人。'
  }

];

/* =========================================
   状态
========================================= */

const state = {

    scene:'select',

    selected:0,

    step:0,
    typingText:'',
    typingIndex:0,
    shake:0,
    transition:0,
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

    const y=220+i*200;

    const selected=
      state.selected===i;

    drawCard(
      50,
      y,
      440,
      160,
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
      h:160
    });
  });

  drawButton(
    140,
    860,
    260,
    60,
    '进入人生',
    CHARACTERS[state.selected].color
  );

  buttons.push({
    id:'start',
    x:140,
    y:860,
    w:260,
    h:60
  });
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

  state.step++;

  if(state.step>=EVENTS.length){

    setTimeout(()=>{
      finishGame();
    },1000);

  }else{

    setTimeout(()=>{

      state.current=
        EVENTS[state.step];

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

  if(state.stats.crazy>80){

    state.ending=ENDINGS[1];

  }else if(state.stats.money>70){

    state.ending=ENDINGS[0];

  }else{

    state.ending=ENDINGS[2];
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

  }
);

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

initParticleSystem(
  window.innerWidth,
  window.innerHeight
);

resize();

requestAnimationFrame(loop);