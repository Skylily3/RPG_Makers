/*:
 * @plugindesc STAR PICKER 記録画面の共通UI・進行管理（MV）
 * @param 本文サイズ
 * @type number
 * @min 16
 * @max 28
 * @default 22
 * @help StarPickerMenu の下、SP各機能の上に配置します。登録済み画面は
 * メニューと SP OPEN QUEST / ARCHIVE / STATUS から開けます。
 * 決定で下の階層へ、取消で戻ります。本文は上下にスクロールできます。
 */
window.StarPickerModules = window.StarPickerModules || {};
window.StarPickerModules.SP_RecordsCore = function() {
    'use strict';
    var S = window.SPRecords = {};
    var screens = {}, commands = {}, watchers = [];
    var menuSkin, returnFrame;
    var size = Math.max(16, Math.min(28, Number(PluginManager.parameters('SP_RecordsCore')['本文サイズ']) || 22));
    S.register = function(key, title, root) {
        screens[key] = {title: title, root: root};
    };
    S.command = function(key, handler) { commands[key] = handler; };
    S.store = function(key) {
        var book = $gameSystem._spRecords || ($gameSystem._spRecords = {});
        return book[key] || (book[key] = {});
    };
    S.combo = function(actor) {
        return actor && window.ArcManager && ArcManager.getComboSkillId ?
            $dataSkills[ArcManager.getComboSkillId(actor.actorId())] : null;
    };
    S.matches = function(rule) {
        if (!rule || !(rule.switchId > 0 || rule.variableId > 0)) return false;
        return (!(rule.switchId > 0) || $gameSwitches.value(rule.switchId)) &&
            (!(rule.variableId > 0) || $gameVariables.value(rule.variableId) >= Number(rule.min));
    };
    S.watch = function(fn) { watchers.push(fn); };
    function sync(kind, id) {
        if ($gameSystem && $gameVariables && $gameSwitches) {
            watchers.forEach(function(fn) { fn(kind, id); });
        }
    }
    function observe(klass, kind) {
        var set = klass.prototype.setValue;
        klass.prototype.setValue = function(id, value) {
            var before = this.value(id);
            set.apply(this, arguments);
            if (this.value(id) !== before) sync(kind, id);
        };
    }
    observe(Game_Switches, 'switchId');
    observe(Game_Variables, 'variableId');
    ['setupNewGame','extractSaveContents'].forEach(function(method) {
        var original = DataManager[method];
        DataManager[method] = function() {
            var result = original.apply(this, arguments);
            sync();
            return result;
        };
    });
    S.progress = function(key, records, stages, onAdvance) {
        var byId = Object.create(null), triggers = {};
        function advance(id, step) {
            var entry = byId[id];
            if (!entry || !isFinite(step) || step !== Math.floor(step) ||
                step < 1 || step > stages(entry).length) {
                console.warn('STAR PICKER: ID・段階を確認してください', key, id, step);
                return;
            }
            S.store(key)[id] = Math.max(S.store(key)[id] || 0, step);
            if (onAdvance) onAdvance(entry, step);
        }
        var all = [];
        records.forEach(function(entry) {
            if (!/^[A-Za-z0-9_-]+$/.test(entry.id) || entry.id in {} || byId[entry.id])
                throw new Error(key + ' のIDが重複または無効: ' + entry.id);
            byId[entry.id] = entry;
            stages(entry).forEach(function(stage, i) {
                if (!stage.when) return;
                function check() { if (S.matches(stage.when)) advance(entry.id, i + 1); }
                all.push(check);
                ['switchId','variableId'].forEach(function(type) {
                    if (!stage.when[type]) return;
                    var index = type + stage.when[type];
                    (triggers[index] || (triggers[index] = [])).push(check);
                });
            });
        });
        S.watch(function(kind, id) {
            (kind ? triggers[kind + id] || [] : all).forEach(function(check) { check(); });
        });
        return {advance:advance, level:function(id) {
            return Math.min(S.store(key)[id] || 0, stages(byId[id]).length);
        }};
    };
    S.item = function(label, next, icon) { return {label:label, next:next, icon:icon}; };
    S.page = function(title, items) { return {title:title, items:items}; };
    S.article = function(title, lines, picture) { return {title:title, lines:lines, picture:picture}; };
    S.open = function(key) {
        if (!screens[key]) return;
        if (SceneManager._scene instanceof Scene_Menu)
            menuSkin = SceneManager._scene._commandWindow.windowskin;
        returnFrame = null;
        SceneManager.push(BookScene);
        SceneManager.prepareNextScene(key);
    };
    var originalCommands = Window_MenuCommand.prototype.addOriginalCommands;
    Window_MenuCommand.prototype.addOriginalCommands = function() {
        originalCommands.call(this);
        Object.keys(screens).forEach(function(key) {
            this.addCommand(screens[key].title, 'spRecords' + key, true);
        }, this);
    };
    var createMenu = Scene_Menu.prototype.createCommandWindow;
    Scene_Menu.prototype.createCommandWindow = function() {
        createMenu.call(this);
        Object.keys(screens).forEach(function(key) {
            this._commandWindow.setHandler('spRecords' + key, S.open.bind(S, key));
        }, this);
    };
    var pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(cmd, args) {
        pluginCommand.apply(this, arguments);
        if (String(cmd).toUpperCase() !== 'SP') return;
        var key = String(args[0]).toUpperCase();
        if (key === 'OPEN') S.open(String(args[1]).toUpperCase());
        else if (commands[key]) commands[key](args.slice(1));
    };

    function Rows() { this.initialize.apply(this, arguments); }
    Rows.prototype = Object.create(Window_Selectable.prototype);
    Rows.prototype.constructor = Rows;
    Rows.prototype.maxItems = function() { return this.rows ? this.rows.length : 0; };
    Rows.prototype.drawItem = function(i) {
        var row = this.rows[i], r = this.itemRectForText(i), inset = 0;
        this.contents.fontSize = size;
        if (row.icon > 0) {
            this.drawIcon(row.icon, r.x, r.y + 2);
            inset = 38;
        }
        this.changeTextColor(row.heading ? '#ffdc91' : '#f5f7ff');
        this.drawText(row.label, r.x + inset, r.y, Math.max(1,r.width - inset));
    };
    function wrap(win, lines) {
        var result = [], width = win.contentsWidth() - 2 * win.textPadding() - 4;
        win.contents.fontSize = size;
        lines.forEach(function(line) {
            String(line).split('\n').forEach(function(part) {
                var heading = part.charAt(0) === '◆', buf = '';
                for (var i = 0; i < part.length; i++) {
                    var ch = part.charAt(i);
                    if (/[\uD800-\uDBFF]/.test(ch) && i+1 < part.length) ch += part.charAt(++i);
                    if (buf && win.textWidth(buf + ch) > width) {
                        result.push({label:buf, heading:heading});
                        buf = '';
                    }
                    buf += ch;
                }
                result.push({label:buf, heading:heading});
            });
        });
        return result;
    }
    function BookScene() { this.initialize.apply(this, arguments); }
    BookScene.prototype = Object.create(Scene_MenuBase.prototype);
    BookScene.prototype.constructor = BookScene;
    BookScene.prototype.createBackground = function() {
        var bmp = new Bitmap(1,128);
        bmp.gradientFillRect(0,0,1,128,'#172643','#070d1b',true);
        this._backgroundSprite = new Sprite(bmp);
        this._backgroundSprite.scale.x = Graphics.width;
        this._backgroundSprite.scale.y = Graphics.height/128;
        this.addChild(this._backgroundSprite);
    };
    BookScene.prototype.prepare = function(key) { this.key = key; };
    BookScene.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        if (returnFrame && !this.key) {
            this.key = returnFrame.key;
            this.frames = returnFrame.frames;
            returnFrame = null;
        } else this.frames = [{make:screens[this.key].root, index:0, top:0}];
        var w = Graphics.boxWidth, h = Graphics.boxHeight;
        this.header = new Window_Base(0,0,w,72);
        this.panel = new Rows(0,72,w,h-72);
        this.picture = new Window_Base(0,72,Math.max(80,Math.floor(w*0.32)),h-72);
        [this.header,this.picture,this.panel].forEach(function(win) {
            win.setTone(-28,-12,26);
            if (menuSkin) win.windowskin = menuSkin;
            this.addWindow(win);
        }, this);
        this.panel.setHandler('ok',this.enter.bind(this));
        this.panel.setHandler('cancel',this.back.bind(this));
        if (this.key === 'STATUS') {
            this.panel.setHandler('pageup',this.cycleActor.bind(this,-1));
            this.panel.setHandler('pagedown',this.cycleActor.bind(this,1));
        }
        this.renderPage();
    };
    BookScene.prototype.renderPage = function() {
        var frame = this.frames[this.frames.length-1], page = frame.make();
        var panel = this.panel, pic = this.picture;
        this.page = page;
        this.header.contents.clear();
        this.header.contents.fontSize = size+2;
        this.header.changeTextColor('#fff6db');
        var actorNav = this.key === 'STATUS' && this.frames.length > 1;
        this.header.drawText(page.title,8,0,this.header.contentsWidth()-(actorNav ? 204 : 94));
        if (actorNav) {
            this.header.contents.fontSize = 18;
            this.header.drawText('◀ 仲間 ▶',this.header.contentsWidth()-190,0,102,'center');
        }
        this.header.contents.fontSize = 18;
        this.header.changeTextColor('#b5c9e3');
        this.header.drawText('‹ 戻る',this.header.contentsWidth()-76,0,72,'right');
        pic.visible = !!page.picture;
        pic.contents.clear();
        var left = pic.visible ? pic.width : 0;
        panel.move(left,72,Graphics.boxWidth-left,Graphics.boxHeight-72);
        panel.createContents();
        if (pic.visible) {
            var bitmap = ImageManager.loadPicture(page.picture);
            var scene = this;
            bitmap.addLoadListener(function() {
                if (scene.page !== page || !bitmap.width || !pic.contents) return;
                var scale = Math.min(pic.contentsWidth()/bitmap.width,pic.contentsHeight()/bitmap.height,1);
                var w = Math.round(bitmap.width*scale), h = Math.round(bitmap.height*scale);
                pic.contents.blt(bitmap,0,0,bitmap.width,bitmap.height,
                    Math.floor((pic.contentsWidth()-w)/2),Math.floor((pic.contentsHeight()-h)/2),w,h);
            });
        }
        panel.rows = page.lines ? wrap(panel,page.lines) : page.items;
        if (!panel.rows.length) panel.rows = [S.item('表示できる記録はありません')];
        panel.setTopRow(0);
        panel.refresh();
        panel.setTopRow(frame.top);
        panel.select(Math.min(frame.index,panel.maxItems()-1));
        panel.activate();
    };
    BookScene.prototype.update = function() {
        Scene_MenuBase.prototype.update.call(this);
        if (!this.isActive() || !TouchInput.isTriggered()) return;
        var x = TouchInput.x - this._windowLayer.x - this.header.x;
        var y = TouchInput.y - this._windowLayer.y - this.header.y;
        if (y < 0 || y >= this.header.height) return;
        var innerX = x - this.header.padding, w = this.header.contentsWidth();
        if (this.key === 'STATUS' && this.frames.length > 1 && innerX >= w-190 && innerX <= w-88) {
            this.cycleActor(innerX < w-139 ? -1 : 1);
            return;
        }
        if (x >= this.header.width-100 && x < this.header.width) {
            SoundManager.playCancel();
            this.back();
        }
    };
    BookScene.prototype.cycleActor = function(delta) {
        var root = this.frames[0], members = root.make().items;
        if (!members.length) { this.panel.activate(); return; }
        if (this.frames.length === 1) {
            this.panel.select((this.panel.index()+delta+members.length)%members.length);
            this.panel.activate();
            return;
        }
        root.index = (root.index+delta+members.length)%members.length;
        root.top = 0;
        var actorFrame = this.frames[1];
        actorFrame.make = members[root.index].next;
        if (this.frames.length > 2) {
            this.frames[2] = {make:actorFrame.make().items[actorFrame.index].next,index:0,top:0};
        }
        this.renderPage();
    };
    BookScene.prototype.enter = function() {
        var row = this.panel.rows[this.panel.index()];
        if (row && row.next) {
            var frame = this.frames[this.frames.length-1];
            frame.index = this.panel.index();
            frame.top = this.panel.topRow();
            if (row.external) {
                returnFrame = {key:this.key, frames:this.frames};
                row.next();
                return;
            }
            this.frames.push({make:row.next,index:0,top:0});
            this.renderPage();
        } else this.panel.activate();
    };
    BookScene.prototype.back = function() {
        if (this.frames.length === 1) this.popScene();
        else { this.frames.pop(); this.renderPage(); }
    };
};
