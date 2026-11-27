process.chdir(require('path').resolve(__dirname,'..'));
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const acorn={exports:{}};
new Function('module','exports',process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'])(acorn,acorn.exports);
global.window=global; global.document={addEventListener(){},hidden:false};
function empty(){}
global.PluginManager={parameters(n){return n==='SP_RecordData'?{'デモ開始スイッチ':'11','デモ進行変数':'12'}:{}}};
global.Graphics={boxWidth:816,boxHeight:624,width:816,height:624};
global.Bitmap=function(){this.clear=empty;this.fillRect=empty;this.gradientFillRect=empty;this.blt=empty};
global.Sprite=function(){this.scale={};this.addChild=empty};
global.ImageManager={loadSystem(){return {addLoadListener(f){f()}}},loadPicture(n){assert.equal(n,'SP_DemoDuct');return {width:256,height:192,addLoadListener(f){f()}}}};
function klass(parent,methods){function K(){this.initialize.apply(this,arguments)} K.prototype=Object.assign(Object.create(parent?parent.prototype:{}),methods);return K}
global.Window_Base=klass(null,{initialize(x,y,w,h){this.move(x,y,w,h);this.createContents()},createContents(){this.contents=new Bitmap()},contentsWidth(){return this.width-36},contentsHeight(){return this.height-36},move(x,y,w,h){Object.assign(this,{x,y,width:w,height:h})},setTone:empty,drawText:empty,drawIcon:empty,changeTextColor:empty,textPadding(){return 6},textWidth(s){return s.length*20}});
global.Window_Selectable=klass(Window_Base,{setHandler(k,f){(this.handlers||(this.handlers={}))[k]=f},refresh(){for(let i=0;i<this.maxItems();i++)this.drawItem(i)},itemRectForText(i){return {x:6,y:36*i,width:this.contentsWidth()-12}},select(i){this.i=i},index(){return this.i},activate:empty,setTopRow(n){this.top=n},topRow(){return this.top}});
global.Window_MenuCommand=klass(Window_Selectable,{addOriginalCommands:empty,addCommand(n,k){(this.list||(this.list=[])).push(k)},findSymbol(){return -1}});
global.Scene_MenuBase=klass(null,{initialize:empty,create(){this._windowLayer={x:0,y:0};this.createBackground()},createBackground:empty,start:empty,update:empty,addChild:empty,addWindow:empty,addChildAt:empty,getChildIndex(){return 0}});
for(const n of 'Menu Item Equip Skill Options Status Save GameEnd Map Battle'.split(' ')) global['Scene_'+n]=klass(Scene_MenuBase,{createCommandWindow(){this._commandWindow=new Window_MenuCommand()},createAllWindows:empty});
global.Game_Interpreter=klass(null,{initialize:empty,pluginCommand:empty});
global.Game_System=klass(null,{initialize:empty,playtime(){return 0}});
function vars(){return klass(null,{initialize(){this.data={}},setValue(i,v){this.data[i]=v},value(i){return this.data[i]||0}})}
global.Game_Variables=vars();global.Game_Switches=vars();
global.DataManager={setupNewGame(){global.$gameSystem=new Game_System();global.$gameVariables=new Game_Variables();global.$gameSwitches=new Game_Switches()},makeSaveContents(){return {system:$gameSystem,vars:$gameVariables.data,switches:$gameSwitches.data}},extractSaveContents(o){this.setupNewGame();Object.assign($gameSystem,o.system);$gameVariables.data=o.vars;$gameSwitches.data=o.switches}};
global.SceneManager={push(K){this._nextScene=new K()},prepareNextScene(k){this._nextScene.prepare(k)}};
global.$dataSkills=[null,{id:1,name:'攻撃',iconIndex:1},{id:2,name:'氷',iconIndex:45}];
global.$dataStates=[null,{id:1,name:'毒'}];global.$dataSystem={elements:['','火'],equipTypes:['','剣']};
global.TextManager={param(i){return '能力'+i}};
const actors=[1,2].map((id)=>({actorId(){return id},name(){return '仲間'+id},hp:12,mhp:20,mp:3,mmp:8,stateIcons(){return [4]},currentClass(){return {name:'斥候'}},level:5,param(i){return i+1},skills(){return $dataSkills.slice(1)},isLearnedSkill(i){return i===2},equips(){return [null]},equipSlots(){return [1]},elementRate(){return .5},isStateResist(){return true}}));
global.$gameActors={actor(i){return actors[i-1]}};global.$gameParty={members(){return actors},battleMembers(){return actors}};global.$gameTemp={};global.$gameMap={mapId(){return 1}};
const dir='js/plugins/';
const tacticalTest = process.argv.includes('--tactical');
if (tacticalTest) {
 for(const n of ['Game_Player','Game_Map','Game_Party','Game_Event','Game_Character','Game_CharacterBase','Sprite_Base','Sprite_Character','Spriteset_Map'])
    global[n]=klass(null,{initialize:empty});
 global.Window_Command=Window_Selectable;
 global.Window_SkillList=Window_Selectable;
 Window_Selectable.prototype.deactivate=empty;
 Window_Base.prototype.close=empty;
 Window_MenuCommand.prototype.findSymbol=function(k){return (this.list||[]).indexOf(k)};
 global.$gameMessage={busy:false,isBusy(){return this.busy},add:empty};
 global.AudioManager={saveBgm:empty,playBgm:empty,stopBgm:empty};
 Game_System.prototype.battleBgm=empty;
 const followers={show:empty,forEach:empty,follower(){return null},gather:empty};
 global.$gamePlayer={x:2,y:2,followers(){return followers},moveSpeed(){return 4},characterName(){return 'A'},characterIndex(){return 0}};
 for(const k of ['setImage','setMoveSpeed','setTp','setThrough','setTransparent','setOpacity','setWalkAnime','center'])$gamePlayer[k]=empty;
 for(const a of actors)Object.assign(a,{isAlive(){return true},characterName(){return 'A'},characterIndex(){return 0},setTp:empty});
 global.$dataEnemies=[null,{}];global.Game_Enemy=klass(null,{initialize:empty,isAlive(){return true}});
 const enemy={x:3,y:2,event(){return {note:'<ArcEnemy:1>'}},moveSpeed(){return 4},setMoveSpeed:empty,setWalkAnime:empty,eventId(){return 9}};
 Object.assign($gameMap,{width(){return 16},height(){return 16},events(){return [enemy]}});
 vm.runInThisContext(fs.readFileSync(dir+'Tactical_Battle.js','utf8'));
 // Test the lifecycle independently of tactical turn input and GPU drawing.
 ArcManager.update=empty; ArcManager.updateCooldown=empty;
 Scene_Map.prototype.updateArcGrid=empty;
}
vm.runInThisContext(fs.readFileSync('js/plugins/StarPickerMenu.js','utf8'));
for(const n of ['SP_RecordsCore','SP_RecordData','SP_QuestLog','SP_Archive','SP_ActorDetails','SP_BattleHUD']){
 const code=fs.readFileSync(dir+n+'.js','utf8');acorn.exports.parse(code,{ecmaVersion:5});vm.runInThisContext(code);
}
console.log('PASS ES5 parsing: 6 files; actual menu v4.5 loaded');
DataManager.setupNewGame();
const menu=new Scene_Menu();menu.createCommandWindow();menu._commandWindow.addOriginalCommands();
assert.deepEqual(menu._commandWindow.list,['arcComboSkill','spRecordsQUEST','spRecordsARCHIVE','spRecordsSTATUS']);
function cmd(s){let [key,...args]=s.split(' ');new Game_Interpreter().pluginCommand(key,args)}
function open(key){cmd('SP OPEN '+key);let s=SceneManager._nextScene;s.create();return s}
function enter(s,n){s.panel.select(n);s.enter()}
let s=open('QUEST');enter(s,0);assert.match(s.panel.rows[0].label,/未開始/);enter(s,0);assert.match(s.page.lines.join(''),/まだ受注/);
$gameSwitches.setValue(11,true);$gameVariables.setValue(12,2);$gameVariables.setValue(12,0);
s=open('QUEST');enter(s,0);enter(s,0);assert.match(s.page.lines.join(''),/排熱弁を起動/);
cmd('SP QUEST vent COMPLETE');cmd('SP QUEST vent 1');assert.equal(SPRecords.store('quests').vent,3);
s=open('QUEST');enter(s,0);enter(s,0);assert.equal(s.page.lines.filter(x=>x.startsWith('・')).length,3);
cmd('SP QUEST ledger 1');$gameVariables.setValue(12,3);
assert.equal(SPRecords.store('archive').duct,1);
s=open('ARCHIVE');enter(s,3);assert.equal(s.panel.rows[0].label,'？？？');
cmd('SP ARCHIVE note 1');cmd('SP ARCHIVE note 2');cmd('SP ARCHIVE note 1');
s=open('ARCHIVE');enter(s,3);enter(s,0);assert.equal(s.page.picture,'SP_DemoDuct');assert.match(s.page.lines[1],/略図/);
const save=JSON.parse(JSON.stringify(DataManager.makeSaveContents()));DataManager.extractSaveContents(save);
assert.equal(SPRecords.store('archive').note,2);assert.equal(SPRecords.store('quests').ledger,1);
DataManager.extractSaveContents({system:{},vars:{12:3},switches:{}});assert.equal(SPRecords.store('quests').vent,3);assert.equal(SPRecords.store('archive').note,undefined);
console.log('PASS menu registration, stages, switch/variable rules, archive masking/picture, save roundtrip/legacy');
s=open('STATUS');enter(s,1);for(let i=0;i<5;i++){enter(s,i);assert.ok(s.page.lines.length);if(i===2)assert.match(s.page.lines.join(''),/50%/);if(i===3)assert.match(s.page.lines.join(''),/無効/);if(i===4)assert.deepEqual(s.page.lines,['氷']);s.back()}
enter(s,2);s.cycleActor(-1);assert.match(s.page.title,/仲間1/);s.cycleActor(1);assert.match(s.page.title,/仲間2/);s.back();assert.equal(s.panel.rows[5].icon,1);
let sceneClass=s.constructor;enter(s,5);assert.equal(SceneManager._nextScene._spInitialActorId,2);ArcManager.setComboSkillId(2,2);
s=new sceneClass();s.create();assert.equal(s.panel.rows[5].icon,45);assert.equal(s.panel.index(),5);
function hud(K){let scene=new K();scene._windowLayer={x:0,y:0};scene.createAllWindows();scene.update();return scene}
if(tacticalTest){
 const map=hud(Scene_Map), view=map._spRecordHud;
 assert.equal(view.visible,false);
 cmd('ArcStart 5');map.update();
 assert.equal(view.visible,true);
 assert.deepEqual(JSON.parse(view._signature).map(r=>r[0]),[1]);
 assert.equal(view.y,60); assert.equal(view.x+view.width,Graphics.boxWidth-104);
 ArcManager.setComboSkillId(1,2);actors[0].hp=4;map.update();
 assert.equal(JSON.parse(view._signature)[0][2],4);
 assert.equal(JSON.parse(view._signature)[0][6],45);
 for(const key of ['message','cutin','skill']){
   $gameMessage.busy=key==='message'; ArcManager._cutinTimer=key==='cutin'?12:0;
   ArcManager._phase=key==='skill'?'skillSelect':'command';map.update();assert.equal(view.visible,false);
 }
 ArcManager._phase='turnOrder';map.update();assert.equal(view.visible,true);
 ArcManager.endBattle('終了',true);map.update();assert.equal(view.visible,false);
 cmd('ArcStart 5');map.update();assert.equal(view.visible,true);
 ArcManager.finishBattleOnTransfer();map.update();assert.equal(view.visible,false);
 $gameMap.events=()=>[];cmd('ArcStart 5');map.update();assert.equal(view.visible,false);
 console.log('PASS supplied Tactical_Battle ArcStart, deployed actor filtering, menu/skill sync, temporary hiding, end/transfer/no enemies');
 process.exit(0);
}
let map=hud(Scene_Map);assert.equal(map._spRecordHud.visible,false);cmd('SP HUD ON');map.update();assert.equal(map._spRecordHud.visible,true);
let rows=JSON.parse(map._spRecordHud._signature);assert.equal(rows[1][6],45);assert.deepEqual(rows[1][7],[4]);actors[1].hp=3;map.update();assert.equal(JSON.parse(map._spRecordHud._signature)[1][2],3);
cmd('SP HUD OFF');map.update();assert.equal(map._spRecordHud.visible,false);
assert.equal(hud(Scene_Battle)._spRecordHud.visible,true);
console.log('PASS actor sections, combo adapter/return, HUD lifecycle, HP/state/skill values');
const failures=[];
const warn=console.warn; console.warn=(...v)=>failures.push(v);
cmd('SP ARCHIVE missing 1');cmd('SP ARCHIVE note 2.5');cmd('SP QUEST vent 999');console.warn=warn;
assert.equal(failures.length,3);assert.equal(SPRecords.store('archive').note,undefined);
DataManager.setupNewGame();assert.deepEqual(SPRecords.store('quests'),{});
for(const [name,settings] of [['SP_Archive',{'未発見表示':'非表示'}],['SP_BattleHUD',{'標準戦闘に表示':'false','マップ戦闘スイッチ':'13','MPを表示':'false','状態を表示':'false','設定技を表示':'false'}]]){
 PluginManager.parameters=()=>settings;
 if(name==='SP_BattleHUD')global.Scene_Map=klass(Scene_MenuBase,{createAllWindows:empty});
 vm.runInThisContext(fs.readFileSync(dir+name+'.js','utf8'));
}
s=open('ARCHIVE');enter(s,3);assert.equal(s.panel.rows[0].label,'表示できる記録はありません');
map=hud(Scene_Map);cmd('SP HUD ON');map.update();assert.equal(map._spRecordHud.visible,false);
$gameSwitches.setValue(13,true);map.update();assert.equal(map._spRecordHud.visible,true);
assert.deepEqual(JSON.parse(map._spRecordHud._signature)[0].slice(4),[0,0,0,[]]);
$gameSwitches.setValue(13,false);map.update();assert.equal(map._spRecordHud.visible,false);
console.log('PASS invalid commands, fresh game isolation, hidden records, HUD switch and field controls');
