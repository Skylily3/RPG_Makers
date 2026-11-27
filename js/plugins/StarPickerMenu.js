// StarPickerMenu.js
/*:
 * @plugindesc STAR PICKER 全編共通メニュー v4.6（RPGツクールMV）
 * @author STAR PICKER Project
 * @help
 * v4.6は同梱のSP_*.js 6本を起動時に順番に初期化します。全7本を
 * js/plugins に配置し、プラグイン管理でONにしてください。追加素材は不要です。
 * どうぐ・そうび・とくぎ・つよさ・せっていに共通の外観を適用します。
 * 「連携技」で仲間ごとのコンボ技を設定します。ArcComboSkillMenu.js はOFFにし、
 * Tactical_Battle.js に対応。SP各ファイルは同じ版をまとめて配置してください。
 * ならびかえでは2人を順に決定すると交代します。取消で選び直せます。
 * 地名はマップの表示名、顔と職業はアクターのデータから取得します。
 * 640×480未満のメインメニューは標準レイアウトを使用します。
 */
(function() {
    function installMenu() {
    'use strict';
    var silver = '#b5c9e3';
    var pearl = '#fff6db';
    var white = '#f5f7ff';

    function text(win, value, x, y, width, size, color, align) {
        win.contents.fontSize = size;
        win.changeTextColor(color);
        win.drawText(String(value), x, y, width, align || 'left');
    }

    // Keep the panel underneath the native cursor, contents and scroll arrows.
    function plate(bitmap, win) {
        var x = win.x, y = win.y, w = win.width, h = win.height;
        bitmap.fillRect(x, y, w, h, '#091022');
        bitmap.fillRect(x + 1, y + 1, w - 2, h - 2, '#a2afc5');
        bitmap.gradientFillRect(x + 2, y + 2, w - 4, h - 4, '#243e77', '#0a122d', true);
        bitmap.fillRect(x + 4, y + 3, w - 8, 1, '#586e96');
        win.opacity = 0;
    }

    function meter(win, title, current, max, x, y, width, light, dark) {
        text(win, title, x, y, 32, 15, silver);
        text(win, current + ' / ' + max, x + 32, y, width - 32, 17, white, 'right');
        var rate = max > 0 ? Math.max(0, Math.min(current / max, 1)) : 0;
        win.contents.fillRect(x, y + 31, width, 4, '#060c20');
        if (rate > 0) win.contents.gradientFillRect(x, y + 31, Math.ceil(width * rate), 4, dark, light);
    }

    function member(index) {
        var a = $gameParty.members()[index];
        if (!a) return;
        var r = this.itemRect(index);
        var face = Math.min(108, r.height - 12, Math.floor(r.width * 0.26));
        var x = r.x + face + 16;
        var w = r.width - face - 22;
        var y = r.y + Math.floor((r.height - 82) / 2);
        this.resetFontSettings();
        this.changePaintOpacity(a.isBattleMember());
        var fy = r.y + Math.floor((r.height - face) / 2);
        this.contents.fillRect(r.x + 3, fy - 1, face + 2, face + 2, '#667da2');
        // Scale the full MV face cell into the portrait frame.
        var sheet = ImageManager.loadFace(a.faceName());
        var indexInSheet = a.faceIndex();
        var fw = Window_Base._faceWidth, fh = Window_Base._faceHeight;
        if (sheet.isReady()) {
            this.contents.blt(sheet, indexInSheet % 4 * fw, Math.floor(indexInSheet / 4) * fh,
                fw, fh, r.x + 4, fy, face, face);
        }
        text(this, a.name(), x, y - 5, w - 72, 25, this.hpColor(a));
        text(this, TextManager.levelA + ' ' + a.level, x + w - 72, y - 5, 72, 18, pearl, 'right');
        var icons = Math.min(a.allIcons().length, 3, Math.floor(w / 80));
        text(this, a.currentClass().name, x, y + 19, w - icons * 32, 16, silver);
        if (icons) this.drawActorIcons(a, x + w - icons * 32, y + 17, icons * 32);
        var half = Math.floor((w - 14) / 2);
        meter(this, TextManager.hpA, a.hp, a.mhp, x, y + 48, half, '#adedc5', '#42997e');
        meter(this, TextManager.mpA, a.mp, a.mmp, x + half + 14, y + 48, half, '#bacbff', '#647ccb');
        this.changePaintOpacity(true);
        this.contents.fillRect(r.x, r.y + r.height - 1, r.width, 1, '#445676');
        if (index === this.pendingIndex()) this.contents.fillRect(r.x, r.y + 2, 3, r.height - 4, pearl);
        this.resetFontSettings();
    }

    // Store only accumulated milliseconds. A session timestamp belongs to the
    // current process and must never be restored from a save.
    var clockOwner = null;
    var clockStart = null;
    function monotonicMs() { return window.performance.now(); }
    function startClock(system, initial) {
        clockOwner = system;
        system._spElapsedMs = initial;
        clockStart = document.hidden ? null : monotonicMs();
    }
    function elapsedMs(system) {
        return system._spElapsedMs + (clockStart === null ? 0 : Math.max(0, monotonicMs() - clockStart));
    }
    document.addEventListener('visibilitychange', function() {
        if (!clockOwner) return;
        if (document.hidden && clockStart !== null) {
            clockOwner._spElapsedMs = elapsedMs(clockOwner);
            clockStart = null;
        } else if (!document.hidden && clockStart === null) {
            clockStart = monotonicMs();
        }
    });

    var setupGame = DataManager.setupNewGame;
    DataManager.setupNewGame = function() {
        setupGame.apply(this, arguments);
        startClock($gameSystem, 0);
    };
    var extractGame = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        extractGame.apply(this, arguments);
        var saved = $gameSystem._spElapsedMs;
        if (typeof saved !== 'number' || !isFinite(saved) || saved < 0) {
            saved = Math.max(0, Number($gameSystem._framesOnSave) || 0) * 1000 / 60;
        }
        startClock($gameSystem, saved);
    };
    var makeSave = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        if (clockOwner === $gameSystem) {
            var accumulated = elapsedMs($gameSystem);
            startClock($gameSystem, accumulated);
        }
        return makeSave.apply(this, arguments);
    };
    var originalPlaytime = Game_System.prototype.playtime;
    Game_System.prototype.playtime = function() {
        if (clockOwner === this) return Math.floor(elapsedMs(this) / 1000);
        return originalPlaytime.call(this);
    };

    function travelInfo() {
        var w = this.contentsWidth();
        this.contents.clear();
        text(this, TextManager.currencyUnit, 0, 0, w * 0.35, 17, pearl);
        text(this, this.value(), w * 0.35, 0, w * 0.65, 22, white, 'right');
        this.contents.fillRect(0, 35, w, 1, '#526687');
        text(this, 'TIME', 0, 36, 48, 14, silver);
        text(this, $gameSystem.playtimeText(), 48, 36, w - 48, 18, white, 'right');
    }

    var originalCreate = Scene_Menu.prototype.create;
    Scene_Menu.prototype.create = function() {
        originalCreate.call(this);
        var w = Graphics.boxWidth, h = Graphics.boxHeight;
        this._commandWindow.setHandler('formation', function() { SceneManager.push(Scene_Order); });
        if (w < 640 || h < 480) {
            var gold = this._goldWindow;
            var drawGold = gold.refresh;
            gold.refresh = function() {
                drawGold.call(this);
                text(this, 'v4.6', 0, 0, 44, 14, silver);
                this.resetFontSettings();
            };
            gold.refresh();
            return;
        }
        var pad = 10, gap = 8, top = 82;
        var cmd = this._commandWindow, party = this._statusWindow, info = this._goldWindow;
        var side = Math.max(228, Math.min(376, Math.round(w * 0.39)));
        var right = w - pad - side;
        var remaining = h - top - pad;
        var header = new Window_Base(pad, pad, w - 2 * pad, top - pad - gap);
        var infoH = info.fittingHeight(2);
        cmd.move(right, top, side, remaining - infoH - gap);
        info.move(right, h - pad - infoH, side, infoH);
        party.move(pad, top, right - gap - pad, remaining);
        var bg = new Bitmap(w, h);
        bg.gradientFillRect(0, 0, w, h, '#0d1429', '#050917', true);
        [header, cmd, party, info].forEach(function(win) { plate(bg, win); });
        // Use the same coordinate system as the windows at non-native resolutions.
        var sprite = new Sprite(bg);
        sprite.x = this._windowLayer.x;
        sprite.y = this._windowLayer.y;
        this.addChildAt(sprite, this.getChildIndex(this._windowLayer));
        this.addWindow(header);
        var hw = header.contentsWidth();
        text(header, 'STAR PICKER  v4.6', 0, -4, hw * 0.44, 24, pearl);
        text(header, $gameMap.displayName() || TextManager.menu || 'メニュー', hw * 0.44, -4, hw * 0.56, 20, white, 'right');

        party.maxCols = function() { return 1; };
        party.numVisibleRows = function() {
            return Math.max(1, Math.min(4, Math.floor(this.contentsHeight() / 92)));
        };
        party.drawItem = member;
        party.createContents();
        party.refresh();
        cmd.maxCols = function() { return 2; };
        cmd.spacing = function() { return 6; };
        cmd.itemHeight = function() {
            return Math.max(44, Math.min(90, Math.floor((this.height - 2 * this.padding) / Math.max(1, this.maxRows()))));
        };
        cmd.drawItem = function(i) {
            var r = this.itemRectForText(i);
            var entry = this._list[i];
            var names = {item:'どうぐ', skill:'とくぎ', equip:'そうび', status:'つよさ',
                arcComboSkill:'連携技', formation:'ならびかえ', options:'せってい', save:'きろく', gameEnd:'終了'};
            this.changePaintOpacity(this.isCommandEnabled(i));
            this.contents.fillRect(r.x, r.y + r.height - 2, r.width, 1, '#526993');
            text(this, names[entry.symbol] || entry.name, r.x, r.y + (r.height - this.lineHeight()) / 2,
                r.width, 28, white, 'center');
            this.changePaintOpacity(true);
        };
        cmd.refresh();
        cmd.setTopRow(0);
        cmd.select(cmd.index());
        party.updateCursor();
        applyTheme(this);
        info.createContents();
        info.refresh = travelInfo;
        info.refresh();
        var lastSecond = $gameSystem.playtime();
        var updateGold = info.update;
        info.update = function() {
            updateGold.call(this);
            var seconds = $gameSystem.playtime();
            if (seconds !== lastSecond) {
                lastSecond = seconds;
                this.refresh();
            }
        };
    };
    // Retain the original skin's text palette, arrows and cursor resources.
    var sharedSkin, skinSource;
    function skinForMenu() {
        var src = ImageManager.loadSystem('Window');
        if (src !== skinSource) {
            skinSource = src;
            var skin = sharedSkin = new Bitmap(192, 192);
            src.addLoadListener(function() {
                skin.blt(src, 0, 0, 192, 192, 0, 0);
                skin.clearRect(0, 0, 96, 192);
                skin.gradientFillRect(0, 0, 96, 96, '#263f79', '#0b142f', true);
                // MV slices this square into a frame. Preserve its central arrows.
                skin.clearRect(96, 0, 96, 24);
                skin.clearRect(96, 72, 96, 24);
                skin.clearRect(96, 24, 24, 48);
                skin.clearRect(168, 24, 24, 48);
                skin.clearRect(96, 96, 48, 48);
                skin.fillRect(96, 96, 48, 48, 'rgba(117,161,224,0.48)');
                skin.fillRect(96, 96, 3, 48, '#ffdc91');
                skin.fillRect(98, 2, 92, 1, silver);
                skin.fillRect(98, 93, 92, 1, '#65779a');
                skin.fillRect(98, 3, 1, 90, '#8398bd');
                skin.fillRect(189, 3, 1, 90, '#65779a');
            });
        }
        return sharedSkin;
    }
    function applyTheme(scene) {
        if (!(scene instanceof Scene_Menu) && scene._backgroundSprite) {
            var backdrop = new Bitmap(1, 128);
            backdrop.gradientFillRect(0, 0, 1, 128, '#172643', '#070d1b', true);
            scene._backgroundSprite.bitmap = backdrop;
            scene._backgroundSprite.scale.x = Graphics.width;
            scene._backgroundSprite.scale.y = Graphics.height / 128;
        }
        var skin = skinForMenu();
        // Wait for the source before assigning so MV rebuilds every frame once.
        skinSource.addLoadListener(function() {
            scene._windowLayer.children.forEach(function(win) {
                if (win instanceof Window_Base) {
                    win.windowskin = skin;
                    win.backOpacity = 247;
                }
            });
        });
    }

    function actionLabels(win, names) {
        var getName = win.commandName;
        win.commandName = function(index) {
            return names[this.commandSymbol(index)] || getName.call(this, index);
        };
        win.refresh();
    }

    var itemCreate = Scene_Item.prototype.create;
    Scene_Item.prototype.create = function() {
        itemCreate.call(this);
        applyTheme(this);
        actionLabels(this._categoryWindow, {item:'どうぐ', weapon:'ぶき', armor:'ぼうぐ', keyItem:'だいじなもの'});
        var list = this._itemWindow;
        var baseDraw = list.drawItem;
        list.drawItem = function(index) {
            if (this._data[index]) {
                var r = this.itemRect(index);
                this.contents.fillRect(r.x + 4, r.y + r.height - 1, r.width - 8, 1, '#41547c');
            }
            baseDraw.call(this, index);
        };
        list.refresh();
    };

    var equipCreate = Scene_Equip.prototype.create;
    Scene_Equip.prototype.create = function() {
        equipCreate.call(this);
        applyTheme(this);
        actionLabels(this._commandWindow, {equip:'つけかえ', optimize:'最強そうび', clear:'すべて外す'});
        var slots = this._slotWindow;
        slots.drawItem = function(i) {
            if (!this._actor) return;
            var r = this.itemRectForText(i);
            var labelW = Math.min(108, Math.floor(r.width * 0.32));
            this.changePaintOpacity(this.isEnabled(i));
            text(this, $dataSystem.equipTypes[this._actor.equipSlots()[i]] || '', r.x, r.y, labelW - 4, 18, silver);
            var item = this._actor.equips()[i];
            if (item) {
                this.contents.fontSize = 21;
                this.drawItemName(item, r.x + labelW, r.y, r.width - labelW);
            } else {
                text(this, '―', r.x + labelW, r.y, r.width - labelW, 20, silver);
            }
            this.contents.fillRect(r.x, r.y + r.height - 1, r.width, 1, '#41547c');
            this.changePaintOpacity(true);
            this.resetFontSettings();
        };
        slots.refresh();
    };

    // Keep native handlers, actor switching, costs, and option persistence.
    var optionsCreate = Scene_Options.prototype.create;
    Scene_Options.prototype.create = function() {
        optionsCreate.call(this);
        var win = this._optionsWindow;
        var w = Math.min(620, Graphics.boxWidth - 20);
        win.itemHeight = function() { return 48; };
        var h = Math.min(win.maxItems() * 48 + win.padding * 2, Graphics.boxHeight - 88);
        var x = Math.floor((Graphics.boxWidth - w) / 2);
        var y = Math.max(74, Math.floor((Graphics.boxHeight - h + 64) / 2));
        win.move(x, y, w, h);
        var title = new Window_Base(x, y - 68, w, 68);
        text(title, 'せってい', 4, -2, title.contentsWidth(), 26, pearl);
        this.addWindow(title);
        win.drawItem = function(i) {
            var r = this.itemRectForText(i);
            text(this, this.commandName(i), r.x, r.y + 5, r.width * 0.68, 24, white);
            text(this, this.statusText(i), r.x + r.width * 0.68, r.y + 5, r.width * 0.32, 22, pearl, 'right');
            this.contents.fillRect(r.x, r.y + 46, r.width, 1, '#43597d');
        };
        win.refresh();
        win.select(win.index());
        applyTheme(this);
    };

    var skillCreate = Scene_Skill.prototype.create;
    Scene_Skill.prototype.create = function() {
        skillCreate.call(this);
        var list = this._itemWindow;
        var drawSkill = list.drawItem;
        list.itemHeight = function() { return 48; };
        list.drawItem = function(i) {
            drawSkill.call(this, i);
            if (!this._data[i]) return;
            var r = this.itemRect(i);
            this.contents.fillRect(r.x + 4, r.y + r.height - 2, r.width - 8, 1, '#465e84');
        };
        list.refresh();
        list.updateCursor();
        applyTheme(this);
    };

    var statusCreate = Scene_Status.prototype.create;
    Scene_Status.prototype.create = function() {
        statusCreate.call(this);
        var win = this._statusWindow;
        win.drawBlock1 = function(y) {
            var w = this.contentsWidth();
            text(this, this._actor.name(), 6, y, w * 0.42 - 6, 30, pearl);
            text(this, this._actor.currentClass().name, w * 0.42, y, w * 0.28, 22, silver);
            text(this, this._actor.nickname(), w * 0.70, y, w * 0.30 - 4, 21, white, 'right');
            this.resetFontSettings();
        };
        win.refresh();
        applyTheme(this);
    };

    [Scene_Save, Scene_GameEnd].forEach(function(sceneClass) {
        var create = sceneClass.prototype.create;
        sceneClass.prototype.create = function() {
            create.call(this);
            applyTheme(this);
        };
    });

    function OrderGrid() { this.initialize.apply(this, arguments); }
    OrderGrid.prototype = Object.create(Window_Selectable.prototype);
    OrderGrid.prototype.constructor = OrderGrid;
    OrderGrid.prototype.initialize = function(x, y, w, h) {
        this.source = -1;
        Window_Selectable.prototype.initialize.call(this, x, y, w, h);
        this.refresh();
    };
    OrderGrid.prototype.maxItems = function() { return $gameParty.members().length; };
    OrderGrid.prototype.maxCols = function() { return Math.max(1, Math.min(4, Math.floor(this.contentsWidth() / 128))); };
    OrderGrid.prototype.itemHeight = function() { return Math.min(188, this.height - 2 * this.padding); };
    OrderGrid.prototype.isCurrentItemEnabled = function() {
        var actor = $gameParty.members()[this.index()];
        return !!actor && actor.isFormationChangeOk();
    };
    function drawWalker(win, actor, cx, bottom, width, height, directionRow) {
        var name = actor.characterName();
        if (!name) return;
        var sheet = ImageManager.loadCharacter(name);
        if (!sheet.isReady()) return;
        var big = ImageManager.isBigCharacter(name);
        var fw = sheet.width / (big ? 3 : 12), fh = sheet.height / (big ? 4 : 8);
        var k = big ? 0 : actor.characterIndex();
        var scale = Math.min(2, width / fw, height / fh);
        var dw = Math.floor(fw * scale), dh = Math.floor(fh * scale);
        win.contents.blt(sheet, (k % 4 * 3 + 1) * fw, (Math.floor(k / 4) * 4 + directionRow) * fh,
            fw, fh, Math.floor(cx - dw / 2), bottom - dh, dw, dh);
    }
    OrderGrid.prototype.drawItem = function(i) {
        var a = $gameParty.members()[i], r = this.itemRect(i);
        var held = this.source === i;
        if (held) this.contents.fillRect(r.x, r.y, 3, r.height, '#ffdc91');
        this.changePaintOpacity(a.isFormationChangeOk());
        var x = r.x + 4, y = r.y, w = r.width - 8;
        var cx = Math.floor(x + w / 2);
        var spriteWidth = Math.min(w - 8, 78);
        var numberX = Math.max(x + 4, cx - Math.floor(spriteWidth / 2) - 23);
        text(this, String(i + 1), numberX, y + 6, 54, 34, held ? pearl : white);
        this.contents.fillRect(x, y + 107, w, 2, '#59759f');
        if (a.characterName()) {
            drawWalker(this, a, cx, y + 106, spriteWidth, 70, 1);
        } else {
            this.drawActorFace(a, cx - 30, y + 43, 60, 60);
        }
        text(this, a.name(), x, y + 110, w, 24, white, 'center');
        text(this, held ? '選択中' : a.isFormationChangeOk() ? a.currentClass().name : '交代不可',
            x, y + 142, w, 17, held ? pearl : silver, 'center');
        this.changePaintOpacity(true);
        this.resetFontSettings();
    };
    function Scene_Order() { this.initialize.apply(this, arguments); }
    Scene_Order.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_Order.prototype.constructor = Scene_Order;
    Scene_Order.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this._guide = new Window_Help(2);
        this.addWindow(this._guide);
        var y = this._guide.height;
        $gameParty.members().forEach(function(actor) {
            if (actor.characterName()) ImageManager.loadCharacter(actor.characterName());
        });
        this._grid = new OrderGrid(0, y, Graphics.boxWidth, Graphics.boxHeight - y);
        this.addWindow(this._grid);
        this._grid.setHandler('ok', this.confirmSlot.bind(this));
        this._grid.setHandler('cancel', this.cancelSlot.bind(this));
        applyTheme(this);
        this._grid.select(0);
        this._grid.activate();
        this.updateGuide();
    };
    Scene_Order.prototype.start = function() {
        Scene_MenuBase.prototype.start.call(this);
        this._grid.refresh();
    };
    Scene_Order.prototype.updateGuide = function() {
        var g = this._grid, i = g.index();
        this._lastSlot = i;
        var members = $gameParty.members();
        var line = g.source < 0 ? '移動する仲間を選んでください。' :
            (i === g.source ? members[i].name() + ' を選択中。交代先を選んでください。' :
                (g.source + 1) + ' ' + members[g.source].name() + '  ⇄  ' + (i + 1) + ' ' + members[i].name() + '　 決定で交代');
        this._guide.setText('ならびかえ　／　隊列順\n' + line);
    };
    Scene_Order.prototype.update = function() {
        Scene_MenuBase.prototype.update.call(this);
        if (this._lastSlot !== this._grid.index()) this.updateGuide();
    };
    Scene_Order.prototype.confirmSlot = function() {
        var g = this._grid;
        if (g.source < 0) g.source = g.index();
        else {
            if (g.source !== g.index()) $gameParty.swapOrder(g.source, g.index());
            g.source = -1;
        }
        g.refresh();
        g.activate();
        this.updateGuide();
    };
    Scene_Order.prototype.cancelSlot = function() {
        var g = this._grid;
        if (g.source < 0) return this.popScene();
        g.source = -1;
        g.refresh();
        g.activate();
        this.updateGuide();
    };

    var ArcManager = window.ArcManager = window.ArcManager || {};

    if (!ArcManager.ensureComboSkillMap) {
        ArcManager.ensureComboSkillMap = function() {
            if (!$gameSystem) return {};
            if (!$gameSystem._arcComboSkillMap) {
                $gameSystem._arcComboSkillMap = {};
            }
            return $gameSystem._arcComboSkillMap;
        };
    }

    if (!ArcManager.getComboSkillId) {
        ArcManager.getComboSkillId = function(actorId) {
            const map = this.ensureComboSkillMap();
            const skillId = map[actorId];
            if (skillId && $dataSkills[skillId]) {
                return skillId;
            }
            return 1; // デフォルトは通常攻撃（スキルID:1）
        };
    }

    if (!ArcManager.setComboSkillId) {
        ArcManager.setComboSkillId = function(actorId, skillId) {
            const map = this.ensureComboSkillMap();
            map[actorId] = skillId;
        };
    }

    if (!ArcManager.getUnitAttackConfig) {
        ArcManager.getUnitAttackConfig = function(unit) {
            const config = {
                minRange: 1,
                maxRange: 1,
                shape: 'diamond',
                area: 0,
                areaShape: 'diamond'
            };
            if (!unit || !unit._arcBattler) return config;

            const notes = [];
            if (unit._arcIsActor) {
                const actor = unit._arcBattler;
                if (actor.actor() && actor.actor().note) notes.push(actor.actor().note);
                if (actor.currentClass() && actor.currentClass().note) notes.push(actor.currentClass().note);
                actor.weapons().forEach(w => {
                    if (w && w.note) notes.push(w.note);
                });
            } else {
                const enemy = unit._arcBattler;
                if (enemy.enemy() && enemy.enemy().note) notes.push(enemy.enemy().note);
                if (unit.event && unit.event() && unit.event().note) notes.push(unit.event().note);
            }

            notes.forEach(note => {
                const maxMatch = note.match(/<ArcAtkRange:(\d+)>/i);
                if (maxMatch) config.maxRange = Number(maxMatch[1]);

                const minMatch = note.match(/<ArcAtkMinRange:(\d+)>/i);
                if (minMatch) config.minRange = Number(minMatch[1]);

                const shapeMatch = note.match(/<ArcAtkShape:(\w+)>/i);
                if (shapeMatch) config.shape = shapeMatch[1].toLowerCase();

                const areaMatch = note.match(/<ArcAtkArea:(\d+)>/i);
                if (areaMatch) config.area = Number(areaMatch[1]);

                const areaShapeMatch = note.match(/<ArcAtkAreaShape:(\w+)>/i);
                if (areaShapeMatch) config.areaShape = areaShapeMatch[1].toLowerCase();
            });

            return config;
        };
    }

    if (!ArcManager.parseSkillRangeConfig) {
        ArcManager.parseSkillRangeConfig = function(skill, actor) {
            if (!skill || skill.id === 1) {
                const atkCfg = this.getUnitAttackConfig({
                    _arcBattler: actor,
                    _arcIsActor: Boolean(actor && actor.isActor && actor.isActor())
                });
                return {
                    minRange: atkCfg.minRange,
                    maxRange: atkCfg.maxRange,
                    shape: atkCfg.shape,
                    area: atkCfg.area,
                    areaShape: atkCfg.areaShape
                };
            }
            const note = skill.note || "";
            const rangeMatch = note.match(/<ArcRange:(\d+)>/i);
            const minRangeMatch = note.match(/<ArcMinRange:(\d+)>/i);
            const shapeMatch = note.match(/<ArcShape:(\w+)>/i);
            const areaMatch = note.match(/<ArcArea:(\d+)>/i);
            const areaShapeMatch = note.match(/<ArcAreaShape:(\w+)>/i);
            const isAllScope = [2, 8].includes(skill.scope);

            return {
                minRange: minRangeMatch ? Number(minRangeMatch[1]) : 0,
                maxRange: rangeMatch ? Number(rangeMatch[1]) : 3,
                shape: shapeMatch ? shapeMatch[1].toLowerCase() : 'diamond',
                area: areaMatch ? Number(areaMatch[1]) : (isAllScope ? 1 : 0),
                areaShape: areaShapeMatch ? areaShapeMatch[1].toLowerCase() : 'diamond'
            };
        };
    }

    if (!ArcManager.describeSkillRange) {
        ArcManager.describeSkillRange = function(skill, actor) {
            const cfg = this.parseSkillRangeConfig(skill, actor);
            const rangeStr = cfg.minRange > 0 ? `射程${cfg.minRange}〜${cfg.maxRange}` : `射程${cfg.maxRange}`;
            const areaStr = cfg.area > 0 ? ` / 範囲${cfg.area}` : ` / 単体`;
            return rangeStr + areaStr;
        };
    }

    //=============================================================================
    // 2. 技設定用スキルリストウィンドウ
    //=============================================================================
    function Window_ArcComboSkillList() {
        this.initialize.apply(this, arguments);
    }
    Window_ArcComboSkillList.prototype = Object.create(Window_Selectable.prototype);
    Window_ArcComboSkillList.prototype.constructor = Window_ArcComboSkillList;

    Window_ArcComboSkillList.prototype.initialize = function(x, y, width, height) {
        Window_Selectable.prototype.initialize.call(this, x, y, width, height);
        this._actor = null;
        this._data = [];
    };

    Window_ArcComboSkillList.prototype.setActor = function(actor) {
        if (this._actor !== actor) {
            this._actor = actor;
            this.setTopRow(0);
            this.refresh();
            this.deselect();
        }
    };

    Window_ArcComboSkillList.prototype.maxItems = function() {
        return this._data ? this._data.length : 0;
    };

    Window_ArcComboSkillList.prototype.item = function() {
        const index = this.index();
        return (this._data && index >= 0) ? this._data[index] : null;
    };

    Window_ArcComboSkillList.prototype.makeItemList = function() {
        this._data = [];
        // 通常攻撃と習得技を集めてから、専用枠に表示する設定技を候補から除く。
        if ($dataSkills[1]) {
            this._data.push($dataSkills[1]);
        }
        if (this._actor) {
            const skillIds = this._actor.skills().map(s => s.id);
            skillIds.forEach(id => {
                if (id > 2 && $dataSkills[id] && !this._data.includes($dataSkills[id])) {
                    this._data.push($dataSkills[id]);
                }
            });
            const assigned = ArcManager.getComboSkillId(this._actor.actorId());
            const pos = this._data.findIndex(skill => skill.id === assigned);
            if (pos >= 0) this._data.splice(pos, 1);
        }
    };

    Window_ArcComboSkillList.prototype.isCurrentItemEnabled = function() {
        return Boolean(this.item());
    };

    Window_ArcComboSkillList.prototype.drawItem = function(index) {
        const skill = this._data[index];
        if (!skill || !this._actor) return;

        const r = this.itemRect(index);
        this.drawIcon(skill.iconIndex, r.x + 6, r.y + 7);
        text(this, skill.name, r.x + 46, r.y + 3, r.width - 54, 24, white);
        text(this, ArcManager.describeSkillRange(skill, this._actor), r.x + 77,
            r.y + 33, r.width - 85, 18, silver, 'right');
        this.contents.fillRect(r.x + 4, r.y + 70, r.width - 8, 1, '#465e84');
        this.resetFontSettings();
    };

    Window_ArcComboSkillList.prototype.refresh = function() {
        this.makeItemList();
        this.createContents();
        this.drawAllItems();
        if (this._actor && !this._data.length) {
            text(this, 'ほかに設定できる技はありません', 4, 0, this.contentsWidth() - 8, 18, silver);
        }
    };

    Window_ArcComboSkillList.prototype.itemHeight = function() { return 72; };

    window.Window_ArcComboSkillList = Window_ArcComboSkillList;

    //=============================================================================
    // 3. 技設定専用シーン
    //=============================================================================
    function Scene_ArcComboConfig() {
        this.initialize.apply(this, arguments);
    }
    Scene_ArcComboConfig.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_ArcComboConfig.prototype.constructor = Scene_ArcComboConfig;

    Scene_ArcComboConfig.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
    };

    Scene_ArcComboConfig.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);

        this._helpWindow = new Window_Help(2);
        this._helpWindow.setText('連携技\n仲間を選び、コンボで使う技を設定してください。');
        this.addWindow(this._helpWindow);

        const statusX = 0;
        const statusY = this._helpWindow.height;
        $gameParty.members().forEach(function(actor) {
            if (actor.characterName()) ImageManager.loadCharacter(actor.characterName());
        });
        const statusW = Math.floor(Graphics.boxWidth * 0.37);
        const statusH = Graphics.boxHeight - statusY;
        this._statusWindow = new Window_MenuStatus(statusX, statusY);
        this._statusWindow.move(statusX, statusY, statusW, statusH);
        this._statusWindow.maxCols = function() { return 1; };
        this._statusWindow.numVisibleRows = function() { return 4; };
        this._statusWindow.drawItem = function(index) {
            const actor = $gameParty.members()[index];
            const r = this.itemRect(index);
            const size = Math.min(76, r.height - 8, Math.floor(r.width * 0.32));
            const bottom = r.y + Math.floor((r.height + size) / 2);
            drawWalker(this, actor, r.x + 4 + size / 2, bottom, size, size, 0);
            const x = r.x + size + 12, width = r.width - size - 16;
            const id = ArcManager.getComboSkillId(actor.actorId());
            text(this, actor.name(), x, r.y + r.height / 2 - 33, width, 23, white);
            const skill = $dataSkills[id];
            const y = Math.floor(r.y + r.height / 2);
            if (skill) this.drawIcon(skill.iconIndex, x, y);
            const inset = skill ? 36 : 0;
            text(this, skill ? skill.name : '未設定', x + inset, y - 2, width - inset, 18, pearl);
            this.resetFontSettings();
        };
        this._statusWindow.createContents();
        this._statusWindow.refresh();
        this._statusWindow.setHandler('ok', this.onActorOk.bind(this));
        this._statusWindow.setHandler('cancel', this.popScene.bind(this));
        this.addWindow(this._statusWindow);

        const skillX = statusW;
        const skillY = statusY;
        const skillW = Graphics.boxWidth - skillX;
        const panelH = 112;
        this._assignedWindow = new Window_Base(skillX, skillY, skillW, panelH);
        this.addWindow(this._assignedWindow);
        const skillH = statusH - panelH;
        this._skillWindow = new Window_ArcComboSkillList(skillX, skillY + panelH, skillW, skillH);
        this._skillWindow.setHandler('ok', this.onSkillOk.bind(this));
        this._skillWindow.setHandler('cancel', this.onSkillCancel.bind(this));
        this.addWindow(this._skillWindow);

        this._statusWindow.select(0);
        this._statusWindow.activate();
        this.updateActorSelection();
        applyTheme(this);
    };

    Scene_ArcComboConfig.prototype.start = function() {
        Scene_MenuBase.prototype.start.call(this);
        this._statusWindow.refresh();
        this.drawAssigned($gameParty.members()[this._statusWindow.index()]);
    };

    Scene_ArcComboConfig.prototype.update = function() {
        Scene_MenuBase.prototype.update.call(this);
        if (this._statusWindow.active) {
            this.updateActorSelection();
        }
    };

    Scene_ArcComboConfig.prototype.updateActorSelection = function() {
        const actor = $gameParty.members()[this._statusWindow.index()];
        if (actor !== this._skillWindow._actor) {
            this._skillWindow.setActor(actor || null);
            this.drawAssigned(actor);
        }
    };

    Scene_ArcComboConfig.prototype.drawAssigned = function(actor) {
        const panel = this._assignedWindow;
        const width = panel.contentsWidth();
        const skill = actor && $dataSkills[ArcManager.getComboSkillId(actor.actorId())];
        panel.contents.clear();
        panel.contents.fillRect(0, 3, 3, 28, '#f2cf86');
        text(panel, '設定中の技', 12, -1, width - 16, 22, white);
        if (!skill) return;
        const rangeWidth = Math.min(180, Math.floor(width * 0.44));
        panel.drawIcon(skill.iconIndex, 4, 41);
        text(panel, skill.name, 44, 38, width - 48 - rangeWidth, 24, pearl);
        text(panel, ArcManager.describeSkillRange(skill, actor), width - rangeWidth,
            38, rangeWidth, 18, silver, 'right');
    };

    Scene_ArcComboConfig.prototype.onActorOk = function() {
        this.updateActorSelection();
        if (!this._skillWindow.maxItems()) {
            this._statusWindow.activate();
            return;
        }
        this._statusWindow.deactivate();
        this._skillWindow.activate();
        this._skillWindow.select(0);
    };

    Scene_ArcComboConfig.prototype.onSkillOk = function() {
        const actor = $gameParty.members()[this._statusWindow.index()];
        const skill = this._skillWindow.item();
        if (actor && skill) {
            ArcManager.setComboSkillId(actor.actorId(), skill.id);
            SoundManager.playEquip();
            this.drawAssigned(actor);
            this._skillWindow.refresh();
            this._skillWindow.select(0);
            this._statusWindow.refresh();
        }
        this._skillWindow.activate();
    };

    Scene_ArcComboConfig.prototype.onSkillCancel = function() {
        this._skillWindow.deselect();
        this._skillWindow.setTopRow(0);
        this._skillWindow.deactivate();
        this._statusWindow.activate();
    };

    window.Scene_ArcComboConfig = Scene_ArcComboConfig;

    //=============================================================================
    // 4. メニュー画面への「技設定」コマンド追加
    //=============================================================================
    const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
    Window_MenuCommand.prototype.addOriginalCommands = function() {
        _Window_MenuCommand_addOriginalCommands.call(this);
        if (this.findSymbol('arcComboSkill') < 0) {
            this.addCommand('連携技', 'arcComboSkill', $gameParty.members().length > 0);
        }
    };

    const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
    Scene_Menu.prototype.createCommandWindow = function() {
        _Scene_Menu_createCommandWindow.call(this);
        this._commandWindow.setHandler('arcComboSkill', this.commandArcComboSkill.bind(this));
    };

    Scene_Menu.prototype.commandArcComboSkill = function() {
        SceneManager.push(Scene_ArcComboConfig);
    };

    }

    // Install after the editor's enabled scripts have registered their hooks.
    var modules = window.StarPickerModules = window.StarPickerModules || {};
    var order = ['SP_RecordsCore','SP_RecordData','SP_QuestLog','SP_Archive','SP_ActorDetails','SP_BattleHUD'];
    var ready = Scene_Boot.prototype.isReady;
    var requested = false, installed = false;
    Scene_Boot.prototype.isReady = function() {
        if (!ready.apply(this,arguments)) return false;
        if (installed) return true;
        if (!requested) {
            requested = true;
            order.forEach(function(name) {
                if (!modules[name]) PluginManager.loadScript(name + '.js');
            });
        }
        PluginManager.checkErrors();
        if (!order.every(function(name) { return typeof modules[name] === 'function'; })) return false;
        installMenu();
        order.forEach(function(name) { modules[name](); });
        installed = true;
        return true;
    };
})();
