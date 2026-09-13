'use strict';
const $=id=>document.getElementById(id);
const ROLES=[
 {name:'渡鸦',cls:'侦察兵',symbol:'◈',color:'#ef9b54',hp:100,speed:145,skill:'极速超载',desc:'擅长游走的前线猎手，移动更快，火力更密。',skillDesc:'5 秒三线火力＋双倍射速，移动速度提升 35%',cd:12},
 {name:'堡垒',cls:'重装兵',symbol:'⬡',color:'#71b8c7',hp:160,speed:113,skill:'震荡护盾',desc:'穿上重甲顶住尸潮，用震荡冲击清出退路。',skillDesc:'大范围震荡清场，阻挡毒弹，获得 5 秒护盾',cd:16},
 {name:'青禾',cls:'战地医师',symbol:'✚',color:'#b5d396',hp:120,speed:132,skill:'净化领域',desc:'在废墟中寻找生机，越是险境越能坚持。',skillDesc:'恢复 50 生命，6 秒净化脉冲持续清扫尸群',cd:14}
];
const GUNS=[
 {name:'AR-16 突击步枪',short:'突击步枪',glyph:'━╤━',desc:'双重穿透 · 48 发',damage:34,rate:.105,mag:48,reload:.9,pellets:1,spread:.025,range:540,speed:900,pierce:2,push:11,color:'#ffe7a1'},
 {name:'SG-12 霰弹枪',short:'霰弹枪',glyph:'━┯━',desc:'扇面清场 · 12 发',damage:30,rate:.42,mag:12,reload:1.15,pellets:9,spread:.33,range:340,speed:850,pierce:2,push:20,color:'#ffc883'},
 {name:'V9 冲锋枪',short:'冲锋枪',glyph:'━┳',desc:'疾速扫射 · 70 发',damage:23,rate:.055,mag:70,reload:.75,pellets:1,spread:.075,range:465,speed:950,pierce:2,push:7,color:'#a5e9ff'},
 {name:'M82 狙击步枪',short:'狙击步枪',glyph:'━╪━',desc:'六重贯穿 · 9 发',damage:190,rate:.55,mag:9,reload:1.2,pellets:1,spread:0,range:740,speed:1400,pierce:6,push:26,color:'#e1b5ff'}
];
const MELEES=[{name:'武士刀',range:145,damage:140,cd:.8},{name:'消防斧',range:126,damage:250,cd:1.25},{name:'电击棍',range:165,damage:95,cd:1,stun:2}];
const TYPES=[{name:'游荡者',hp:30,speed:42,damage:9,r:14,color:'#90ad78',sprite:3,xp:1},{name:'疾跑者',hp:26,speed:75,damage:7,r:12,color:'#c87862',sprite:4,xp:2},{name:'喷毒者',hp:65,speed:28,damage:11,r:17,color:'#c5d359',sprite:5,xp:3},{name:'重装者',hp:195,speed:27,damage:20,r:25,color:'#7d9bad',sprite:6,xp:5},{name:'暴君',hp:4600,speed:38,damage:27,r:40,color:'#c57dc2',sprite:7,xp:30}];
let selectedRole=0,selectedGun=0,selectedMelee=0,muted=false,engineReady=false,assetsReady=false;
let layer,ground,world,fx,textures=[],state=null,gameMode='lobby',keys={},joy={x:0,y:0,id:null},audioCtx,zoom=1,lastTime=0,uiTime=0;
let viewHeight=900,firePointer=null;
const combatPointers=new Map();
const fireHeld=()=>firePointer!==null||!!keys.KeyJ;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rand=(a,b)=>a+Math.random()*(b-a),distance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*.65);
function chooseRole(i){selectedRole=i;const r=ROLES[i];$('role-name').textContent=r.name;$('role-class').textContent=r.cls;$('role-desc').textContent=r.desc;$('role-stats').innerHTML=`生命 <b>${r.hp}</b><span>机动 <b>${i===0?'高':i===1?'中':'较高'}</b></span>`;$('skill-symbol').textContent=r.symbol;$('skill-name').textContent=r.skill;$('skill-desc').textContent=r.skillDesc;$('skill-time').textContent=r.cd+'s';document.querySelectorAll('.role').forEach((b,j)=>{b.classList.toggle('active',j===i);b.setAttribute('aria-pressed',j===i)})}
function chooseGun(i){selectedGun=i;document.querySelectorAll('.weapon').forEach((b,j)=>{b.classList.toggle('active',i===j);b.setAttribute('aria-pressed',i===j)})}
function chooseMelee(i){selectedMelee=i;document.querySelectorAll('.melee-choice').forEach((b,j)=>{b.classList.toggle('active',i===j);b.setAttribute('aria-pressed',i===j)})}
$('roles').innerHTML=ROLES.map((r,i)=>`<button class="role" data-role="${i}"><span class="role-avatar portrait-${i}">${r.symbol}</span><span>${r.name}</span></button>`).join('');
$('weapons').innerHTML=GUNS.map((g,i)=>`<button class="weapon" data-gun="${i}"><span class="weapon-glyph gear-${i}">${g.glyph}</span><span><b>${g.short}</b><small>${g.desc}</small></span></button>`).join('');
$('melees').innerHTML=MELEES.map((m,i)=>`<button class="melee-choice" data-melee="${i}"><img src="sprites/gear-${i+4}.png" alt="">${m.name}</button>`).join('');
document.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>chooseRole(+b.dataset.role));document.querySelectorAll('[data-gun]').forEach(b=>b.onclick=()=>chooseGun(+b.dataset.gun));document.querySelectorAll('[data-melee]').forEach(b=>b.onclick=()=>chooseMelee(+b.dataset.melee));chooseRole(0);chooseGun(0);chooseMelee(0);
function sound(type){if(muted||!audioCtx)return;try{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);const t=audioCtx.currentTime;let f=type==='shot'?150:type==='hit'?80:type==='skill'?470:type==='level'?720:220;o.type=type==='shot'?'sawtooth':type==='hit'?'triangle':'sine';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(type==='level'?1050:35,t+.13);g.gain.setValueAtTime(type==='shot'?.021:.06,t);g.gain.exponentialRampToValueAtTime(.001,t+.15);o.start(t);o.stop(t+.16)}catch(e){}}
document.querySelectorAll('.sound-toggle').forEach(b=>b.onclick=()=>{muted=!muted;b.textContent='声效 '+(muted?'关':'开');if(audioCtx&&!muted)audioCtx.resume()});
function fit(){
 const viewport=window.visualViewport;
 const width=viewport?viewport.width:innerWidth,height=viewport?viewport.height:innerHeight;
 const style=getComputedStyle($('game-screen'));
 const availW=width-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0);
 const availH=height-(parseFloat(style.paddingTop)||0)-(parseFloat(style.paddingBottom)||0);
 zoom=Math.min(availW/480,availH/680,1);
 viewHeight=Math.min(1100,Math.round(availH/zoom));
 $('game-screen').style.height=height+'px';
 $('game-fit').style.width=480*zoom+'px';$('game-fit').style.height=viewHeight*zoom+'px';
 $('game-frame').style.height=viewHeight+'px';$('game-frame').style.transform=`scale(${zoom})`;
 $('game-frame').style.setProperty('--game-height',viewHeight+'px');
 if(engineReady)Laya.stage.size(480,viewHeight);
}
window.addEventListener('resize',fit);
if(window.visualViewport)window.visualViewport.addEventListener('resize',fit);
function poly(g,points,fill,line=null,w=1){g.drawPoly(0,0,points,fill,line,w)}
function ellipse(g,x,y,rx,ry,color,line=null){const pts=[];for(let i=0;i<20;i++){const a=i*Math.PI/10;pts.push(x+Math.cos(a)*rx,y+Math.sin(a)*ry)}poly(g,pts,color,line)}
function cube(g,x,y,w,d,h,top,left,right){poly(g,[x-w/2,y-d/2-h,x+w/2,y-d/2-h,x+w/2+12,y+d/2-h,x-w/2+12,y+d/2-h],top);poly(g,[x-w/2,y-d/2-h,x-w/2+12,y+d/2-h,x-w/2+12,y+d/2,x-w/2,y-d/2],left);poly(g,[x-w/2+12,y+d/2-h,x+w/2+12,y+d/2-h,x+w/2+12,y+d/2,x-w/2+12,y+d/2],right)}
function makeFloor(){const g=ground.graphics;g.clear();g.drawRect(-700,-1200,2550,3500,'#1b2c27');g.drawRect(0,0,1150,1105,'#263532');g.drawRect(185,0,740,1105,'#303b37');g.drawRect(209,0,692,1105,'#343e39');g.drawRect(215,0,7,1105,'#666d54');g.drawRect(889,0,7,1105,'#666d54');for(let y=0;y<1150;y+=115){g.drawRect(550,y,7,51,'#898363');g.drawRect(571,y,7,51,'#898363')}for(let y=0;y<1105;y+=46){g.drawLine(0,y,184,y,'#4b5850',1);g.drawLine(925,y,1150,y,'#4b5850',1)}for(let x=0;x<1150;x+=46){g.drawLine(x,0,x<190?x:Math.max(925,x),1105,'#334139',1);if(x>190&&x<925)break}g.drawRect(181,0,6,1105,'#728074');g.drawRect(924,0,6,1105,'#1c2926');for(let y=250;y<315;y+=14)g.drawRect(225,y,655,7,'#707565');for(let y=850;y<910;y+=14)g.drawRect(225,y,655,7,'#656e60');let seed=42;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};for(let i=0;i<175;i++){const x=rng()*1150,y=rng()*1105;if(i%4===0)ellipse(g,x,y,15+rng()*40,3+rng()*8,'#293934');else{g.drawLine(x,y,x+8+rng()*30,y+rng()*6,'#414c41',1);if(i%3===0)g.drawRect(x,y,2+rng()*5,2,'#6b7160')}}g.fillText('QUARANTINE',680,690,'bold 26px Arial','#4f594a','center');g.fillText('07',120,790,'bold 65px Arial','#536253','center');g.drawRect(15,15,1120,1075,null,'#738365',4)}
function makeProps(){return[{x:120,y:170,w:100,d:50,h:95,kind:'building',r:62},{x:1030,y:200,w:125,d:60,h:130,kind:'building',r:70},{x:112,y:700,w:95,d:62,h:135,kind:'building',r:65},{x:1050,y:890,w:118,d:60,h:105,kind:'building',r:68},{x:120,y:1390,w:115,d:70,h:115,kind:'building',r:68},{x:1030,y:1510,w:115,d:60,h:130,kind:'building',r:66},{x:355,y:385,w:62,d:70,h:34,kind:'car',r:43},{x:782,y:1170,w:62,d:78,h:34,kind:'car',r:45},{x:756,y:585,w:38,d:35,h:29,kind:'crate',r:25},{x:800,y:570,w:38,d:35,h:29,kind:'crate',r:25},{x:339,y:1320,w:38,d:35,h:29,kind:'crate',r:25},{x:919,y:460,w:15,d:16,h:26,kind:'barrel',r:14},{x:225,y:1080,w:15,d:16,h:26,kind:'barrel',r:14},{x:230,y:600,w:6,d:6,h:96,kind:'lamp',r:10},{x:918,y:1350,w:6,d:6,h:96,kind:'lamp',r:10}]}
function drawProp(g,o,cx,cy){const x=o.x-cx,y=o.y*.65-cy;if(x<-170||x>640||y<-80||y>viewHeight+120)return;ellipse(g,x+16,y+7,o.w*.7,o.d*.32,'#182822');if(o.kind==='car'){cube(g,x,y,o.w,o.d*.65,o.h,'#667569','#304d48','#486157');cube(g,x+2,y-7,48,25,52,'#4b6562','#273e3c','#344f4b');g.drawLine(x-19,y-44,x+24,y-44,'#8fa9a0',2);g.drawRect(x-25,y+o.d*.32-9,10,5,'#b68f57');g.drawRect(x+20,y+o.d*.32-9,10,5,'#b68f57');g.drawLine(x-15,y-13,x+27,y-6,'#38463b',2)}else if(o.kind==='lamp'){g.drawLine(x,y,x,y-95,'#91a590',4);g.drawLine(x,y-95,x-18,y-98,'#8e9d86',3);ellipse(g,x-20,y-95,12,5,'#ccb77d');ellipse(g,x-20,y-91,9,3,'#ffe4a0');ellipse(g,x-15,y+3,35,12,'#737a4220')}else if(o.kind==='barrel'){cube(g,x,y,19,16,26,'#995e47','#633f32','#825240');g.drawLine(x-7,y-8,x+19,y-2,'#332e25',3)}else if(o.kind==='crate'){cube(g,x,y,o.w,o.d*.65,o.h,'#737157','#444c39','#5a6047');g.drawLine(x-12,y-15,x+20,y+7,'#929171',2);g.drawLine(x+20,y-15,x-10,y+7,'#3b4734',2)}else{cube(g,x,y,o.w,o.d*.65,o.h,'#566157','#273e38','#3e5248');g.drawLine(x-o.w/2,y-o.h-o.d*.32,x+o.w/2,y-o.h-o.d*.32,'#829181',2);for(let k=0;k<3;k++)g.drawRect(x-o.w*.28+k*26,y-o.h+30,13,20,k===1?'#a4905a':'#1f3631');cube(g,x-5,y-o.h-3,30,21,14,'#7a8170','#4f5e4e','#646e5a')}}
function moveEntity(e,dx,dy){e.x=clamp(e.x+dx,35,1115);e.y=clamp(e.y+dy,55,1640);for(const o of state.props){let vx=e.x-o.x,vy=(e.y-o.y)*.65,d=Math.hypot(vx,vy),min=o.r+(e.r||13);if(d<min&&d>.001){e.x+=vx/d*(min-d);e.y+=vy/d*(min-d)/.65}}}
function startGame(){if(!engineReady||!assetsReady)return;try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume()}catch(e){}const role=ROLES[selectedRole];state={time:0,wave:1,kills:0,level:1,xp:0,need:7,role:selectedRole,gun:selectedGun,melee:selectedMelee,p:{x:575,y:820,hp:role.hp,maxHp:role.hp,r:14,inv:0,aim:-Math.PI/2,walk:0},speed:role.speed,damage:1,rate:1,enemies:[],bullets:[],particles:[],drops:[],pools:[],floats:[],slashes:[],props:makeProps(),ammo:GUNS.map(g=>g.mag),reload:GUNS.map(()=>0),fire:0,spawn:.4,meleeCd:0,skillCd:0,buff:0,bossSpawned:false,bossDead:false,announcement:3,shake:0,regen:0,queuedLevel:0,combo:0,comboTime:0,bestCombo:0,corpses:[],trails:[],rings:[],muzzle:0,skillPulse:0,trailTimer:0,build:{},rerolls:3,offeredCards:[],chainCd:0,lightning:[]};keys={};joy.x=joy.y=0;joy.id=null;$('joy-knob').style.transform='translate(0,0)';document.body.classList.add('in-game');$('lobby').hidden=true;$('game-screen').hidden=false;$('overlay').hidden=true;gameMode='playing';$('hud-role').textContent=role.name;$('skill-button-name').textContent=role.skill.slice(0,2);$('melee-action').querySelector('b').textContent=MELEES[selectedMelee].name;$('melee-icon').src='sprites/gear-'+(selectedMelee+4)+'.png';$('boss-hud').hidden=true;fit();makeFloor();announce('第 1 波 · 守住街区');clearControls();for(let i=0;i<18;i++)spawnEnemy(0);lastTime=performance.now();updateHUD()}
function announce(s){$('announcement').textContent=s;$('announcement').style.opacity=1;state.announcement=3}
function spawnEnemy(type){
 const p=state.p,t=TYPES[type],mult=1+state.time/850;
 let x,y;for(let attempt=0;attempt<12;attempt++){
  const a=rand(0,Math.PI*2),d=rand(300,530);
  x=clamp(p.x+Math.cos(a)*d,40,1110);y=clamp(p.y+Math.sin(a)*d/.65,60,1620);
  if(Math.hypot(x-p.x,(y-p.y)*.65)>240&&!state.props.some(o=>Math.hypot(x-o.x,(y-o.y)*.65)<o.r+t.r))break;
 }
 if(distance({x,y},p)<220)return;
 const e={x,y,type,r:t.r,hp:t.hp*mult,maxHp:t.hp*mult,speed:t.speed*(1+state.time/1300),attack:rand(0,1),stun:0,flash:0,phase:rand(0,10),ranged:rand(1,3)};
 if(type===4){e.hp=e.maxHp=6800;state.bossSpawned=true;$('boss-hud').hidden=false;announce('警报 · 感染源接近')}
 state.enemies.push(e);
}
function hit(e,damage,kx=0,ky=0,stun=0,secondary=false){
 if(e.dead)return;const s=state;e.hp-=damage;e.flash=.08;e.stun=Math.max(e.stun,stun);
 moveEntity(e,kx,ky/.65);
 if(Math.random()<.18||damage>90)s.floats.push({x:e.x,y:e.y,text:Math.round(damage),life:.55,color:damage>90?'#fff0ad':'#e9efda'});
 for(let i=0;i<2;i++)spark(e.x,e.y,rand(-90,90),rand(-90,90),'#ffebaa',.18,2);
 if(e.hp>0)return;
 e.dead=true;s.kills++;s.combo=s.comboTime>0?s.combo+1:1;s.comboTime=3;s.bestCombo=Math.max(s.bestCombo,s.combo);
 s.drops.push({x:e.x,y:e.y,type:'xp',value:TYPES[e.type].xp});
 if(Math.random()<.035)s.drops.push({x:e.x+12,y:e.y,type:'health',value:20});
 const a=Math.atan2((e.y-s.p.y)*.65,e.x-s.p.x);
 s.corpses.push({x:e.x,y:e.y,type:e.type,life:1.4,vx:Math.cos(a)*90,vy:Math.sin(a)*90,angle:a});
 for(let i=0;i<5;i++)spark(e.x,e.y,Math.cos(a)*100+rand(-100,100),Math.sin(a)*100+rand(-100,100),TYPES[e.type].color,rand(.2,.4),3);
 if(s.combo%10===0){s.shake=Math.max(s.shake,3);sound('level')}
 triggerKillPerks(e,secondary);
 if(e.type===4){s.bossDead=true;$('boss-hud').hidden=true;announce('感染源已清除 · 等待撤离')}
}
function spark(x,y,vx,vy,color,life=.3,size=3){
 if(state.particles.length<280)state.particles.push({x,y,vx,vy,color,life,max:life,size});
}
function ring(x,y,r,color,kind='burst',duration=.65){state.rings.push({x,y,r,color,kind,life:duration,max:duration})}
function clearControls(){
 firePointer=null;keys={};joy.x=joy.y=0;joy.id=null;combatPointers.clear();for(const id of['skill-action','melee-action','reload-action','switch-gun'])$(id).classList.remove('touch-pressed');
 $('joy-knob').style.transform='translate(0,0)';$('fire-action').classList.remove('pressed');
}
function hurt(damage){const s=state,p=s.p;if(p.inv>0||(s.role===1&&s.buff>0))return;p.hp-=damage*(1-[0,.15,.25,.35][rank('armor')]);p.inv=.55;s.shake=6;sound('hit');$('damage-vignette').style.opacity=.5;setTimeout(()=>$('damage-vignette').style.opacity=0,180);if(p.hp<=0){p.hp=0;endGame(false)}}
function shoot(){
 if(gameMode!=='playing'||!fireHeld())return;
 const s=state,p=s.p,gun=GUNS[s.gun];
 if(s.fire>0||s.reload[s.gun]>0)return;
 if(s.ammo[s.gun]<=0){reload();return}
 const aim=p.aim,overload=s.role===0&&s.buff>0;
 s.ammo[s.gun]--;s.fire=gun.rate/(s.rate*(1+rank('rapid')*.3))/(overload?2:1);s.muzzle=.075;
 const lanes=(overload?[-.14,0,.14]:[0]).map(angle=>({angle,power:1}));
 if(rank('multishot'))for(const angle of[-.27,.27])lanes.push({angle,power:[0,.65,.9,1.15][rank('multishot')]});
 for(const lane of lanes)for(let i=0;i<gun.pellets;i++){
  const a=aim+lane.angle+(gun.pellets>1?(i/(gun.pellets-1)-.5)*gun.spread*2:rand(-gun.spread,gun.spread));
  s.bullets.push({x:p.x+Math.cos(a)*28,y:p.y+Math.sin(a)*28/.65,vx:Math.cos(a)*gun.speed,vy:Math.sin(a)*gun.speed/.65,life:gun.range/gun.speed,damage:gun.damage*s.damage*gunMultiplier()*lane.power*(overload?1+rank('awaken')*.3:1),pierce:gun.pierce+rank('pierce')*2,push:gun.push,color:overload?'#ffba5b':gun.color,hit:new Set(),enemy:false});
 }
 spark(p.x+Math.cos(aim)*28,p.y+Math.sin(aim)*28/.65,Math.cos(aim)*90,Math.sin(aim)*90,'#fff4c2',.1,7);
 spark(p.x,p.y,-Math.sin(aim)*65,Math.cos(aim)*65,'#d1a46a',.25,2);
 if(s.gun===1||s.gun===3)s.shake=Math.max(s.shake,2);
 sound('shot');if(s.ammo[s.gun]===0)reload();
}
function reload(){if(gameMode!=='playing')return;const s=state;if(s.reload[s.gun]>0||s.ammo[s.gun]===GUNS[s.gun].mag)return;s.reload[s.gun]=reloadDuration(s.gun)}
function switchGun(){if(gameMode!=='playing')return;state.gun=(state.gun+1)%GUNS.length;state.fire=Math.max(state.fire,.15);updateHUD()}
function melee(){
 if(gameMode!=='playing'||state.meleeCd>0)return;
 const s=state,m=meleeStats(s),aim=s.p.aim;
 s.meleeCd=m.cd;s.shake=Math.max(s.shake,3);
 s.slashes.push({x:s.p.x,y:s.p.y,aim,life:.32,max:.32,r:m.range,full:m.full,color:s.melee===2?'#8ff4ff':'#ffe1a1'});
 for(const e of s.enemies){const d=distance(e,s.p),a=Math.atan2((e.y-s.p.y)*.65,e.x-s.p.x);
  const angle=Math.atan2(Math.sin(a-aim),Math.cos(a-aim));
  if(d<m.range&&(m.full||Math.abs(angle)<Math.PI*.62||d<40)){
   hit(e,m.damage*s.damage,Math.cos(a)*40,Math.sin(a)*40,m.stun||.3);
   if(s.melee===2)ring(e.x,e.y,28,'#83eafa','electric',.35);
  }
 }
 sound('skill');
}
function skill(){
 if(gameMode!=='playing'||state.skillCd>0)return;
 const s=state,r=ROLES[s.role];s.skillCd=skillCooldown(s);s.buff=s.role===0?5+rank('awaken')*3:s.role===2?6:5;s.skillPulse=0;
 sound('skill');ring(s.p.x,s.p.y,skillRadius(s.role===1?270:s.role===2?180:105),r.color,s.role===1?'shock':s.role===2?'heal':'overload',.85);
 for(let i=0;i<36;i++){const a=i*Math.PI/18;spark(s.p.x,s.p.y,Math.cos(a)*210,Math.sin(a)*210,r.color,rand(.3,.7),4)}
 if(s.role===1){s.shake=8;for(const e of s.enemies){if(distance(e,s.p)<skillRadius(270)){const a=Math.atan2((e.y-s.p.y)*.65,e.x-s.p.x);hit(e,380*s.damage*skillPower(),Math.cos(a)*70,Math.sin(a)*70,1.4)}}
  s.bullets=s.bullets.filter(b=>!b.enemy||distance(b,s.p)>skillRadius(270));
 }
 if(s.role===2){s.p.hp=Math.min(s.p.maxHp,s.p.hp+50+rank('awaken')*30);s.floats.push({x:s.p.x,y:s.p.y,text:'+'+(50+rank('awaken')*30),life:1,color:'#caffb2'})}
 updateHUD();
}
function checkLevel(){
 if(state.xp<state.need||gameMode!=='playing')return;
 state.xp-=state.need;state.level++;state.need=Math.floor(state.need*1.3+8);
 gameMode='upgrade';clearControls();sound('level');state.offeredCards=rollCards(state);renderUpgradeChoices();
}
function pauseGame(){if(gameMode==='playing'){gameMode='paused';clearControls();$('overlay').hidden=false;$('overlay').innerHTML='<div class="modal"><div class="eyebrow">TAKE A BREATH</div><h2>行动暂停</h2><p>喘口气，尸潮会等你回来。</p><button class="primary" id="resume"><span>继续战斗</span><span>↗</span></button><button class="secondary" id="pause-sound">声效 '+(muted?'关闭':'开启')+'</button><button class="secondary" id="back-lobby">返回准备界面</button><div class="pause-build"><div class="build-caption">本局能力</div><div class="build-chips">'+buildSummary()+'</div></div></div>';$('resume').onclick=pauseGame;$('pause-sound').onclick=()=>{muted=!muted;$('pause-sound').textContent='声效 '+(muted?'关闭':'开启')};$('back-lobby').onclick=backLobby}else if(gameMode==='paused'){gameMode='playing';$('overlay').hidden=true}}
function backLobby(){document.body.classList.remove('in-game');gameMode='lobby';clearControls();$('game-screen').hidden=true;$('lobby').hidden=false;document.querySelectorAll('.sound-toggle').forEach(b=>b.textContent='声效 '+(muted?'关':'开'))}
function endGame(win){gameMode='ended';clearControls();updateHUD();$('overlay').hidden=false;$('overlay').innerHTML=`<div class="modal"><div class="eyebrow">${win?'EXTRACTION COMPLETE':'SIGNAL LOST'}</div><h2>${win?'活着抵达黎明':'行动结束'}</h2><p>${win?'感染源已清除。你成功撤出了隔离区。':'每次突围，都会离黎明更近一点。'}</p><div class="result-stats"><div><b>${formatTime(state.time)}</b><span>生存时间</span></div><div><b>${state.kills}</b><span>击杀僵尸</span></div><div><b>${state.level}</b><span>幸存者等级</span></div></div><button id="restart" class="primary"><span>再次出击</span><span>↗</span></button><button id="return" class="secondary">更换角色与装备</button></div>`;$('restart').onclick=startGame;$('return').onclick=backLobby}
function formatTime(t){return Math.floor(t/60).toString().padStart(2,'0')+':'+Math.floor(t%60).toString().padStart(2,'0')}
function updateHUD(){if(!state)return;const s=state,p=s.p;$('timer').textContent=formatTime(s.time);$('hp-fill').style.width=(p.hp/p.maxHp*100)+'%';$('hp-text').textContent=Math.ceil(p.hp)+' / '+p.maxHp;$('xp-fill').style.width=(s.xp/s.need*100)+'%';$('hud-lv').textContent='LV. '+s.level;$('wave').textContent='第 '+s.wave+' 波'+(s.time>=300?' · 清除感染源':'');$('kills').textContent=s.kills;$('gun-name').textContent=GUNS[s.gun].short;if($('equipped-gun').dataset.index!==String(s.gun)){$('equipped-gun').src='sprites/gear-'+s.gun+'.png';$('equipped-gun').dataset.index=s.gun;}$('ammo').textContent=s.reload[s.gun]>0?'换弹 '+s.reload[s.gun].toFixed(1)+'s':s.ammo[s.gun]+' / '+GUNS[s.gun].mag;for(const [id,cd]of[['melee-action',s.meleeCd],['skill-action',s.skillCd]]){const b=$(id);b.classList.toggle('cooldown',cd>0);b.querySelector('i').textContent=Math.ceil(cd)}$('combo').hidden=s.combo<3||s.comboTime<=0;
 $('combo-count').textContent=s.combo;$('combo-word').textContent=s.combo>=50?'势不可挡':s.combo>=20?'疯狂清场':'连杀';
 $('combo-fill').style.width=clamp(s.comboTime/3*100,0,100)+'%';
 $('fire-action').classList.toggle('pressed',fireHeld()&&gameMode==='playing');
 $('fire-label').textContent=s.reload[s.gun]>0?'换弹中':fireHeld()?'射击中':'长按攻击';
 $('fire-action').style.setProperty('--reload',s.reload[s.gun]>0?(1-s.reload[s.gun]/reloadDuration(s.gun))*360+'deg':'360deg');
 $('buff-indicator').hidden=s.buff<=0;$('buff-indicator').textContent=ROLES[s.role].skill+' '+s.buff.toFixed(1)+'s';
 $('reload-action').disabled=s.reload[s.gun]>0||s.ammo[s.gun]===GUNS[s.gun].mag;
 for(const [id,cd,max]of[['melee-action',s.meleeCd,meleeStats(s).cd],['skill-action',s.skillCd,skillCooldown(s)]])$(id).style.setProperty('--cooldown',(1-cd/max)*360+'deg');
 const boss=s.enemies.find(e=>e.type===4&&!e.dead);if(boss)$('boss-fill').style.width=Math.max(0,boss.hp/boss.maxHp*100)+'%'}
function tick(dt){
 const s=state,p=s.p;s.time+=dt;s.fire-=dt;p.inv-=dt;s.chainCd=Math.max(0,s.chainCd-dt);
 s.meleeCd=Math.max(0,s.meleeCd-dt);s.skillCd=Math.max(0,s.skillCd-dt);s.buff=Math.max(0,s.buff-dt);s.comboTime-=dt;s.muzzle=Math.max(0,s.muzzle-dt);
 p.hp=Math.min(p.maxHp,p.hp+s.regen*dt);s.shake=Math.max(0,s.shake-dt*32);
 for(let i=0;i<4;i++)if(s.reload[i]>0){s.reload[i]-=dt;if(s.reload[i]<=0)s.ammo[i]=GUNS[i].mag}
 let dx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+joy.x;
 let dy=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0)+joy.y;
 const len=Math.hypot(dx,dy);
 if(len>.12){
  const v=s.speed*(s.role===0&&s.buff>0?1.35:1)*Math.min(1,len);dx/=len;dy/=len;
  p.aim=Math.atan2(dy,dx);moveEntity(p,dx*v*dt,dy*v*dt/.65);p.walk+=dt*14;
  s.trailTimer-=dt;if(s.buff>0&&s.role===0&&s.trailTimer<=0){s.trails.push({x:p.x,y:p.y,life:.3,aim:p.aim});s.trailTimer=.06}
 }else p.walk=0;
 const wave=Math.min(10,Math.floor(s.time/30)+1);
 if(wave>s.wave){s.wave=wave;announce('第 '+wave+' 波 · '+(wave<4?'尸潮涌入':wave<7?'变异加剧':'危险升级'))}
 if(s.time>=270&&!s.bossSpawned)spawnEnemy(4);
 if(s.time>=300&&s.bossDead){endGame(true);return}
 s.spawn-=dt;
 if(s.spawn<=0&&s.enemies.length<180){
  const count=Math.min(5+Math.floor(s.wave*.8),180-s.enemies.length);
  for(let k=0;k<count;k++){
   const roll=Math.random(),type=s.wave>=5&&roll<.08?3:s.wave>=3&&roll<.18?2:s.wave>=2&&roll<.35?1:0;spawnEnemy(type);
  }
  s.spawn=Math.max(.7,1.8-s.time/300);
 }
 s.announcement-=dt;if(s.announcement<0)$('announcement').style.opacity=0;
 shoot();
 // Local buckets keep dense hordes from requiring all-pairs separation.
 const grid=new Map(),cell=60;
 for(const e of s.enemies){const key=Math.floor(e.x/cell)+','+Math.floor(e.y*.65/cell);if(!grid.has(key))grid.set(key,[]);grid.get(key).push(e)}
 s.skillPulse-=dt;const healPulse=s.role===2&&s.buff>0&&s.skillPulse<=0;
 if(healPulse){s.skillPulse=.4;ring(p.x,p.y,skillRadius(180),'#b6f99a','heal',.5)}
 for(const e of s.enemies){
  if(e.dead)continue;e.flash-=dt;e.stun-=dt;e.attack-=dt;e.ranged-=dt;e.slow=Math.max(0,(e.slow||0)-dt);e.frostEffect=Math.max(0,(e.frostEffect||0)-dt);const slow=e.slow>0?e.slowFactor:1;
  const vx=p.x-e.x,vy=(p.y-e.y)*.65,d=Math.hypot(vx,vy)||1;
  if(e.stun<=0){
   const gx=Math.floor(e.x/cell),gy=Math.floor(e.y*.65/cell);let sx=0,sy=0;
   for(let ax=-1;ax<=1;ax++)for(let ay=-1;ay<=1;ay++)for(const n of grid.get((gx+ax)+','+(gy+ay))||[]){
    if(n===e||n.dead)continue;const nx=e.x-n.x,ny=(e.y-n.y)*.65,nd=Math.hypot(nx,ny),min=(e.r+n.r)*.78;
    if(nd<min&&nd>.1){sx+=nx/nd*(min-nd)*2;sy+=ny/nd*(min-nd)*2}
   }
   const move=!(e.type===2&&d<230&&d>140);moveEntity(e,((move?vx/d*e.speed*slow:0)+clamp(sx,-60,60))*dt,((move?vy/d*e.speed*slow:0)+clamp(sy,-60,60))*dt/.65);e.phase+=dt*8;
  }
  if(d<e.r+p.r+3&&e.attack<=0){hurt(TYPES[e.type].damage);e.attack=.85;if(gameMode==='ended')return}
  if((e.type===2||e.type===4)&&e.ranged<=0&&d<600){
   const count=e.type===4?7:1;for(let k=0;k<count;k++){const a=Math.atan2(vy,vx)+(k-(count-1)/2)*.2;s.bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*155,vy:Math.sin(a)*155/.65,life:3.5,enemy:true,damage:e.type===4?17:11})}
   e.ranged=e.type===4?2.4:3.3;
  }
  if(healPulse&&d<skillRadius(180))hit(e,48*s.damage*skillPower(),0,0,.12);
 }
 for(const b of s.bullets){
  const ox=b.x,oy=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
  if(b.enemy){
   if(s.role===1&&s.buff>0&&distance(b,p)<58){b.life=0;ring(b.x,b.y,20,'#bbf6ff','electric',.2);continue}
   if(distance(b,p)<p.r+8){hurt(b.damage);b.life=0;if(gameMode==='ended')return}
   if(s.props.some(o=>distance(b,o)<o.r))b.life=0;
  }else{
   const bx=b.x-ox,by=(b.y-oy)*.65,den=bx*bx+by*by||1;
   const project=o=>clamp(((o.x-ox)*bx+(o.y-oy)*.65*by)/den,0,1);
   const near=(o,t,r)=>Math.hypot(o.x-ox-bx*t,(o.y-oy)*.65-by*t)<r;
   let wallT=Infinity;
   for(const o of s.props){const t=project(o);if(near(o,t,o.r*.8))wallT=Math.min(wallT,t)}
   const contacts=[];for(const e of s.enemies){if(e.dead||b.hit.has(e))continue;const t=project(e);if(t<wallT&&near(e,t,e.r+7))contacts.push({e,t})}
   contacts.sort((a,b)=>a.t-b.t);
   for(const {e}of contacts){if(b.pierce<=0)break;if(e.dead)continue;const a=Math.atan2(b.vy*.65,b.vx);hit(e,b.damage,Math.cos(a)*b.push,Math.sin(a)*b.push,.04);b.hit.add(e);onBulletContact(e,b);b.pierce--}
   if(b.pierce<=0||wallT!==Infinity)b.life=0;
  }
 }
 for(const d of s.drops){const dist=distance(d,p);
  if(dist<155+rank('magnet')*60){const step=Math.min(dist,dt*480);d.x+=(p.x-d.x)/(dist||1)*step;d.y+=(p.y-d.y)/(dist||1)*step}
  if(dist<24){if(d.type==='xp')s.xp+=d.value*(1+rank('magnet')*.3);else{p.hp=Math.min(p.maxHp,p.hp+d.value);s.floats.push({x:p.x,y:p.y,text:'+20',life:.8,color:'#b9e998'})}d.dead=true}
 }
 for(const a of s.particles){a.life-=dt;a.x+=a.vx*dt;a.y+=a.vy*dt/.65}
 for(const a of s.corpses){a.life-=dt;a.x+=a.vx*dt;a.y+=a.vy*dt/.65;a.vx*=Math.exp(-dt*8);a.vy*=Math.exp(-dt*8)}
 for(const a of s.floats){a.life-=dt;a.y-=dt*38}
 for(const list of[s.slashes,s.rings,s.trails,s.lightning])for(const a of list)a.life-=dt;
 s.bullets=s.bullets.filter(e=>e.life>0).slice(-550);s.enemies=s.enemies.filter(e=>!e.dead);
 s.drops=s.drops.filter(e=>!e.dead);
 // Merge excess XP into a retained crystal instead of discarding rewards.
 if(s.drops.length>300){const removed=s.drops.splice(0,s.drops.length-280);let xp=0;for(const d of removed)if(d.type==='xp')xp+=d.value;if(xp)s.drops.push({x:p.x,y:p.y,type:'xp',value:xp})}
 s.particles=s.particles.filter(e=>e.life>0).slice(-280);s.floats=s.floats.filter(e=>e.life>0).slice(-45);
 s.lightning=s.lightning.filter(e=>e.life>0).slice(-30);s.slashes=s.slashes.filter(e=>e.life>0);s.rings=s.rings.filter(e=>e.life>0).slice(-40);s.trails=s.trails.filter(e=>e.life>0).slice(-8);s.corpses=s.corpses.filter(e=>e.life>0).slice(-45);
 checkLevel();
}
function arc(g,x,y,r,start,end,color,width=2,squash=1){
 const points=[];for(let i=0;i<=24;i++){const a=start+(end-start)*i/24;points.push(x+Math.cos(a)*r,y+Math.sin(a)*r*squash)}g.drawLines(0,0,points,color,width);
}
function drawGroundEffects(g,s,cx,cy){
 const x=s.p.x-cx,y=s.p.y*.65-cy,a=s.p.aim;
 for(const c of s.corpses){const tx=textures[TYPES[c.type].sprite],size=c.type>=3?80:55;
  if(tx)g.drawTexture(tx,c.x-cx-size/2,c.y*.65-cy-20,size,25,null,Math.min(.6,c.life*.7));
 }
 for(const t of s.trails){const mirror=Math.cos(t.aim)<0?new Laya.Matrix(-1,0,0,1,2*(t.x-cx),0):null;
  g.drawTexture(textures[s.role],t.x-cx-32,t.y*.65-cy-58,64,64,mirror,t.life*.9,'#ffb65b');
 }
 // A facing cone communicates direction even when the survivor is standing still.
 const spread=s.gun===1?.35:.11,range=s.gun===3?220:150;
 poly(g,[x,y-16,x+Math.cos(a-spread)*range,y-16+Math.sin(a-spread)*range,x+Math.cos(a+spread)*range,y-16+Math.sin(a+spread)*range],fireHeld()?'#ffc86e1b':'#ffe9c00a');
 for(let i=38;i<range;i+=22){g.drawLine(x+Math.cos(a)*i,y-16+Math.sin(a)*i,x+Math.cos(a)*(i+7),y-16+Math.sin(a)*(i+7),fireHeld()?'#ffe9a69c':'#ddd4a64c',1)}
 const tipX=x+Math.cos(a)*39,tipY=y-16+Math.sin(a)*39;
 poly(g,[tipX+Math.cos(a)*8,tipY+Math.sin(a)*8,tipX+Math.cos(a+2.2)*7,tipY+Math.sin(a+2.2)*7,tipX+Math.cos(a-2.2)*7,tipY+Math.sin(a-2.2)*7],'#ffe0a6');
 if(s.buff>0&&s.role===2){
  g.save();const sc=1+rank('awaken')*.25;g.translate(x,y);g.scale(sc,sc);g.translate(-x,-y);
  ellipse(g,x,y,180,180,'#8af78412','#b9f59b60');
  arc(g,x,y,175,s.time*1.2,s.time*1.2+Math.PI*1.4,'#bdffc1',3);
  arc(g,x,y,157,-s.time,-s.time+Math.PI,'#72cf8e',2);
  for(let i=0;i<8;i++){const ang=i*Math.PI/4+s.time*.7,px=x+Math.cos(ang)*169,py=y+Math.sin(ang)*169;g.drawLine(px-5,py,px+5,py,'#d0ffc0',2);g.drawLine(px,py-5,px,py+5,'#d0ffc0',2)}
  g.restore();
 }
}
function drawEffects(g,s,cx,cy){
 const x=s.p.x-cx,y=s.p.y*.65-cy;
 for(const r of s.rings){
  const t=1-r.life/r.max,rx=r.x-cx,ry=r.y*.65-cy-8,rr=r.r*(.2+t*.8);
  if(r.kind==='explosion'){
   ellipse(g,rx,ry,rr,rr*.8,'#ffb45b22','#ffe3a6');arc(g,rx,ry,rr*.8,0,Math.PI*2,'#ffdd85',Math.max(1,8*(1-t)),.8);
  }else if(r.kind==='shock'){
   ellipse(g,rx,ry,rr,rr*.82,null,r.color);
   arc(g,rx,ry,rr*.92,0,Math.PI*2,'#ddfcff',Math.max(1,8*(1-t)),.82);
   ellipse(g,rx,ry,rr*.73,rr*.6,null,'#65d9f5');
   for(let i=0;i<12;i++){const a=i*Math.PI/6,points=[rx+Math.cos(a)*rr*.68,ry+Math.sin(a)*rr*.55,rx+Math.cos(a+.06)*rr*.87,ry+Math.sin(a+.06)*rr*.71,rx+Math.cos(a)*rr,ry+Math.sin(a)*rr*.82];g.drawLines(0,0,points,'#b7f7ff',2)}
  }else if(r.kind==='electric'){
   for(let i=0;i<5;i++){const a=i*Math.PI/2.5+t*3;g.drawLines(0,0,[rx,ry,rx+Math.cos(a+.4)*rr*.6,ry+Math.sin(a+.4)*rr*.6,rx+Math.cos(a)*rr,ry+Math.sin(a)*rr],r.color,2)}
  }else if(r.kind==='heal'){
   arc(g,rx,ry,rr,0,Math.PI*2,'#b5f7a26b',3);
   for(let i=0;i<6;i++){const a=i*Math.PI/3+t;g.drawCircle(rx+Math.cos(a)*rr,ry+Math.sin(a)*rr,3*(1-t)+1,'#d7ffd4')}
  }else{arc(g,rx,ry,rr,t*3,t*3+Math.PI*1.7,r.color,4);arc(g,rx,ry,rr*.75,-t*3,-t*3+Math.PI*1.7,'#fff3c4',2)}
 }
 for(const slash of s.slashes){
  const t=1-slash.life/slash.max,a=slash.aim-Math.PI*.6+t*.65,px=slash.x-cx,py=slash.y*.65-cy-19;
  arc(g,px,py,slash.r*.88,a,a+(slash.full?Math.PI*2:Math.PI*1.15),slash.color,Math.max(1,11*(1-t)));
  arc(g,px,py,slash.r*.76,a+.1,a+(slash.full?Math.PI*2:Math.PI*1.1),'#fffbd8',Math.max(1,4*(1-t)));
  if(s.melee===2)for(let i=0;i<8;i++){const r=slash.r*.9,ang=a+i*.4;g.drawLines(0,0,[px+Math.cos(ang)*r*.65,py+Math.sin(ang)*r*.65,px+Math.cos(ang+.08)*r*.9,py+Math.sin(ang+.08)*r*.9,px+Math.cos(ang)*r,py+Math.sin(ang)*r],'#b3f5ff',2)}
 }
 for(const bolt of s.lightning){const x1=bolt.x-cx,y1=bolt.y*.65-cy-22,x2=bolt.tx-cx,y2=bolt.ty*.65-cy-22;const points=[x1,y1,x1+(x2-x1)*.32+8,y1+(y2-y1)*.32-8,x1+(x2-x1)*.62-8,y1+(y2-y1)*.62+8,x2,y2];g.drawLines(0,0,points,'#68b8ff',5);g.drawLines(0,0,points,'#e3fbff',2)}
 if(s.buff>0&&s.role===1){
  const pts=[];for(let i=0;i<=6;i++){const a=i*Math.PI/3+s.time*.15;pts.push(x+Math.cos(a)*48,y-29+Math.sin(a)*62)}
  poly(g,pts,'#72d5f312','#b5f7ff',2);
  arc(g,x,y-29,54,-s.time*2,-s.time*2+Math.PI*.75,'#e8feff',4,1.15);
  ellipse(g,x,y+2,43,13,null,'#9eedff');
 }
 if(s.buff>0&&s.role===0){
  for(let i=0;i<3;i++){const a=s.time*5+i*Math.PI*2/3;g.drawLines(0,0,[x+Math.cos(a)*31,y-26+Math.sin(a)*29,x+Math.cos(a+.3)*43,y-26+Math.sin(a+.3)*35,x+Math.cos(a+.5)*32,y-26+Math.sin(a+.5)*31],'#ffe8a2',2)}
 }
 if(s.muzzle>0){
  const a=s.p.aim,px=x+Math.cos(a)*37,py=y-21+Math.sin(a)*37,k=s.muzzle/.075;
  const pts=[];for(let i=0;i<10;i++){const ang=a+i*Math.PI/5,r=i%2?5:16*k+4;pts.push(px+Math.cos(ang)*r,py+Math.sin(ang)*r)}
  poly(g,pts,'#ffb34b');g.drawCircle(px,py,5+k*3,'#fff7d4');
 }
}

function drawActor(g,e,cx,cy,player){const x=e.x-cx,y=e.y*.65-cy;if(x<-90||x>570||y<-90||y>viewHeight+110)return;const type=player?state.role:TYPES[e.type].sprite,large=!player&&e.type>=3,size=player?65:large?(e.type===4?142:94):64,bob=Math.sin(player?e.walk:e.phase)*2;ellipse(g,x,y+2,size*.25,size*.085,'#12251d');if(player){ellipse(g,x,y,25,9,null,'#e4bc6c');if(state.buff>0)ellipse(g,x,y,34+Math.sin(state.time*8)*3,13,null,ROLES[state.role].color);}const tex=textures[type];if(tex){const facingLeft=player?Math.cos(e.aim)<0:state.p.x<e.x;const mirror=facingLeft?new Laya.Matrix(-1,0,0,1,2*x,0):null;g.drawTexture(tex,x-size/2,y-size+7+bob,size,size,mirror,e.flash>0?.65:player&&e.inv>0?.65:1)}if(!player&&e.slow>0){ellipse(g,x,y,20,7,null,'#aeeeff');g.fillText('❄',x,y-size-18,'16px Arial','#bdedff','center')}if(!player&&e.hp<e.maxHp){g.drawRect(x-19,y-size-6,38,3,'#24382d');g.drawRect(x-19,y-size-6,38*e.hp/e.maxHp,3,e.type===4?'#d37669':'#b2c483')}if(player){const a=e.aim,ex=x+Math.cos(a)*29,ey=y-20+Math.sin(a)*19;g.drawLine(x+Math.cos(a)*9,y-20+Math.sin(a)*6,ex,ey,'#162623',7);g.drawLine(x+Math.cos(a)*11,y-21+Math.sin(a)*7,ex,ey-1,'#aec2ac',3)}}
function draw(){if(!state||gameMode==='lobby')return;const s=state,g=world.graphics,f=fx.graphics;g.clear();f.clear();const cx=clamp(s.p.x-240,-160,830)+rand(-s.shake,s.shake),cy=clamp(s.p.y*.65-(viewHeight*.5-45),-viewHeight*.42,1105-viewHeight*.52)+rand(-s.shake,s.shake);ground.pos(-cx,-cy);for(const d of s.drops){const x=d.x-cx,y=d.y*.65-cy;if(x<-20||x>500||y<-20||y>viewHeight+20)continue;if(d.type==='xp'){poly(g,[x,y-5,x+4,y,x,y+5,x-4,y],'#eeb667','#ffe6a4');g.drawLine(x,y-3,x,y+2,'#fff1bc',1)}else{g.drawRect(x-7,y-6,14,12,'#dfddbc');g.drawRect(x-2,y-5,4,10,'#da775a');g.drawRect(x-5,y-2,10,4,'#da775a')}}drawGroundEffects(g,s,cx,cy);const objects=[...s.props.map(o=>({...o,prop:true})),...s.enemies,{...s.p,player:true}].sort((a,b)=>a.y-b.y);for(const o of objects){if(o.prop)drawProp(g,o,cx,cy);else drawActor(g,o,cx,cy,o.player)}drawEffects(f,s,cx,cy);
for(const b of s.bullets){const x=b.x-cx,y=b.y*.65-cy-21;if(b.enemy){f.drawCircle(x,y,6,'#b6cb57');f.drawCircle(x-1,y-1,2,'#eef5a0')}else{f.drawLine(x-b.vx*.017,y-b.vy*.65*.017,x,y,b.color||'#dfab61',b.pierce>2?7:4);f.drawLine(x-b.vx*.012,y-b.vy*.65*.012,x,y,'#fff0b9',1.5)}}for(const a of s.particles)f.drawCircle(a.x-cx,a.y*.65-cy-23,Math.max(.7,a.size*Math.min(1,a.life/(a.max||.3))),a.color);for(const a of s.floats)f.fillText(String(a.text),a.x-cx,a.y*.65-cy-55,'bold 14px Arial',a.color,'center');for(let i=0;i<20;i++){const x=(i*173+s.time*36)%540-30,y=(i*97+s.time*400)%(viewHeight+60)-30;f.drawLine(x,y,x-5,y+14,'#a4c4bb1c',1)}}
function frame(){const now=performance.now(),dt=Math.min(.04,(now-lastTime)/1000);lastTime=now;if(gameMode==='playing')tick(dt);if(gameMode!=='lobby'){draw();uiTime+=dt;if(uiTime>.08){updateHUD();uiTime=0}}}
function loadAssets(){const files=Array.from({length:8},(_,i)=>'sprites/character-'+i+'.png');Laya.loader.load(files.map(url=>({url,type:Laya.Loader.IMAGE})),Laya.Handler.create(null,()=>{textures=files.map(url=>Laya.loader.getRes(url));assetsReady=textures.every(Boolean);if(assetsReady){$('start').disabled=false;$('start').innerHTML='<span>进入隔离区</span><span>↗</span>'}else{$('engine-error').hidden=false;$('engine-error').textContent='角色素材加载失败，请刷新重试。'}}));}
try{if(!window.Laya)throw new Error('LayaAir unavailable');Laya.Browser.container=$('canvas-wrap');Laya.init(480,viewHeight,Laya.WebGL);Laya.stage.scaleMode='noscale';Laya.stage.alignH='left';Laya.stage.alignV='top';Laya.stage.bgColor='#283832';Laya.stage.size(480,viewHeight);ground=new Laya.Sprite();world=new Laya.Sprite();fx=new Laya.Sprite();Laya.stage.addChild(ground);Laya.stage.addChild(world);Laya.stage.addChild(fx);Laya.timer.frameLoop(1,null,frame);engineReady=true;document.querySelector('meta[name=viewport]').content='width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';loadAssets()}catch(e){console.error(e);$('engine-error').hidden=false;$('start').querySelector('span').textContent='游戏加载失败'}
$('start').onclick=startGame;$('pause').onclick=pauseGame;bindCombatPress('switch-gun',switchGun);bindCombatPress('reload-action',reload);bindCombatPress('skill-action',skill);bindCombatPress('melee-action',melee);
window.addEventListener('keydown',e=>{
 if(gameMode==='lobby')return;
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape','KeyJ'].includes(e.code))e.preventDefault();
 if(e.code==='Escape'){if(!e.repeat)pauseGame();return}
 if(gameMode!=='playing')return;
 keys[e.code]=true;if(e.repeat)return;
 if(e.code==='KeyQ')switchGun();if(e.code==='KeyR')reload();if(e.code==='KeyE')skill();if(e.code==='Space')melee();
});
window.addEventListener('keyup',e=>keys[e.code]=false);
window.addEventListener('blur',()=>{clearControls();if(gameMode==='playing')pauseGame()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearControls();if(gameMode==='playing')pauseGame()}});
const joystick=$('joystick');
function setJoy(e){
 const r=joystick.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/zoom,y=(e.clientY-r.top-r.height/2)/zoom;
 const d=Math.hypot(x,y),max=44;if(d>max){x=x/d*max;y=y/d*max}
 joy.x=x/max;joy.y=y/max;$('joy-knob').style.transform=`translate(${x}px,${y}px)`;
}
joystick.addEventListener('pointerdown',e=>{if(gameMode!=='playing'||joy.id!==null)return;e.preventDefault();joy.id=e.pointerId;joystick.setPointerCapture(e.pointerId);setJoy(e)});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===joy.id)setJoy(e)});
function releaseJoy(e){if(e.pointerId!==joy.id)return;joy.id=null;joy.x=joy.y=0;$('joy-knob').style.transform='translate(0,0)'}
for(const event of['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,releaseJoy);
const fireButton=$('fire-action');
fireButton.addEventListener('pointerdown',e=>{
 if(gameMode!=='playing'||firePointer!==null||(e.pointerType==='mouse'&&e.button!==0))return;
 e.preventDefault();firePointer=e.pointerId;fireButton.setPointerCapture(e.pointerId);fireButton.classList.add('pressed');
});
function releaseFire(e){if(e.pointerId!==firePointer)return;firePointer=null;fireButton.classList.remove('pressed')}
for(const event of['pointerup','pointercancel','lostpointercapture'])fireButton.addEventListener(event,releaseFire);
window.addEventListener('pointerup',releaseFire);window.addEventListener('pointercancel',releaseFire);
fireButton.addEventListener('contextmenu',e=>e.preventDefault());
function selectLoadoutTab(tab){
 for(const name of['survivor','equipment']){
  $('tab-'+name).setAttribute('aria-selected',name===tab);$('pane-'+name).hidden=name!==tab;
 }
}
$('tab-survivor').onclick=()=>selectLoadoutTab('survivor');$('tab-equipment').onclick=()=>selectLoadoutTab('equipment');

// Non-primary touch pointers do not reliably synthesize click while another finger drags.
// Trigger actions on their own pointerdown and never alter the joystick/fire pointer.
function bindCombatPress(id,action){
 const button=$(id);
 button.addEventListener('pointerdown',e=>{
  if(gameMode!=='playing'||combatPointers.has(id)||button.disabled||(e.pointerType==='mouse'&&e.button!==0))return;
  e.preventDefault();e.stopPropagation();combatPointers.set(id,e.pointerId);button.setPointerCapture(e.pointerId);
  button.classList.add('touch-pressed');action();
 });
 function release(e){if(e.pointerId!==combatPointers.get(id))return;combatPointers.delete(id);button.classList.remove('touch-pressed')}
 for(const type of['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,release);
 button.addEventListener('click',e=>{e.preventDefault();if(e.detail===0&&gameMode==='playing')action()});
}
