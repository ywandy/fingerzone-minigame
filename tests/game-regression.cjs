const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const elements=new Map();const handlers=new Map();
function el(id){if(!elements.has(id))elements.set(id,{id,style:{setProperty(k,v){this[k]=v}},dataset:{},hidden:false,textContent:'',innerHTML:'',classList:{add(){},remove(){},toggle(){}},querySelector:s=>el(id+s),setAttribute(k,v){this[k]=v},addEventListener(type,f){handlers.set(id+':'+type,f)},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:140*.8125,height:140*.8125}}});return elements.get(id)}
let draws=0;
const graphics=new Proxy({},{get:(_,k)=>(...args)=>{draws++;for(const n of args)if(typeof n==='number')assert(Number.isFinite(n),'nonfinite graphics '+k)}});
class Sprite{constructor(){this.graphics=graphics}pos(){}}
const Laya={Matrix:class Matrix{},Browser:{},init(){},WebGL:{},stage:{size(){},addChild(){}},Sprite,timer:{frameLoop(){}},Loader:{IMAGE:'image'},loader:{load(files,cb){cb()},getRes(){return {}}},Handler:{create(a,f){return f}}};
const context={console,Math,performance:{now:()=>0},setTimeout:()=>{},innerWidth:390,innerHeight:844,getComputedStyle:()=>({paddingLeft:0,paddingRight:0,paddingTop:0,paddingBottom:0}),document:{getElementById:el,querySelector:el,querySelectorAll:()=>[],addEventListener(t,f){handlers.set('document:'+t,f)},body:el('body')},window:{Laya,addEventListener(t,f){handlers.set('window:'+t,f)}},Laya};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/upgrades.js'),'utf8'),context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/game.js'),'utf8'),context);
const run=s=>vm.runInContext(s,context),near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const event=(id,type,more={})=>handlers.get(id+':'+type)({pointerId:2,pointerType:'touch',button:0,clientX:90,clientY:55,preventDefault(){},stopPropagation(){},isPrimary:false,...more});
function gain(id){run(`gameMode='upgrade';state.offeredCards=[UPGRADE_CARDS.find(c=>c.id==='${id}')];chooseUpgrade('${id}')`)}
run('startGame();state.props=[];state.enemies=[];state.spawn=999');
event('joystick','pointerdown',{pointerId:1});event('fire-action','pointerdown',{pointerId:2});
const firstX=run('state.p.x');run('tick(.03)');assert(run('state.p.x')>firstX);
event('skill-action','pointerdown',{pointerId:3});assert(run('state.buff>0&&state.skillCd>0'));assert(run('joy.id===1&&firePointer===2'),'skill must preserve other fingers');
const skillMoveX=run('state.p.x');run('tick(.03)');assert(run('state.p.x')>skillMoveX);
event('melee-action','pointerdown',{pointerId:4});assert(run('state.meleeCd>0'));assert(run('joy.id===1&&firePointer===2'),'melee must preserve other fingers');
const meleeMoveX=run('state.p.x');run('tick(.03)');assert(run('state.p.x')>meleeMoveX);
event('skill-action','pointerup',{pointerId:3});event('melee-action','pointercancel',{pointerId:4});assert(run('joy.id===1&&fireHeld()'));
// Pointerdown + synthesized click must not double-trigger one tap.
run('state.gun=0');event('switch-gun','pointerdown',{pointerId:5});assert.equal(run('state.gun'),1);event('switch-gun','click',{detail:1});assert.equal(run('state.gun'),1);event('switch-gun','pointerup',{pointerId:5});event('switch-gun','click',{detail:0});assert.equal(run('state.gun'),2);
run('pauseGame()');assert(run('combatPointers.size===0&&!fireHeld()'));run('pauseGame()');
// Cards persist across weapon switches, reject duplicate application and stop appearing at max rank.
run('startGame();state.enemies=[];state.props=[]');gain('multishot');run('keys.KeyJ=true;shoot()');assert.equal(run('state.bullets.length'),3);const center=run('state.bullets[0].damage'),side=run('state.bullets[1].damage');near(side,center*.65);
assert.equal(run("chooseUpgrade('multishot')"),false);assert.equal(run("rank('multishot')"),1);
gain('multishot');gain('multishot');assert(!run("eligibleCards().some(c=>c.id==='multishot')"));assert.equal(run("rank('multishot')"),3);
run('switchGun()');assert.equal(run("rank('multishot')"),3);
gain('pierce');run('state.fire=0;state.bullets=[];keys.KeyJ=true;shoot()');assert.equal(run('state.bullets[0].pierce'),4);
// Multiple cards change mechanics rather than only their displayed descriptions.
run('startGame();state.props=[];state.enemies=[]');gain('chain');run(`state.enemies=[0,40,80].map(d=>({x:600+d,y:800,type:0,hp:100,maxHp:100,r:14,stun:0}));onBulletContact(state.enemies[0],{damage:40})`);assert.equal(run('state.lightning.length'),2);near(run('state.enemies[1].hp'),74);
run('startGame();state.props=[];state.enemies=[]');gain('blast');run(`state.enemies=[0,40,80].map(d=>({x:600+d,y:800,type:0,hp:30,maxHp:30,r:14,stun:0}));hit(state.enemies[0],40)`);assert.equal(run('state.kills'),3);assert.equal(run("state.rings.filter(r=>r.kind==='explosion').length"),1,'secondary explosions must not recurse');
run('startGame();state.props=[];state.enemies=[]');gain('frost');run(`state.enemies=[{x:600,y:800,type:0,hp:100,maxHp:100,r:14,stun:0}];onBulletContact(state.enemies[0],{damage:40})`);near(run('state.enemies[0].slowFactor'),.65);assert.equal(run('state.enemies[0].slow'),2);
gain('blade');gain('blade');assert(run('meleeStats().full'));near(run('meleeStats().range'),run('MELEES[state.melee].range*1.6'));
gain('tactics');near(run('skillCooldown()'),run('ROLES[state.role].cd*.8'));assert(run('state.skillCd===0&&state.meleeCd===0'));
gain('rapid');near(run('reloadDuration(0)'),run('GUNS[0].reload*.8'));
gain('vampire');run('state.p.hp=40;hit(state.enemies[0],999)');assert.equal(run('state.p.hp'),41);
gain('armor');assert.equal(run('state.p.maxHp'),135);run('state.p.hp=100;state.p.inv=0;hurt(20)');near(run('state.p.hp'),83);
gain('magnet');run('state.drops=[{x:state.p.x,y:state.p.y,type:"xp",value:1}];state.xp=0;state.spawn=999;tick(.01)');near(run('state.xp'),1.3);
for(let role=0;role<3;role++){run(`selectedRole=${role};startGame();state.props=[];state.enemies=[];state.p.hp=10`);gain('awaken');run('skill();draw()');if(role===0)assert.equal(run('state.buff'),8);if(role===1)near(run('skillRadius(270)'),337.5);if(role===2)assert.equal(run('state.p.hp'),90)}
run('startGame()');
for(let i=0;i<250;i++){run('state.offeredCards=rollCards(state)');assert.equal(run('state.offeredCards.length'),3);assert.equal(run('new Set(state.offeredCards.map(c=>c.id)).size'),3);assert(run('state.offeredCards.some(c=>c.mechanic)'))}
run('state.xp=state.need;checkLevel()');assert.equal(run('gameMode'),'upgrade');const original=run('state.offeredCards.map(c=>c.id).join()');el('reroll-cards').onclick();assert.equal(run('state.rerolls'),2);assert.notEqual(run('state.offeredCards.map(c=>c.id).join()'),original);el('reroll-cards').onclick();el('reroll-cards').onclick();el('reroll-cards').onclick();assert.equal(run('state.rerolls'),0);
// Exhausted card pools still allow the run to continue safely.
run('for(const c of UPGRADE_CARDS)state.build[c.id]=c.max;state.offeredCards=rollCards(state)');assert.equal(run('state.offeredCards[0].id'),'supply');assert(run("chooseUpgrade('supply')"));
// Full match with real card selection; all effects exercised again under a dense horde.
run(`selectedRole=0;startGame();for(let i=0;i<19000;i++){
 if(gameMode==='upgrade')chooseUpgrade(state.offeredCards[0].id);
 if(gameMode!=='playing')break;state.p.hp=state.p.maxHp;state.p.inv=1;joy.x=Math.cos(i*.009);joy.y=Math.sin(i*.009);keys.KeyJ=true;
 if(i%75===0)melee();if(i%800===0)skill();tick(1/60);if(i%30===0)draw();
 if(!Number.isFinite(state.p.x+state.p.y))throw Error('invalid movement');
}`);
assert(run('state.bossSpawned'));assert(run('state.particles.length<=280&&state.lightning.length<=30&&state.bullets.length<=550'));assert(run('state.kills>100'));
console.log('PASS: non-primary multi-touch skill/melee during movement + fire, no double click, all 12 card mechanics, max ranks, nonduplicate offers, rerolls, exhausted pool, 316s match.');
console.log(JSON.stringify({kills:run('state.kills'),level:run('state.level'),build:run('state.build')}));
