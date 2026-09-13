'use strict';
// Build modifiers are derived from bounded card ranks; switching weapons retains the build.
function rank(id,s=state){return s?.build?.[id]||0}
function skillCooldown(s=state){return ROLES[s.role].cd*[1,.8,.65,.5][rank('tactics',s)]}
function meleeStats(s=state){const m=MELEES[s.melee],r=rank('blade',s);return {...m,range:m.range*[1,1.35,1.6,1.9][r],damage:m.damage*(1+r*.5),full:r>=2,cd:m.cd*[1,.9,.8,.7][rank('tactics',s)]}}
function reloadDuration(gun,s=state){return GUNS[gun].reload*[1,.8,.65,.5][rank('rapid',s)]}
function gunMultiplier(s=state){return 1+rank('pierce',s)*.18}
function skillRadius(base,s=state){return base*(1+rank('awaken',s)*.25)}
function skillPower(s=state){return 1+rank('awaken',s)*.5}
const UPGRADE_CARDS=[
 {id:'multishot',name:'多重射击',icon:'⋔',kind:'火力',rarity:'epic',max:3,mechanic:true,desc:n=>`每次追加 2 路侧向弹，侧弹伤害 ${[0,65,90,115][n]}%。主弹伤害保持不变。`,benefit:n=>`侧弹 ${n===1?'无 → 2 路':[0,0,65,90][n]+'% → '+[0,65,90,115][n]+'%'}`},
 {id:'pierce',name:'穿甲洪流',icon:'➶',kind:'火力',rarity:'rare',max:3,desc:n=>`子弹额外穿透 ${n*2} 个目标，枪械伤害提高 ${n*18}%。`,benefit:n=>`额外穿透 +${(n-1)*2} → +${n*2}`},
 {id:'chain',name:'连锁电击',icon:'ϟ',kind:'元素',rarity:'epic',max:3,mechanic:true,desc:n=>`枪弹命中后，电击附近 ${n+1} 个目标，造成 ${50+n*15}% 子弹伤害。每 0.18 秒可触发。`,benefit:n=>`连锁目标 ${n===1?0:n} → ${n+1}`},
 {id:'blast',name:'尸群引爆',icon:'✹',kind:'清场',rarity:'epic',max:3,mechanic:true,desc:n=>`直接击杀引发范围爆炸，造成 ${40+n*40} 点基础伤害，爆炸范围随等级扩大。`,benefit:n=>`爆炸伤害 ${n===1?0:40+(n-1)*40} → ${40+n*40}`},
 {id:'frost',name:'极寒弹药',icon:'❄',kind:'控制',rarity:'rare',max:3,mechanic:true,desc:n=>`枪弹令目标减速 ${20+n*15}%，持续 2 秒。受寒目标带有冰蓝标记。`,benefit:n=>`减速 ${n===1?0:20+(n-1)*15}% → ${20+n*15}%`},
 {id:'blade',name:'剑刃风暴',icon:'╳',kind:'近战',rarity:'epic',max:3,mechanic:true,desc:n=>`近战范围 +${[0,35,60,90][n]}%，伤害 +${n*50}%。${n>=2?'升级为全周回旋斩。':'下一级解锁全周回旋斩。'}`,benefit:n=>n===2?'前方扇形 → 360° 回旋斩':`近战范围 +${[0,0,35,60][n]}% → +${[0,35,60,90][n]}%`},
 {id:'tactics',name:'战术循环',icon:'↻',kind:'技能',rarity:'rare',max:3,desc:n=>`技能冷却 -${[0,20,35,50][n]}%，近战冷却 -${n*10}%。选择后两者立即就绪。`,benefit:n=>`技能冷却 ${Math.round(ROLES[state.role].cd*[1,.8,.65,.5][n-1]*10)/10}s → ${Math.round(ROLES[state.role].cd*[1,.8,.65,.5][n]*10)/10}s`,apply:s=>{s.skillCd=0;s.meleeCd=0}},
 {id:'awaken',name:'专属觉醒',icon:'◈',kind:'角色',rarity:'epic',max:2,mechanic:true,desc:(n,s)=>s.role===0?`超载延长至 ${5+3*n} 秒，超载期间枪弹伤害 +${n*30}%。`:`${s.role===1?'震荡':'净化'}范围 +${n*25}%，伤害 +${n*50}%。${s.role===2?'治疗量提升至 '+(50+n*30)+'。':''}`,benefit:(n,s)=>s.role===0?`超载 ${5+3*(n-1)}s → ${5+3*n}s`:`技能伤害 ×${1+(n-1)*.5} → ×${1+n*.5}`},
 {id:'rapid',name:'疾速供弹',icon:'»',kind:'火力',rarity:'rare',max:3,desc:n=>`枪械射速提高 ${n*30}%，换弹时间缩短 ${[0,20,35,50][n]}%。`,benefit:n=>`射速 +${(n-1)*30}% → +${n*30}%`},
 {id:'vampire',name:'击杀续命',icon:'♥',kind:'生存',rarity:'rare',max:3,desc:n=>`每击杀一只僵尸恢复 ${n} 点生命。选择后立即恢复 25 点生命。`,benefit:n=>`击杀回血 ${n-1} → ${n}`,apply:s=>{s.p.hp=Math.min(s.p.maxHp,s.p.hp+25)}},
 {id:'armor',name:'反应装甲',icon:'⬡',kind:'生存',rarity:'rare',max:3,desc:n=>`累计生命上限 +${n*35}，受到的伤害降低 ${[0,15,25,35][n]}%。本次恢复 50 生命。`,benefit:n=>`伤害减免 ${[0,0,15,25][n]}% → ${[0,15,25,35][n]}%`,apply:s=>{s.p.maxHp+=35;s.p.hp=Math.min(s.p.maxHp,s.p.hp+50)}},
 {id:'magnet',name:'磁力回收',icon:'◎',kind:'成长',rarity:'rare',max:2,desc:n=>`经验获取 +${n*30}%，拾取范围 +${n*60}。更快升级，减少绕路捡经验。`,benefit:n=>`经验倍率 ×${1+(n-1)*.3} → ×${1+n*.3}`}
];
const SUPPLY_CARD={id:'supply',name:'战地补给',icon:'✚',kind:'补给',rarity:'rare',max:Infinity,desc:()=> '恢复 60 生命，技能与近战立即就绪。',benefit:()=> '所有能力已满级 · 应急补给',apply:s=>{s.p.hp=Math.min(s.p.maxHp,s.p.hp+60);s.skillCd=s.meleeCd=0}};
function eligibleCards(s=state){return UPGRADE_CARDS.filter(c=>rank(c.id,s)<c.max)}
function rollCards(s=state,excluded=[]){
 let pool=eligibleCards(s);if(!pool.length)return[SUPPLY_CARD];
 // Avoid the previous hand whenever enough distinct eligible cards remain.
 const fresh=pool.filter(c=>!excluded.includes(c.id));if(fresh.length>=3&&(fresh.some(c=>c.mechanic)||!pool.some(c=>c.mechanic)))pool=fresh;
 const result=[];
 function pick(list){let total=list.reduce((v,c)=>v+(rank(c.id,s)?1.6:1)+(s.p.hp<s.p.maxHp*.5&&c.kind==='生存'?1.8:0),0),r=Math.random()*total;for(const c of list){r-=(rank(c.id,s)?1.6:1)+(s.p.hp<s.p.maxHp*.5&&c.kind==='生存'?1.8:0);if(r<=0)return c}return list[list.length-1]}
 const impact=pool.filter(c=>c.mechanic);if(impact.length){const c=pick(impact);result.push(c);pool=pool.filter(x=>x!==c)}
 while(result.length<3&&pool.length){const c=pick(pool);result.push(c);pool=pool.filter(x=>x!==c)}
 return result;
}
function buildSummary(s=state){const cards=UPGRADE_CARDS.filter(c=>rank(c.id,s));return cards.length?cards.map(c=>`<span class="build-chip ${c.rarity}">${c.icon} ${c.name} <b>${rank(c.id,s)}/${c.max}</b></span>`).join(''):'<span class="build-empty">选一项能力，开始你的打法</span>'}
function renderUpgradeChoices(){
 const s=state;s.upgradeOpened=performance.now();$('overlay').hidden=false;
 $('overlay').innerHTML=`<div class="modal upgrade-modal"><div class="eyebrow">SURVIVOR LEVEL ${s.level}</div><h2>选择强化</h2><p class="upgrade-intro">本局持续生效 · 所有枪械共享强化</p><div class="upgrade-options">${s.offeredCards.map(c=>{const current=rank(c.id,s),next=current+1;return `<button class="upgrade upgrade-card ${c.rarity}" data-card="${c.id}"><span class="card-icon">${c.icon}</span><div class="card-content"><div class="card-meta"><span>${c.kind} · ${c.rarity==='epic'?'史诗':'稀有'}</span><b>${current?'LV.'+current+' → '+next:'新能力'}</b></div><strong>${c.name}</strong><small>${c.desc(next,s)}</small><em>${c.benefit(next,s)}</em></div></button>`}).join('')}</div><div class="build-caption">已获得的能力</div><div class="build-chips">${buildSummary(s)}</div><button id="reroll-cards" class="secondary reroll" ${s.rerolls<=0||eligibleCards(s).length<=3?'disabled':''}>↻ 重抽 <b>${s.rerolls} / 3</b></button></div>`;
 document.querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>{if(performance.now()-s.upgradeOpened<180)return;chooseUpgrade(b.dataset.card)});
 $('reroll-cards').onclick=()=>{if(gameMode!=='upgrade'||s.rerolls<=0||eligibleCards(s).length<=3)return;s.rerolls--;s.offeredCards=rollCards(s,s.offeredCards.map(c=>c.id));renderUpgradeChoices()};
}
function chooseUpgrade(id){
 if(gameMode!=='upgrade')return false;const s=state,c=s.offeredCards.find(c=>c.id===id);if(!c||rank(id,s)>=c.max)return false;
 const n=rank(id,s)+1;if(id!=='supply')s.build[id]=n;c.apply?.(s);
 s.offeredCards=[];$('overlay').hidden=true;gameMode='playing';
 // Do not continue a fire/joystick hold from before the upgrade overlay.
 clearControls();announce(`获得 · ${c.name}${id==='supply'?'':' '+n+'级'}`);sound('level');updateHUD();return true;
}
function onBulletContact(e,b){
 const s=state,cold=rank('frost');
 if(cold&&!e.dead){e.slow=2;e.slowFactor=1-(20+cold*15)/100;if((e.frostEffect||0)<=0){ring(e.x,e.y,26,'#a8edff','electric',.3);e.frostEffect=.3}}
 const level=rank('chain');if(!level||s.chainCd>0)return;s.chainCd=.18;
 let from=e;const visited=new Set([e]);
 for(let k=0;k<level+1;k++){
  let target=null,dist=155;for(const n of s.enemies){if(n.dead||visited.has(n))continue;const d=distance(n,from);if(d<dist){target=n;dist=d}}
  if(!target)break;visited.add(target);s.lightning.push({x:from.x,y:from.y,tx:target.x,ty:target.y,life:.2});
  hit(target,b.damage*(.5+level*.15),0,0,.12,true);from=target;
 }
}
function triggerKillPerks(e,secondary){
 const s=state,v=rank('vampire');if(v)s.p.hp=Math.min(s.p.maxHp,s.p.hp+v);
 const n=rank('blast');if(!n||secondary)return;
 const radius=65+n*25;ring(e.x,e.y,radius,'#ffbd68','explosion',.45);
 for(let i=0;i<10;i++){const a=i*Math.PI/5;spark(e.x,e.y,Math.cos(a)*160,Math.sin(a)*160,'#ffcc7b',.3,4)}
 for(const other of s.enemies){if(other.dead||other===e||distance(other,e)>radius)continue;const a=Math.atan2((other.y-e.y)*.65,other.x-e.x);hit(other,(40+n*40)*s.damage,Math.cos(a)*12,Math.sin(a)*12,0,true)}
}
