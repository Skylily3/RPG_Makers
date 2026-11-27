/*:
 * @plugindesc v1.2 STAR PICKER 戦闘HUD（MV標準戦闘／マップ戦闘）
 * @param 戦術戦闘の全員一覧
 * @type boolean
 * @default false
 * @desc ONで従来のパーティ一覧も追加表示します。
 * @param マップ曲を継続する戦闘曲名
 * @default LICON_mix
 * @desc 戦術戦闘BGMがこの名前ならマップ曲を継続。空欄で本来の戦闘曲を再生します。
 * @param 標準戦闘に表示
 * @type boolean
 * @default true
 * @param 戦術戦闘に自動連動
 * @type boolean
 * @default true
 * @desc Tactical_Battle.js の戦闘中だけ実際に配置された味方を表示します。
 * @param マップ戦闘スイッチ
 * @type switch
 * @default 0
 * @param 表示位置
 * @type select
 * @option 右上
 * @option 左上
 * @option 右下
 * @option 左下
 * @default 右上
 * @param 横幅
 * @type number
 * @min 220
 * @default 320
 * @param MPを表示
 * @type boolean
 * @default true
 * @param 状態を表示
 * @type boolean
 * @default true
 * @param 設定技を表示
 * @type boolean
 * @default true
 * @help SP_RecordsCore の下に配置。操作を受け取らない追加表示です。
 * Tactical_Battle使用時は自動連動ON・スイッチ0で動作します。
 * 自動連動をOFFにするか、Tactical_Battle未使用のときは SP HUD ON / SP HUD OFF を開始・終了イベントに記入するか、
 * 「マップ戦闘スイッチ」を指定し、戦闘中だけONにします（スイッチ優先）。
 * 標準戦闘のコマンド・対象選択・進行処理は既存システムに任せます。
 */
window.StarPickerModules = window.StarPickerModules || {};
window.StarPickerModules.SP_BattleHUD = function() {
    'use strict';
    var S = window.SPRecords, p = PluginManager.parameters('SP_BattleHUD');
    var anchor = p['表示位置'] || '右上', switchId = Number(p['マップ戦闘スイッチ']) || 0;
    var autoTactical = p['戦術戦闘に自動連動'] !== 'false';
    var showMp = p['MPを表示'] !== 'false', showStates = p['状態を表示'] !== 'false';
    var showSkill = p['設定技を表示'] !== 'false';
    S.command('HUD',function(args) {
        var cmd = String(args[0]).toUpperCase();
        if (cmd === 'ON' || cmd === 'OFF')
            $gameTemp._spHudMap = cmd === 'ON' ? $gameMap.mapId() : 0;
    });
    function Hud() { this.initialize.apply(this,arguments); }
    Hud.prototype = Object.create(Window_Base.prototype);
    Hud.prototype.constructor = Hud;
    Hud.prototype.standardPadding = function() { return 8; };
    Hud.prototype.initialize = function() {
        var width = Math.min(Graphics.boxWidth,Math.max(220,Number(p['横幅']) || 320));
        Window_Base.prototype.initialize.call(this,0,0,width,64);
        this.opacity = 0;
        this.visible = false;
        this._signature = '';
        var self = this;
        ImageManager.loadSystem('IconSet').addLoadListener(function() { self._signature = ''; });
    };
    Hud.prototype.sync = function(actors,tactical) {
        if (!actors.length) { this.visible = false; return; }
        var data = actors.map(function(a) {
            var skill = showSkill && S.combo(a);
            var row = [a.actorId(),a.name(),a.hp,a.mhp,showMp ? a.mp : 0,showMp ? a.mmp : 0,
                skill ? skill.iconIndex : 0,showStates ? a.stateIcons() : []];
            return row;
        });
        var key = JSON.stringify(data);
        if (key === this._signature) return;
        this._signature = key;
        var stride = 56, h = Math.min(Graphics.boxHeight,data.length*stride+16);
        var margin = tactical ? 104 : 0;
        var x = anchor.indexOf('右')>=0 ? Math.max(0,Graphics.boxWidth-this.width-margin) : 0;
        var y = anchor.indexOf('下')>=0 ? Graphics.boxHeight-h : (tactical ? 60 : 0);
        this.move(x,Math.max(0,Math.min(y,Graphics.boxHeight-h)),this.width,h);
        this.createContents();
        var win = this, width = this.contentsWidth();
        data.forEach(function(row,i) {
            var y = i*stride, x = width;
            win.contents.gradientFillRect(0,y,width,stride-2,'#21396b','#0b142d');
            win.contents.fontSize = 18;
            if (showSkill && row[6]) {
                x -= 34;
                win.drawIcon(row[6],x,y+1);
                win.contents.fillRect(x,y+32,32,2,'#ffdc91');
            }
            if (showStates) {
                var icons = row[7], slots = Math.max(0,Math.floor((x-width*0.45)/34));
                var count = Math.min(slots,icons.length);
                for (var j=0;j<count;j++) {
                    x -= 34;
                    if (j === count-1 && icons.length>count)
                        win.drawText('+'+(icons.length-j),x,y-2,32,'center');
                    else win.drawIcon(icons[j],x,y+1);
                }
            }
            win.changeTextColor('#fff6db');
            win.drawText(row[1],6,y-2,x-10);
            var w = Math.floor((width-16)/(showMp ? 2 : 1));
            function gauge(label,value,max,left,color) {
                win.contents.fillRect(left,y+49,w,4,'#090e1a');
                var fill = max>0 ? Math.round(w*Math.min(1,Math.max(0,value/max))) : 0;
                if (fill) win.contents.fillRect(left,y+49,fill,4,color);
                win.contents.fontSize = 15;
                win.changeTextColor('#f5f7ff');
                win.drawText(label+' '+value+'/'+max,left,y+20,w);
            }
            gauge('HP',row[2],row[3],5,'#7bc6a2');
            if (showMp) gauge('MP',row[4],row[5],w+11,'#80a9eb');
        });
    };
    // Keep map audio continuous for the configured unavailable battle track.
    var keepTrack = p['マップ曲を継続する戦闘曲名'];
    if (keepTrack === undefined) keepTrack = 'LICON_mix';
    var manager = window.ArcManager;
    if (manager && manager.playBattleBgm && manager.stopBattleBgm && keepTrack) {
        var play = manager.playBattleBgm, stop = manager.stopBattleBgm;
        var keptMapAudio = false;
        manager.playBattleBgm = function() {
            var bgm = $gameSystem.battleBgm();
            keptMapAudio = !!(bgm && bgm.name === keepTrack);
            if (!keptMapAudio) return play.apply(this,arguments);
        };
        manager.stopBattleBgm = function() {
            if (!keptMapAudio) return stop.apply(this,arguments);
            keptMapAudio = false;
        };
    }

    function compactStatus(win) {
        var width = Math.min(264,Graphics.boxWidth), height = 82;
        win.padding = 4;
        win.move(Math.max(0,Graphics.boxWidth-width-104),Math.max(0,Graphics.boxHeight-height-12),width,height);
        win.opacity = 0;
        win.createContents();
        var last = '', icons = ImageManager.loadSystem('IconSet');
        icons.addLoadListener(function() { last = ''; });
        win.refresh = function() {
            var a = this._actor;
            if (!a) { this.contents.clear(); last = ''; return; }
            var skill = showSkill && S.combo(a);
            var states = showStates ? a.stateIcons() : [];
            var face = ImageManager.loadFace(a.faceName());
            var ready = face.isReady();
            var key = JSON.stringify([a.actorId(),a.name(),a.faceName(),a.faceIndex(),ready,a.hp,a.mhp,
                a.mp,a.mmp,states,skill && skill.iconIndex]);
            if (key === last) return;
            last = key;
            var bmp = this.contents, w = this.contentsWidth(), h = this.contentsHeight();
            bmp.clear();
            bmp.gradientFillRect(0,0,w,h,'rgba(22,39,69,0.94)','rgba(8,17,33,0.91)');
            bmp.fillRect(0,0,3,h,'#d9ba80');
            if (ready) {
                var i = a.faceIndex(), fw = Window_Base._faceWidth, fh = Window_Base._faceHeight;
                bmp.blt(face,i%4*fw,Math.floor(i/4)*fh,fw,fh,8,8,56,56);
            }
            var x = 71, lineW = w-x-8, right = w-8;
            function icon(index) {
                right -= 20;
                bmp.blt(icons,index%16*32,Math.floor(index/16)*32,32,32,right,6,18,18);
            }
            if (skill && skill.iconIndex) { icon(skill.iconIndex); bmp.fillRect(right,25,18,1,'#e6c886'); }
            var count = Math.min(2,states.length);
            if (states.length > count) {
                right -= 20;
                bmp.fontSize = 12; bmp.textColor = '#e4eafa';
                bmp.drawText('+'+(states.length-1),right,5,20,20,'center');
                count = 1;
            }
            for (var j=0;j<count;j++) icon(states[j]);
            bmp.fontSize = 18; bmp.textColor = '#fff3d8';
            bmp.drawText(a.name(),x,2,Math.max(1,right-x-3),24,'left');
            function stat(label,value,max,y,color) {
                bmp.fontSize = 13; bmp.textColor = '#c3d0e6';
                bmp.drawText(label,x,y,lineW,17,'left');
                bmp.textColor = '#f2f5fa';
                bmp.drawText(value+' / '+max,x,y,lineW,17,'right');
                bmp.fillRect(x,y+17,lineW,3,'#080e18');
                var fill = Math.round(lineW*Math.min(1,Math.max(0,value/Math.max(1,max))));
                if (fill) bmp.fillRect(x,y+17,fill,3,color);
            }
            stat('HP',a.hp,a.mhp,showMp ? 27 : 38,'#85d4ab');
            if (showMp) stat('MP',a.mp,a.mmp,49,'#8faff4');
        };
    }
    function attach(sceneClass, map) {
        var proto = sceneClass.prototype, create = proto.createAllWindows, update = proto.update;
        proto.createAllWindows = function() {
            create.apply(this,arguments);
            if (map && this._arcStatusWindow) compactStatus(this._arcStatusWindow);
            var hud = this._spRecordHud = new Hud();
            // Below the entire native window layer, in its box coordinate system.
            var host = new Sprite();
            host.x = this._windowLayer.x;
            host.y = this._windowLayer.y;
            host.addChild(hud);
            this.addChildAt(host,this.getChildIndex(this._windowLayer));
        };
        proto.update = function() {
            update.apply(this,arguments);
            var hud = this._spRecordHud;
            if (!hud) return;
            var arc = map && window.ArcManager;
            var tactical = !!(arc && typeof arc.startBattle === 'function' && Array.isArray(arc._units));
            if (tactical && p['戦術戦闘の全員一覧'] !== 'true') { hud.visible = false; return; }
            if (tactical && autoTactical) {
                hud.visible = !!(arc._active && (!switchId || $gameSwitches.value(switchId)) &&
                    !$gameMessage.isBusy() && arc._cutinTimer <= 0 && arc._phase !== 'skillSelect');
                if (hud.visible) {
                    var members = arc._units.filter(function(unit) {
                        return unit && unit._arcIsActor && unit._arcBattler;
                    }).map(function(unit) { return unit._arcBattler; });
                    hud.sync(members,true);
                }
                return;
            }
            hud.visible = map ? !!(switchId ? $gameSwitches.value(switchId) :
                $gameTemp._spHudMap === $gameMap.mapId()) : true;
            if (hud.visible) hud.sync($gameParty.battleMembers(),false);
        };
    }
    if (p['標準戦闘に表示'] !== 'false') attach(Scene_Battle,false);
    attach(Scene_Map,true);
};
