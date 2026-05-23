export let particleSystem = null;

/* =========================================
   INIT
========================================= */

export function initParticleSystem(w,h){

  particleSystem = {

    width:w,
    height:h,

    particles:[],

    stars:[],

    trails:[]
  };

  /* 星空 */

  for(let i=0;i<140;i++){

    particleSystem.stars.push({

      x:Math.random()*w,

      y:Math.random()*h,

      r:Math.random()*2.2,

      alpha:Math.random(),

      speed:.1+Math.random()*.35
    });
  }

  return particleSystem;
}

/* =========================================
   爆炸粒子
========================================= */

export function addParticleBurst(
  sys,
  x,
  y,
  count,
  color='#00d0ff'
){

  if(!sys)return;

  for(let i=0;i<count;i++){

    sys.particles.push({

      x,
      y,

      vx:(Math.random()-.5)*8,

      vy:(Math.random()-.5)*8,

      size:2+Math.random()*5,

      life:1,

      decay:.012+Math.random()*.02,

      color
    });

  }

}

/* =========================================
   尾迹
========================================= */

export function addTrail(sys,x,y,color){

  if(!sys)return;

  sys.trails.push({

    x,
    y,

    life:.8,

    size:8+Math.random()*12,

    color
  });
}

/* =========================================
   UPDATE
========================================= */

export function updateParticles(sys){

  if(!sys)return;

  /* 粒子 */

  for(let i=sys.particles.length-1;i>=0;i--){

    const p=sys.particles[i];

    p.x+=p.vx;

    p.y+=p.vy;

    p.life-=p.decay;

    p.vy+=.03;

    if(p.life<=0){

      sys.particles.splice(i,1);
    }
  }

  /* 尾迹 */

  for(let i=sys.trails.length-1;i>=0;i--){

    const t=sys.trails[i];

    t.life-=.03;

    if(t.life<=0){

      sys.trails.splice(i,1);
    }
  }

  /* 星空 */

  for(const s of sys.stars){

    s.y+=s.speed;

    if(s.y>sys.height){

      s.y=0;

      s.x=Math.random()*sys.width;
    }
  }

}

/* =========================================
   DRAW
========================================= */

export function drawParticles(ctx,sys){

  if(!ctx||!sys)return;

  ctx.clearRect(
    0,
    0,
    sys.width,
    sys.height
  );

  /* 星空 */

  for(const s of sys.stars){

    ctx.globalAlpha=s.alpha;

    ctx.fillStyle='white';

    ctx.beginPath();

    ctx.arc(
      s.x,
      s.y,
      s.r,
      0,
      Math.PI*2
    );

    ctx.fill();
  }

  /* 流星 */

  if(Math.random()<.01){

    const x=Math.random()*sys.width;

    const y=-20;

    sys.particles.push({

      x,
      y,

      vx:-6,

      vy:8,

      size:3,

      life:1,

      decay:.008,

      color:'#ffffff'
    });
  }

  /* 尾迹 */

  for(const t of sys.trails){

    ctx.globalAlpha=t.life*.35;

    ctx.shadowBlur=25;

    ctx.shadowColor=t.color;

    ctx.fillStyle=t.color;

    ctx.beginPath();

    ctx.arc(
      t.x,
      t.y,
      t.size*t.life,
      0,
      Math.PI*2
    );

    ctx.fill();
  }

  /* 粒子 */

  for(const p of sys.particles){

    ctx.globalAlpha=p.life;

    ctx.shadowBlur=22;

    ctx.shadowColor=p.color;

    ctx.fillStyle=p.color;

    ctx.beginPath();

    ctx.arc(
      p.x,
      p.y,
      p.size*p.life,
      0,
      Math.PI*2
    );

    ctx.fill();
  }

  ctx.globalAlpha=1;

  ctx.shadowBlur=0;
}

/* =========================================
   RESIZE
========================================= */

export function resizeParticleCanvas(
  sys,
  w,
  h
){

  if(!sys)return;

  sys.width=w;

  sys.height=h;
}