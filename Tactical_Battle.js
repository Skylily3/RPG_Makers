/*:
 * @plugindesc アークザラッド風タクティクスバトル v26 (CT30以上コンボ・メニュー技設定対応版)
 * @author あなたのお名前
 * @help
 * コンボの参加条件を「CT30以上（同ターン行動済みでも参加可）」に変更し、
 * メニュー画面にキャラクターごとのコンボ発動技を設定できる「技設定」を追加したバージョンです。
 *
 * 【技設定メニューの使い方】
 * 1. マップでメニューを開き、「技設定」を選択します。
 * 2. 技を設定したい味方キャラクターを選択します。
 * 3. そのキャラが覚えているスキル（＋「通常攻撃」）からコンボで使う技を選びます。
 *    ※選択した技が「通常攻撃」以外の場合、その技の射程・範囲・効果がコンボに適用され、
 *      他のキャラの攻撃選択中にもその技の範囲が青色グリッドとして表示されます。
 */

(function() {
    'use strict';

    //=============================================================================
    // 1. プラグインコマンドの定義
    //=============================================================================
    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'ArcStart') {
            ArcManager.startBattle(args, false);
        }
    };

    //=============================================================================
    // 2. 場所移動イベント対応・歩行グラフィック順制御・頭上HP/MPバー描画
    //=============================================================================
    const _Game_Player_reserveTransfer = Game_Player.prototype.reserveTransfer;
    Game_Player.prototype.reserveTransfer = function(mapId, x, y, d, fadeType) {
        if (window.ArcManager && ArcManager._active) {
            ArcManager.finishBattleOnTransfer();
        }
        _Game_Player_reserveTransfer.call(this, mapId, x, y, d, fadeType);
    };

    const _Game_Player_performTransfer = Game_Player.prototype.performTransfer;
    Game_Player.prototype.performTransfer = function() {
        const wasTransferring = this.isTransferring();
        if (wasTransferring && window.ArcManager && ArcManager._active) {
            ArcManager.finishBattleOnTransfer();
        }
        _Game_Player_performTransfer.call(this);
        if (window.ArcManager) {
            ArcManager.requestRedraw();
        }
    };

    const _Game_Map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        if (window.ArcManager && ArcManager._active) {
            ArcManager.finishBattleOnTransfer();
        }
        _Game_Map_setup.call(this, mapId);
        if (window.ArcManager) {
            ArcManager.clearCooldown();
            ArcManager.requestRedraw();
        }
    };

    const _Game_Player_updateScroll = Game_Player.prototype.updateScroll;
    Game_Player.prototype.updateScroll = function(lastScrolledX, lastScrolledY) {
        if (ArcManager && ArcManager._active) return;
        _Game_Player_updateScroll.call(this, lastScrolledX, lastScrolledY);
    };

    const _Game_Party_onPlayerWalk = Game_Party.prototype.onPlayerWalk;
    Game_Party.prototype.onPlayerWalk = function() {
        _Game_Party_onPlayerWalk.call(this);
        if (!ArcManager._active && !$gameMap.isEventRunning()) {
            ArcManager.checkProximityEncounter(false);
        }
    };

    const _Game_Event_moveStraight = Game_Event.prototype.moveStraight;
    Game_Event.prototype.moveStraight = function(d) {
        _Game_Event_moveStraight.call(this, d);
        if (this.isMovementSucceeded() && !this._erased && this.event() && this.event().note && /<ArcEnemy:\d+>/i.test(this.event().note)) {
            ArcManager.requestRedraw();
            if (!ArcManager._active && !$gameMap.isEventRunning()) {
                ArcManager.checkEnemyStepEncounter(this);
            }
        }
    };

    const _Game_Event_erase = Game_Event.prototype.erase;
    Game_Event.prototype.erase = function() {
        _Game_Event_erase.call(this);
        if (window.ArcManager) {
            ArcManager.requestRedraw();
        }
    };

    const _Game_Player_canMove = Game_Player.prototype.canMove;
    Game_Player.prototype.canMove = function() {
        if (ArcManager._active) return false;
        return _Game_Player_canMove.call(this);
    };

    const _Scene_Map_isMenuCalled = Scene_Map.prototype.isMenuCalled;
    Scene_Map.prototype.isMenuCalled = function() {
        if (ArcManager._active) return false;
        return _Scene_Map_isMenuCalled.call(this);
    };

    const _Game_Player_moveStraight = Game_Player.prototype.moveStraight;
    Game_Player.prototype.moveStraight = function(d) {
        if (ArcManager._active) {
            Game_Character.prototype.moveStraight.call(this, d);
            return;
        }
        _Game_Player_moveStraight.call(this, d);
    };

    const _Game_Player_locate = Game_Player.prototype.locate;
    Game_Player.prototype.locate = function(x, y) {
        if (ArcManager._active) {
            Game_Character.prototype.locate.call(this, x, y);
            return;
        }
        _Game_Player_locate.call(this, x, y);
    };

    const _Game_Event_updateSelfMovement = Game_Event.prototype.updateSelfMovement;
    Game_Event.prototype.updateSelfMovement = function() {
        if (ArcManager && ArcManager._active) return;
        _Game_Event_updateSelfMovement.call(this);
    };

    const _Game_CharacterBase_isCollidedWithCharacters = Game_CharacterBase.prototype.isCollidedWithCharacters;
    Game_CharacterBase.prototype.isCollidedWithCharacters = function(x, y) {
        if (ArcManager && ArcManager._active) {
            if (this._arcBattler) {
                return ArcManager.hasOppositeUnitAt(x, y, this._arcIsActor, this);
            }
            return false;
        }
        return _Game_CharacterBase_isCollidedWithCharacters.call(this, x, y);
    };

    const _Sprite_Base_hide = Sprite_Base.prototype.hide;
    Sprite_Base.prototype.hide = function() {
        if (ArcManager && ArcManager._active && this instanceof Sprite_Character) {
            return;
        }
        _Sprite_Base_hide.call(this);
    };

    function applyPartyOrderSpritesForBattle() {
        if (!$gameParty || !$gamePlayer) return;
        const members = $gameParty.battleMembers();
        const leader = members[0];
        if (leader) {
            $gamePlayer.setImage(leader.characterName(), leader.characterIndex());
            $gamePlayer.setTransparent(!leader.isAlive());
        }
        const followers = $gamePlayer.followers();
        if (followers) {
            followers.forEach((follower, idx) => {
                const actor = members[idx + 1];
                if (actor) {
                    follower.setImage(actor.characterName(), actor.characterIndex());
                    follower.setTransparent(!actor.isAlive());
                } else {
                    follower.setTransparent(true);
                }
            });
        }
    }

    function getFieldOrderedMembers() {
        if (!$gameParty) return [];
        const members = $gameParty.battleMembers();
        const alive = members.filter(actor => actor && actor.isAlive());
        const dead = members.filter(actor => actor && !actor.isAlive());
        return alive.concat(dead);
    }

    function updateFieldAlivePartySprites() {
        if (!$gameParty || !$gamePlayer) return;
        const ordered = getFieldOrderedMembers();
        const leader = ordered[0];

        if (leader) {
            const leaderImg = leader.characterName();
            const leaderIdx = leader.characterIndex();
            if ($gamePlayer.characterName() !== leaderImg || $gamePlayer.characterIndex() !== leaderIdx) {
                $gamePlayer.setImage(leaderImg, leaderIdx);
            }
            $gamePlayer.setTransparent(!leader.isAlive());
        } else {
            $gamePlayer.setTransparent(true);
        }

        const followers = $gamePlayer.followers();
        if (followers) {
            followers.forEach((follower, idx) => {
                const actor = ordered[idx + 1];
                if (actor) {
                    const img = actor.characterName();
                    const fIdx = actor.characterIndex();
                    if (follower.characterName() !== img || follower.characterIndex() !== fIdx) {
                        follower.setImage(img, fIdx);
                    }
                    follower.setTransparent(!actor.isAlive());
                } else {
                    follower.setTransparent(true);
                }
            });
        }
    }

    const _Sprite_Character_update = Sprite_Character.prototype.update;
    Sprite_Character.prototype.update = function() {
        _Sprite_Character_update.call(this);
        if (!this._character) return;

        if (ArcManager && ArcManager._active && this._character._arcBattler) {
            const unit = this._character;
            if (!unit._arcBattler.isAlive()) {
                this.visible = false;
                if (this._arcStatusBar) this._arcStatusBar.visible = false;
                return;
            }
            const stack = ArcManager.getUnitsAt(unit.x, unit.y);
            if (stack.length > 1) {
                if (ArcManager._activeUnit === unit) {
                    this.visible = true;
                } else {
                    this.visible = false;
                }
            } else {
                this.visible = true;
            }

            if (!unit._arcIsActor) {
                this.updateArcUnitBars(unit._arcBattler, false);
            } else {
                this.updateArcUnitBars(unit._arcBattler, true);
            }
        } else {
            if (this._arcStatusBar) this._arcStatusBar.visible = false;
            if (!ArcManager || !ArcManager._active) {
                updateFieldAlivePartySprites();
            }
            if (this._character === $gamePlayer && !$gamePlayer.isTransparent()) {
                this.visible = true;
                this._hide = false;
            }
        }
    };

    Sprite_Character.prototype.updateArcUnitBars = function(battler, showMp) {
        const barW = 36;
        const barH = showMp ? 10 : 6;

        if (!this._arcStatusBar) {
            this._arcStatusBar = new Sprite(new Bitmap(barW, barH));
            this._arcStatusBar.anchor.x = 0.5;
            this._arcStatusBar.anchor.y = 1;
            this.addChild(this._arcStatusBar);
        } else if (this._arcStatusBar.bitmap.width !== barW || this._arcStatusBar.bitmap.height !== barH) {
            this._arcStatusBar.bitmap = new Bitmap(barW, barH);
            this._lastArcHp = null;
        }

        this._arcStatusBar.visible = this.visible;
        const charHeight = this.patternHeight() || 48;
        this._arcStatusBar.y = -charHeight - 4;

        const mpChanged = showMp && (this._lastArcMp !== battler.mp || this._lastArcMmp !== battler.mmp);
        if (this._lastArcHp !== battler.hp || this._lastArcMhp !== battler.mhp || mpChanged) {
            this._lastArcHp = battler.hp;
            this._lastArcMhp = battler.mhp;
            this._lastArcMp = battler.mp;
            this._lastArcMmp = battler.mmp;

            const bmp = this._arcStatusBar.bitmap;
            bmp.clear();

            bmp.fillRect(0, 0, barW, 6, 'rgba(0, 0, 0, 0.85)');
            const hpRate = Math.max(0, Math.min(1, battler.hp / Math.max(1, battler.mhp)));
            const hpFillW = Math.floor((barW - 2) * hpRate);
            if (hpFillW > 0) {
                const hpColor = hpRate > 0.5 ? '#22ee55' : (hpRate > 0.25 ? '#ffcc00' : '#ff3333');
                bmp.fillRect(1, 1, hpFillW, 4, hpColor);
            }

            if (showMp) {
                bmp.fillRect(0, 6, barW, 4, 'rgba(0, 0, 0, 0.85)');
                const mpRate = Math.max(0, Math.min(1, battler.mp / Math.max(1, battler.mmp)));
                const mpFillW = Math.floor((barW - 2) * mpRate);
                if (mpFillW > 0) {
                    bmp.fillRect(1, 7, mpFillW, 2, '#33bbff');
                }
            }
        }
    };

    //=============================================================================
    // 3. 専用ウィンドウ（コマンド・スキル・右下顔グラステータス・メニュー技設定）
    //=============================================================================
    function Window_ArcCommand() {
        this.initialize.apply(this, arguments);
    }
    Window_ArcCommand.prototype = Object.create(Window_Command.prototype);
    Window_ArcCommand.prototype.constructor = Window_ArcCommand;

    Window_ArcCommand.prototype.initialize = function() {
        Window_Command.prototype.initialize.call(this, 20, 64);
        this.openness = 0;
        this.deactivate();
    };
    Window_ArcCommand.prototype.windowWidth = function() { return 180; };
    Window_ArcCommand.prototype.makeCommandList = function() {
        this.addCommand('攻撃', 'attack');
        this.addCommand('スキル', 'skill');
        this.addCommand('待機', 'wait');
    };

    function Window_ArcSkill() {
        this.initialize.apply(this, arguments);
    }
    Window_ArcSkill.prototype = Object.create(Window_SkillList.prototype);
    Window_ArcSkill.prototype.constructor = Window_ArcSkill;

    Window_ArcSkill.prototype.initialize = function() {
        Window_SkillList.prototype.initialize.call(this, 210, 64, 380, 200);
        this.openness = 0;
        this.deactivate();
    };
    Window_ArcSkill.prototype.maxCols = function() { return 1; };

    Window_ArcSkill.prototype.includes = function(item) {
        return item && item.id > 2;
    };

    Window_ArcSkill.prototype.isEnabled = function(item) {
        return item && this._actor && this._actor.canPaySkillCost(item);
    };

    function Window_ArcStatus() {
        this.initialize.apply(this, arguments);
    }
    Window_ArcStatus.prototype = Object.create(Window_Base.prototype);
    Window_ArcStatus.prototype.constructor = Window_ArcStatus;

    Window_ArcStatus.prototype.initialize = function() {
        const w = 380;
        const h = 156;
        const x = Graphics.boxWidth - w - 104;
        const y = Graphics.boxHeight - h - 16;
        Window_Base.prototype.initialize.call(this, x, y, w, h);
        this._actor = null;
        this.openness = 0;
    };

    Window_ArcStatus.prototype.setActor = function(actor) {
        if (this._actor !== actor) {
            this._actor = actor;
            if (actor) {
                const bitmap = ImageManager.loadFace(actor.faceName());
                bitmap.addLoadListener(this.refresh.bind(this));
            }
            this.refresh();
        } else if (actor) {
            this.refresh();
        }
    };

    Window_ArcStatus.prototype.refresh = function() {
        this.contents.clear();
        if (!this._actor) return;

        this.drawActorFace(this._actor, 0, 0, 144, 120);

        const x = 156;
        const w = this.contentsWidth() - x;
        const lh = this.lineHeight();
        this.drawActorName(this._actor, x, 0, w);
        this.drawActorHp(this._actor, x, lh * 1, w);
        this.drawActorMp(this._actor, x, lh * 2, w);
    };

    // 【追加】メニュー画面「技設定」用ウィンドウ（キャラごとのコンボ技を選択・表示）
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
            this.refresh();
            this.select(0);
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
        // 先頭は「通常攻撃（スキルID:1）」をデフォルト選択肢として配置
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
        }
    };

    Window_ArcComboSkillList.prototype.isCurrentItemEnabled = function() {
        return Boolean(this.item());
    };

    Window_ArcComboSkillList.prototype.drawItem = function(index) {
        const skill = this._data[index];
        if (!skill || !this._actor) return;

        const rect = this.itemRect(index);
        rect.width -= this.textPadding();

        const assignedSkillId = ArcManager.getComboSkillId(this._actor.actorId());
        const isAssigned = (skill.id === assignedSkillId);

        this.changePaintOpacity(true);
        this.drawIcon(skill.iconIndex, rect.x + 2, rect.y + 2);

        const label = isAssigned ? `${skill.name}  [★設定中]` : skill.name;
        this.changeTextColor(isAssigned ? this.powerUpColor() : this.normalColor());
        this.drawText(label, rect.x + 38, rect.y, rect.width - 140, 'left');

        // 射程や範囲情報を右側に補足表示
        const rangeInfo = ArcManager.describeSkillRange(skill, this._actor);
        this.changeTextColor(this.systemColor());
        this.drawText(rangeInfo, rect.x + rect.width - 140, rect.y, 140, 'right');
        this.resetTextColor();
    };

    Window_ArcComboSkillList.prototype.refresh = function() {
        this.makeItemList();
        this.createContents();
        this.drawAllItems();
    };

    // 【追加】メニュー画面「技設定」専用シーン
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
        this._helpWindow.setText("コンボ連携時に発動する技をキャラクターごとに設定します。\n選択した技の範囲が、他のキャラの攻撃中にもこのキャラの攻撃範囲として表示されます。");
        this.addWindow(this._helpWindow);

        const statusX = 0;
        const statusY = this._helpWindow.height;
        const statusW = 280;
        const statusH = Graphics.boxHeight - statusY;
        this._statusWindow = new Window_MenuStatus(statusX, statusY);
        this._statusWindow.width = statusW;
        this._statusWindow.height = statusH;
        this._statusWindow.setHandler('ok', this.onActorOk.bind(this));
        this._statusWindow.setHandler('cancel', this.popScene.bind(this));
        this.addWindow(this._statusWindow);

        const skillX = statusW;
        const skillY = statusY;
        const skillW = Graphics.boxWidth - skillX;
        const skillH = statusH;
        this._skillWindow = new Window_ArcComboSkillList(skillX, skillY, skillW, skillH);
        this._skillWindow.setHandler('ok', this.onSkillOk.bind(this));
        this._skillWindow.setHandler('cancel', this.onSkillCancel.bind(this));
        this.addWindow(this._skillWindow);

        this._statusWindow.select(0);
        this._statusWindow.activate();
        this.updateActorSelection();
    };

    Scene_ArcComboConfig.prototype.update = function() {
        Scene_MenuBase.prototype.update.call(this);
        if (this._statusWindow.active) {
            this.updateActorSelection();
        }
    };

    Scene_ArcComboConfig.prototype.updateActorSelection = function() {
        const actor = $gameParty.members()[this._statusWindow.index()];
        this._skillWindow.setActor(actor || null);
    };

    Scene_ArcComboConfig.prototype.onActorOk = function() {
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
            this._skillWindow.refresh();
            this._statusWindow.refresh();
        }
        this._skillWindow.activate();
    };

    Scene_ArcComboConfig.prototype.onSkillCancel = function() {
        this._skillWindow.deselect();
        this._skillWindow.deactivate();
        this._statusWindow.activate();
    };

    // メニューコマンドウィンドウに「技設定」を追加
    const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
    Window_MenuCommand.prototype.addOriginalCommands = function() {
        _Window_MenuCommand_addOriginalCommands.call(this);
        this.addCommand('技設定', 'arcComboSkill', true);
    };

    const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
    Scene_Menu.prototype.createCommandWindow = function() {
        _Scene_Menu_createCommandWindow.call(this);
        this._commandWindow.setHandler('arcComboSkill', this.commandArcComboSkill.bind(this));
    };

    Scene_Menu.prototype.commandArcComboSkill = function() {
        SceneManager.push(Scene_ArcComboConfig);
    };

    //=============================================================================
    // 4. タクティクス進行管理クラス (ArcManager)
    //=============================================================================
    window.ArcManager = {
        _active: false,
        _phase: 'none',
        _units: [],
        _activeUnit: null,
        _cursorX: 0,
        _cursorY: 0,
        _prevX: 0,
        _prevY: 0,
        _prevDir: 2,
        _validTiles: [],
        _enemyMoveTiles: [],
        _aoeTiles: [],
        _selectedSkill: null,
        _skillArea: 0,
        _skillAreaShape: 'diamond',
        _cmdWindow: null,
        _skillWindow: null,
        _statusWindow: null,
        _enemySteps: 0,
        _areaRect: { x1: 0, y1: 0, x2: 0, y2: 0 },
        _origPlayerSpeed: 4,
        _needsRedraw: true,
        _cooldownTimer: 0,
        _rewards: { exp: 0, gold: 0, items: [] },
        _savedBgm: null,
        _comboQueue: [],
        _comboParticipants: [],
        _comboTargets: [],
        _comboCount: 0,
        _cutinTimer: 0,
        _cutinBattler: null,
        _cutinIsActor: true,
        _timelineOrder: [],
        _timelineScrollOffset: 0,
        _turnCount: 1,
        _actedUnitIdsInTurn: [],
        _animFrameCounter: 0,

        // 【追加】キャラクターごとのコンボ技設定（actorId -> skillId）をセーブデータ領域に保持・取得
        ensureComboSkillMap: function() {
            if (!$gameSystem) return {};
            if (!$gameSystem._arcComboSkillMap) {
                $gameSystem._arcComboSkillMap = {};
            }
            return $gameSystem._arcComboSkillMap;
        },

        getComboSkillId: function(actorId) {
            const map = this.ensureComboSkillMap();
            const skillId = map[actorId];
            if (skillId && $dataSkills[skillId]) {
                return skillId;
            }
            return 1; // デフォルトは通常攻撃（スキルID:1）
        },

        setComboSkillId: function(actorId, skillId) {
            const map = this.ensureComboSkillMap();
            map[actorId] = skillId;
        },

        // 指定ユニットがコンボ時に使用するスキルオブジェクトを取得
        getUnitComboSkill: function(unit) {
            if (!unit || !unit._arcBattler) return $dataSkills[1];
            if (unit._arcIsActor) {
                const actor = unit._arcBattler;
                const skillId = this.getComboSkillId(actor.actorId());
                const skill = $dataSkills[skillId];
                if (skill) return skill;
            }
            return $dataSkills[1];
        },

        // 技の射程・範囲設定を解析して返す
        parseSkillRangeConfig: function(skill, actor) {
            if (!skill || skill.id === 1) {
                const atkCfg = this.getUnitAttackConfig({ _arcBattler: actor, _arcIsActor: Boolean(actor && actor.isActor && actor.isActor()) });
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
        },

        describeSkillRange: function(skill, actor) {
            const cfg = this.parseSkillRangeConfig(skill, actor);
            const rangeStr = cfg.minRange > 0 ? `射程${cfg.minRange}〜${cfg.maxRange}` : `射程${cfg.maxRange}`;
            const areaStr = cfg.area > 0 ? ` / 範囲${cfg.area}` : ` / 単体`;
            return rangeStr + areaStr;
        },

        // 指定ユニットの「コンボ技（または通常攻撃）」の範囲マス（壁除外）を取得
        getUnitComboAttackTiles: function(unit) {
            const skill = this.getUnitComboSkill(unit);
            const actor = (unit && unit._arcIsActor) ? unit._arcBattler : null;
            const cfg = this.parseSkillRangeConfig(skill, actor);
            const tiles = [];
            const maxRange = cfg.maxRange;
            const minR = cfg.minRange;
            const shapeType = cfg.shape || 'diamond';
            const startX = unit.x;
            const startY = unit.y;

            for (let dx = -maxRange; dx <= maxRange; dx++) {
                for (let dy = -maxRange; dy <= maxRange; dy++) {
                    const adx = Math.abs(dx);
                    const ady = Math.abs(dy);
                    let validShape = false;

                    if (shapeType === 'cross') {
                        const dist = adx + ady;
                        validShape = (dx === 0 || dy === 0) && dist >= minR && dist <= maxRange;
                    } else if (shapeType === 'square') {
                        const dist = Math.max(adx, ady);
                        validShape = dist >= minR && dist <= maxRange;
                    } else if (shapeType === 'x') {
                        const dist = adx;
                        validShape = (adx === ady) && dist >= minR && dist <= maxRange;
                    } else {
                        const dist = adx + ady;
                        validShape = dist >= minR && dist <= maxRange;
                    }

                    if (validShape) {
                        const tx = startX + dx;
                        const ty = startY + dy;
                        if ($gameMap.isValid(tx, ty) && this.isTilePassable(tx, ty)) {
                            tiles.push({ x: tx, y: ty });
                        }
                    }
                }
            }
            return tiles;
        },

        // コンボ参加ユニットが中心座標(cx, cy)でスキルを発動した際の巻き込み対象タイル群（壁除外）
        getComboAoETilesAt: function(unit, cx, cy) {
            const skill = this.getUnitComboSkill(unit);
            const actor = (unit && unit._arcIsActor) ? unit._arcBattler : null;
            const cfg = this.parseSkillRangeConfig(skill, actor);
            const area = cfg.area || 0;
            const areaShape = cfg.areaShape || 'diamond';
            const tiles = [];

            if (area === 0) {
                if (this.isTilePassable(cx, cy)) {
                    tiles.push({ x: cx, y: cy });
                }
                return tiles;
            }

            if (areaShape === 'line') {
                const vx = Math.sign(cx - unit.x);
                const vy = Math.sign(cy - unit.y);
                if (vx === 0 && vy === 0) {
                    if (this.isTilePassable(cx, cy)) tiles.push({ x: cx, y: cy });
                } else {
                    for (let i = 0; i <= area; i++) {
                        const tx = cx + vx * i;
                        const ty = cy + vy * i;
                        if ($gameMap.isValid(tx, ty) && this.isTilePassable(tx, ty)) {
                            tiles.push({ x: tx, y: ty });
                        }
                    }
                }
                return tiles;
            }

            if (areaShape === 'sweep') {
                const dx = cx - unit.x;
                const dy = cy - unit.y;
                for (let i = -area; i <= area; i++) {
                    const tx = Math.abs(dx) >= Math.abs(dy) ? cx : cx + i;
                    const ty = Math.abs(dx) >= Math.abs(dy) ? cy + i : cy;
                    if ($gameMap.isValid(tx, ty) && this.isTilePassable(tx, ty)) {
                        tiles.push({ x: tx, y: ty });
                    }
                }
                return tiles;
            }

            for (let dx = -area; dx <= area; dx++) {
                for (let dy = -area; dy <= area; dy++) {
                    const adx = Math.abs(dx);
                    const ady = Math.abs(dy);
                    let ok = false;
                    if (areaShape === 'square') {
                        ok = Math.max(adx, ady) <= area;
                    } else if (areaShape === 'cross') {
                        ok = (dx === 0 || dy === 0) && (adx + ady <= area);
                    } else {
                        ok = (adx + ady <= area);
                    }
                    if (ok) {
                        const tx = cx + dx;
                        const ty = cy + dy;
                        if ($gameMap.isValid(tx, ty) && this.isTilePassable(tx, ty)) {
                            tiles.push({ x: tx, y: ty });
                        }
                    }
                }
            }
            return tiles;
        },

        requestRedraw: function() {
            this._needsRedraw = true;
            this.refreshStatusWindow();
        },

        refreshStatusWindow: function() {
            if (!this._statusWindow) return;
            const messageBusy = ($gameMessage && $gameMessage.isBusy());
            if (this._active && !messageBusy && this._activeUnit && this._activeUnit._arcIsActor) {
                this._statusWindow.setActor(this._activeUnit._arcBattler);
                this._statusWindow.visible = true;
                this._statusWindow.open();
            } else {
                this._statusWindow.close();
                if (messageBusy) {
                    this._statusWindow.openness = 0;
                    this._statusWindow.visible = false;
                }
            }
        },

        markUnitActedInTurn: function(unit) {
            if (!unit || !unit._arcUnitId) return;
            if (!this._actedUnitIdsInTurn.includes(unit._arcUnitId)) {
                this._actedUnitIdsInTurn.push(unit._arcUnitId);
            }
        },

        getTransferEventAt: function(x, y) {
            if (!$gameMap || !$gameMap.eventsXy) return null;
            const events = $gameMap.eventsXy(x, y);
            for (let i = 0; i < events.length; i++) {
                const ev = events[i];
                if (!ev || ev._erased) continue;
                const list = ev.list();
                if (list && list.some(cmd => cmd && cmd.code === 201)) {
                    return ev;
                }
            }
            return null;
        },

        isTransferEventAt: function(x, y) {
            return Boolean(this.getTransferEventAt(x, y));
        },

        resetPlayerVisualsOnEnd: function() {
            if (!$gamePlayer) return;
            $gamePlayer.setMoveSpeed(this._origPlayerSpeed || 4);
            $gamePlayer.setThrough(false);
            updateFieldAlivePartySprites();
        },

        finishBattleOnTransfer: function() {
            if (!this._active) return;
            this._active = false;
            this._phase = 'none';
            this._activeUnit = null;
            this._validTiles = [];
            this._enemyMoveTiles = [];
            this._aoeTiles = [];
            this._comboQueue = [];
            this._comboParticipants = [];
            this._comboTargets = [];
            this._comboCount = 0;
            this._cutinTimer = 0;
            this._timelineOrder = [];
            this._actedUnitIdsInTurn = [];
            if (this._cmdWindow) this._cmdWindow.close();
            if (this._skillWindow) this._skillWindow.close();
            if (this._statusWindow) {
                this._statusWindow.close();
                this._statusWindow.openness = 0;
                this._statusWindow.visible = false;
            }

            this.stopBattleBgm();
            this.resetPlayerVisualsOnEnd();

            this._units.forEach(u => {
                if (!u._arcIsActor && u._origSpeed) {
                    u.setMoveSpeed(u._origSpeed);
                }
                u._arcBattler = null;
                u._arcAgiBoost = false;
                u._arcUnitId = null;
            });
            this._units = [];

            this.gainRecordedRewards();
            this.startCooldown();
            this.requestRedraw();
        },

        syncTimelineOrder: function(prependUnit, currentTurnUnit) {
            const aliveUnits = this._units.filter(u => u._arcBattler && u._arcBattler.isAlive());
            const remaining = aliveUnits.filter(u => u !== prependUnit && u !== currentTurnUnit);

            remaining.sort((a, b) => a._arcCt - b._arcCt);

            let ordered = remaining;
            if (prependUnit && prependUnit._arcBattler && prependUnit._arcBattler.isAlive()) {
                ordered = [prependUnit].concat(ordered);
            }
            if (currentTurnUnit && currentTurnUnit._arcBattler && currentTurnUnit._arcBattler.isAlive()) {
                ordered = ordered.concat([currentTurnUnit]);
            }

            this._timelineOrder = ordered;
            this.requestRedraw();
        },

        playBattleBgm: function() {
            this._savedBgm = AudioManager.saveBgm();
            AudioManager.playBgm($gameSystem.battleBgm());
        },

        stopBattleBgm: function() {
            AudioManager.stopBgm();
            if (this._savedBgm && this._savedBgm.name) {
                AudioManager.replayBgm(this._savedBgm);
            }
            this._savedBgm = null;
        },

        updateCamera: function() {
            if (!this._active) return;

            let targetRealX = null;
            let targetRealY = null;

            if (this._phase === 'selectTarget') {
                targetRealX = this._cursorX;
                targetRealY = this._cursorY;
            } else if (this._activeUnit) {
                targetRealX = this._activeUnit._realX;
                targetRealY = this._activeUnit._realY;
            }

            if (targetRealX !== null && targetRealY !== null) {
                const centerX = $gamePlayer.centerX();
                const centerY = $gamePlayer.centerY();
                const currentCenterX = $gameMap.displayX() + centerX;
                const currentCenterY = $gameMap.displayY() + centerY;

                const diffX = targetRealX - currentCenterX;
                const diffY = targetRealY - currentCenterY;

                const stepX = Math.abs(diffX) < 0.05 ? diffX : diffX * 0.2;
                const stepY = Math.abs(diffY) < 0.05 ? diffY : diffY * 0.2;

                if (stepX > 0) $gameMap.scrollRight(stepX);
                if (stepX < 0) $gameMap.scrollLeft(-stepX);
                if (stepY > 0) $gameMap.scrollDown(stepY);
                if (stepY < 0) $gameMap.scrollUp(-stepY);
            }
        },

        startCooldown: function() {
            this._cooldownTimer = 300;
            updateFieldAlivePartySprites();
            $gamePlayer.setOpacity(128);
            $gamePlayer.followers().forEach(f => {
                f.setOpacity(128);
            });
            this.requestRedraw();
        },

        clearCooldown: function() {
            const hadCooldown = this._cooldownTimer > 0;
            this._cooldownTimer = 0;
            if ($gamePlayer) {
                updateFieldAlivePartySprites();
                $gamePlayer.setOpacity(255);
                $gamePlayer.followers().forEach(f => {
                    f.setOpacity(255);
                });
            }
            if (hadCooldown) {
                this.requestRedraw();
            }
        },

        updateCooldown: function() {
            if (!this._active && this._cooldownTimer > 0) {
                this._cooldownTimer--;
                if (this._cooldownTimer <= 0) {
                    this.clearCooldown();
                    if (!$gameMap.isEventRunning()) {
                        this.checkProximityEncounter(false);
                    }
                }
            }
        },

        getReachableTilesBfs: function(startX, startY, maxSteps, checkOppositeUnit, isActor) {
            const results = [];
            const visited = {};
            const queue = [{ x: startX, y: startY, steps: 0 }];
            visited[startX + "," + startY] = 0;

            const dirs = [
                { d: 2, dx: 0, dy: 1 },
                { d: 4, dx: -1, dy: 0 },
                { d: 6, dx: 1, dy: 0 },
                { d: 8, dx: 0, dy: -1 }
            ];

            while (queue.length > 0) {
                const curr = queue.shift();
                results.push({ x: curr.x, y: curr.y, steps: curr.steps });

                if (curr.steps >= maxSteps) continue;

                for (let i = 0; i < dirs.length; i++) {
                    const info = dirs[i];
                    const nx = curr.x + info.dx;
                    const ny = curr.y + info.dy;
                    const key = nx + "," + ny;

                    if (!$gameMap.isValid(nx, ny)) continue;
                    if (visited[key] !== undefined && visited[key] <= curr.steps + 1) continue;
                    if (!this.canStepTile(curr.x, curr.y, nx, ny, info.d)) continue;
                    if (checkOppositeUnit && this.hasOppositeUnitAt(nx, ny, isActor)) continue;

                    visited[key] = curr.steps + 1;
                    queue.push({ x: nx, y: ny, steps: curr.steps + 1 });
                }
            }
            return results;
        },

        canStepTile: function(x1, y1, x2, y2, d) {
            const d2 = 10 - d;
            if (!$gameMap.isPassable(x1, y1, d) || !$gameMap.isPassable(x2, y2, d2)) {
                return false;
            }
            const blockingEvent = $gameMap.eventsXyNt(x2, y2).some(ev => {
                if (!ev.isNormalPriority()) return false;
                const isArcEnemy = ev.event() && ev.event().note && /<ArcEnemy:\d+>/i.test(ev.event().note);
                return !isArcEnemy;
            });
            return !blockingEvent;
        },

        isTilePassable: function(x, y) {
            if (!$gameMap.isValid(x, y)) return false;
            const mapPassable = $gameMap.isPassable(x, y, 2) || $gameMap.isPassable(x, y, 4) ||
                                $gameMap.isPassable(x, y, 6) || $gameMap.isPassable(x, y, 8);
            if (!mapPassable) return false;

            const blockingEvent = $gameMap.eventsXyNt(x, y).some(ev => {
                if (!ev.isNormalPriority()) return false;
                const isArcEnemy = ev.event() && ev.event().note && /<ArcEnemy:\d+>/i.test(ev.event().note);
                return !isArcEnemy;
            });
            return !blockingEvent;
        },

        checkProximityEncounter: function(isEnemyInitiated) {
            if (this._cooldownTimer > 0 || this._active) return;

            const px = $gamePlayer.x;
            const py = $gamePlayer.y;
            let triggeredEnemy = null;

            const events = $gameMap.events();
            for (let i = 0; i < events.length; i++) {
                const event = events[i];
                if (!event._erased && event.event().note) {
                    const match = event.event().note.match(/<ArcEnemy:(\d+)>/i);
                    if (match) {
                        const sensorMatch = event.event().note.match(/<ArcSensor:(\d+)>/i);
                        const sensorRange = sensorMatch ? Number(sensorMatch[1]) : 5;

                        const dist = Math.abs(px - event.x) + Math.abs(py - event.y);
                        if (dist <= sensorRange) {
                            const reachable = this.getReachableTilesBfs(event.x, event.y, sensorRange, false, false);
                            if (reachable.some(t => t.x === px && t.y === py)) {
                                triggeredEnemy = event;
                                break;
                            }
                        }
                    }
                }
            }

            if (triggeredEnemy) {
                SoundManager.playBattleStart();
                triggeredEnemy.requestBalloon(1);
                this.startBattle([], isEnemyInitiated);
            }
        },

        checkEnemyStepEncounter: function(enemyEvent) {
            if (this._cooldownTimer > 0 || this._active) return;

            const sensorMatch = enemyEvent.event().note.match(/<ArcSensor:(\d+)>/i);
            const sensorRange = sensorMatch ? Number(sensorMatch[1]) : 5;
            const px = $gamePlayer.x;
            const py = $gamePlayer.y;
            const dist = Math.abs(px - enemyEvent.x) + Math.abs(py - enemyEvent.y);

            if (dist <= sensorRange) {
                const reachable = this.getReachableTilesBfs(enemyEvent.x, enemyEvent.y, sensorRange, false, false);
                if (reachable.some(t => t.x === px && t.y === py)) {
                    SoundManager.playBattleStart();
                    enemyEvent.requestBalloon(1);
                    this.startBattle([], true);
                }
            }
        },

        startBattle: function(args, isEnemyInitiated) {
            this.clearCooldown();
            this._active = true;
            this._units = [];
            this._rewards = { exp: 0, gold: 0, items: [] };
            this._comboQueue = [];
            this._comboParticipants = [];
            this._comboTargets = [];
            this._comboCount = 0;
            this._cutinTimer = 0;
            this._timelineScrollOffset = 0;
            this._turnCount = 1;
            this._actedUnitIdsInTurn = [];
            this._enemyMoveTiles = [];

            if (args && args.length >= 4) {
                this._areaRect = {
                    x1: Math.max(0, Number(args[0])),
                    y1: Math.max(0, Number(args[1])),
                    x2: Math.min($gameMap.width() - 1, Number(args[2])),
                    y2: Math.min($gameMap.height() - 1, Number(args[3]))
                };
            } else {
                const radius = (args && args.length >= 1 && Number(args[0]) > 0) ? Number(args[0]) : 6;
                this._areaRect = {
                    x1: Math.max(0, $gamePlayer.x - radius),
                    y1: Math.max(0, $gamePlayer.y - radius),
                    x2: Math.min($gameMap.width() - 1, $gamePlayer.x + radius),
                    y2: Math.min($gameMap.height() - 1, $gamePlayer.y + radius)
                };
            }

            this._origPlayerSpeed = $gamePlayer.moveSpeed();

            const members = $gameParty.battleMembers();
            $gamePlayer.followers().show();

            applyPartyOrderSpritesForBattle();

            let unitSeq = 1;
            members.forEach(function(actor, index) {
                actor.setTp(100);
                let unit = (index === 0) ? $gamePlayer : $gamePlayer.followers().follower(index - 1);
                if (unit) {
                    unit.setThrough(false);
                    unit.setTransparent(!actor.isAlive());
                    unit.setOpacity(255);
                    unit.setMoveSpeed(5);
                    unit.setWalkAnime(true);
                    unit._arcUnitId = 'actor_' + unitSeq++;
                    unit._arcBattler = actor;
                    unit._arcIsActor = true;
                    // 開幕からCT30以上でコンボ参加可能にするため初期CTを30に設定
                    unit._arcCt = 30;
                    unit._arcMove = 4;
                    unit._arcAgiBoost = false;

                    if (index > 0) {
                        unit.locate($gamePlayer.x, $gamePlayer.y);
                        unit.setDirection($gamePlayer.direction());
                    }
                    this._units.push(unit);
                }
            }, this);

            $gameMap.events().forEach(function(event) {
                event._arcBattler = null;
                event._arcUnitId = null;
                const match = event.event().note.match(/<ArcEnemy:(\d+)>/i);
                if (match && !event._erased && this.isInBattleArea(event.x, event.y)) {
                    const enemyId = Number(match[1]);
                    if ($dataEnemies[enemyId]) {
                        const enemy = new Game_Enemy(enemyId, 0, 0);
                        event._origSpeed = event.moveSpeed();
                        event.setMoveSpeed(5);
                        event.setWalkAnime(true);
                        event._arcUnitId = 'enemy_ev_' + event.eventId() + '_' + (unitSeq++);
                        event._arcBattler = enemy;
                        event._arcIsActor = false;
                        event._arcCt = 30;
                        event._arcMove = 3;
                        event._arcAgiBoost = Boolean(isEnemyInitiated);
                        this._units.push(event);
                    }
                }
            }, this);

            if (!this._units.some(u => !u._arcIsActor)) {
                this.endBattle("戦闘範囲内に有効な敵イベントが見つかりません。", false);
                return;
            }

            this.syncTimelineOrder(null, null);
            this.playBattleBgm();

            if (isEnemyInitiated) {
                $gameMessage.add("敵が接近してきた！（1ターンの間、敵の素早さ2倍！）");
            }

            this._phase = 'turnOrder';
            this.requestRedraw();
        },

        isInBattleArea: function(x, y) {
            return x >= this._areaRect.x1 && x <= this._areaRect.x2 &&
                   y >= this._areaRect.y1 && y <= this._areaRect.y2;
        },

        getUnitsAt: function(x, y) {
            return this._units.filter(u => u._arcBattler && u._arcBattler.isAlive() && u.x === x && u.y === y);
        },

        hasOppositeUnitAt: function(x, y, isActor) {
            return this._units.some(u => u._arcBattler && u._arcBattler.isAlive() && u.x === x && u.y === y && u._arcIsActor !== isActor);
        },

        getUnitAttackConfig: function(unit) {
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
        },

        getUnitNormalAttackTiles: function(unit) {
            const config = this.getUnitAttackConfig(unit);
            const tiles = [];
            const maxRange = config.maxRange;
            const minR = config.minRange;
            const shapeType = config.shape || 'diamond';
            const startX = unit.x;
            const startY = unit.y;

            for (let dx = -maxRange; dx <= maxRange; dx++) {
                for (let dy = -maxRange; dy <= maxRange; dy++) {
                    const adx = Math.abs(dx);
                    const ady = Math.abs(dy);
                    let validShape = false;

                    if (shapeType === 'cross') {
                        const dist = adx + ady;
                        validShape = (dx === 0 || dy === 0) && dist >= minR && dist <= maxRange;
                    } else if (shapeType === 'square') {
                        const dist = Math.max(adx, ady);
                        validShape = dist >= minR && dist <= maxRange;
                    } else if (shapeType === 'x') {
                        const dist = adx;
                        validShape = (adx === ady) && dist >= minR && dist <= maxRange;
                    } else {
                        const dist = adx + ady;
                        validShape = dist >= minR && dist <= maxRange;
                    }

                    if (validShape) {
                        const tx = startX + dx;
                        const ty = startY + dy;
                        if ($gameMap.isValid(tx, ty) && this.isTilePassable(tx, ty)) {
                            tiles.push({ x: tx, y: ty });
                        }
                    }
                }
            }
            return tiles;
        },

        // 【改修】CTが30以上であれば、同ターンで行動済みであってもコンボ参加可能とする
        getComboEligibleUnitsForTargets: function(initialAttacker, targets) {
            if (!initialAttacker || !initialAttacker._arcBattler) return [];
            const aliveTargets = (targets || []).filter(t => t && t._arcBattler && t._arcBattler.isAlive());
            if (aliveTargets.length === 0) return [];

            const isActorSide = initialAttacker._arcIsActor;
            const candidates = this._units.filter(u => {
                if (u === initialAttacker) return false;
                if (u._arcIsActor !== isActorSide) return false;
                if (!u._arcBattler || !u._arcBattler.isAlive()) return false;
                if ((u._arcCt || 0) < 30) return false;

                const atkTiles = this.getUnitComboAttackTiles(u);
                return aliveTargets.some(target => atkTiles.some(tile => tile.x === target.x && tile.y === target.y));
            });

            candidates.sort((a, b) => b._arcCt - a._arcCt);
            return candidates;
        },

        getComboHighlightUnitsAtCursor: function() {
            if (!this._active || this._phase !== 'selectTarget' || !this._activeUnit) return [];
            const inRange = this._validTiles.some(t => t.x === this._cursorX && t.y === this._cursorY);
            if (!inRange) return [];

            const skill = this._selectedSkill || $dataSkills[1];
            const isForFriend = [7, 8, 9, 10, 11].includes(skill.scope);
            if (isForFriend) return [];

            const candidateTargets = [];
            this._aoeTiles.forEach(tile => {
                const unitsOnTile = this.getUnitsAt(tile.x, tile.y);
                unitsOnTile.forEach(u => {
                    if (u._arcIsActor !== this._activeUnit._arcIsActor) {
                        candidateTargets.push(u);
                    }
                });
            });

            return this.getComboEligibleUnitsForTargets(this._activeUnit, candidateTargets);
        },

        getComboTriggerTileKeys: function() {
            const comboTileKeys = {};
            if (!this._active || this._phase !== 'selectTarget' || !this._activeUnit) return comboTileKeys;

            const skill = this._selectedSkill || $dataSkills[1];
            const isForFriend = [7, 8, 9, 10, 11].includes(skill.scope);
            if (isForFriend) return comboTileKeys;

            const isActorSide = this._activeUnit._arcIsActor;
            const otherSideUnits = this._units.filter(u =>
                u !== this._activeUnit &&
                u._arcIsActor === isActorSide &&
                u._arcBattler &&
                u._arcBattler.isAlive() &&
                (u._arcCt || 0) >= 30
            );

            if (otherSideUnits.length === 0) return comboTileKeys;

            this._validTiles.forEach(tile => {
                const opposingUnitsOnTile = this.getUnitsAt(tile.x, tile.y).filter(u => u._arcIsActor !== isActorSide);
                if (opposingUnitsOnTile.length > 0) {
                    const hasComboSupport = otherSideUnits.some(supportUnit => {
                        const atkTiles = this.getUnitComboAttackTiles(supportUnit);
                        return atkTiles.some(at => at.x === tile.x && at.y === tile.y);
                    });
                    if (hasComboSupport) {
                        comboTileKeys[tile.x + "," + tile.y] = true;
                    }
                }
            });

            return comboTileKeys;
        },

        update: function() {
            if (!this._active) return;

            this._animFrameCounter = (this._animFrameCounter + 1) % 60;
            if (this._phase === 'selectTarget' && this._animFrameCounter % 15 === 0) {
                this.requestRedraw();
            }

            if (this._timelineScrollOffset > 0) {
                this._timelineScrollOffset = Math.max(0, this._timelineScrollOffset - 6);
                this.requestRedraw();
            }

            switch (this._phase) {
                case 'turnOrder':
                    this.updateTurnOrder();
                    break;
                case 'walkMove':
                    this.updateWalkMove();
                    break;
                case 'command':
                case 'skillSelect':
                    break;
                case 'selectTarget':
                    this.updateCursorInput();
                    if (Input.isTriggered('ok')) this.decideTarget();
                    if (Input.isTriggered('cancel')) {
                        SoundManager.playCancel();
                        this._validTiles = [];
                        this._aoeTiles = [];
                        this.openCommandWindow();
                    }
                    break;
                case 'enemyWalking':
                    this.updateEnemyWalking();
                    break;
                case 'comboChain':
                    this.updateComboChain();
                    break;
            }
        },

        checkAndAdvanceTurnIfAllActed: function() {
            const aliveUnits = this._units.filter(u => u._arcBattler && u._arcBattler.isAlive());
            if (aliveUnits.length === 0) return false;

            const allActed = aliveUnits.every(u => this._actedUnitIdsInTurn.includes(u._arcUnitId));
            if (allActed) {
                this._turnCount++;
                this._actedUnitIdsInTurn = [];
                this.requestRedraw();
                return true;
            }
            return false;
        },

        updateTurnOrder: function() {
            const enemiesAlive = this._units.some(u => !u._arcIsActor && u._arcBattler.isAlive());
            if (!enemiesAlive) {
                this.endBattle("敵をすべて倒した！（バトル勝利）", true);
                return;
            }
            const actorsAlive = this._units.some(u => u._arcIsActor && u._arcBattler.isAlive());
            if (!actorsAlive) {
                this.endBattle("味方が全滅してしまった……", false);
                SceneManager.goto(Scene_Gameover);
                return;
            }

            this.checkAndAdvanceTurnIfAllActed();

            let safetyLoop = 0;
            while (safetyLoop < 200) {
                safetyLoop++;
                for (let i = 0; i < this._units.length; i++) {
                    const unit = this._units[i];
                    if (unit._arcBattler && unit._arcBattler.isAlive()) {
                        const alreadyActedThisTurn = this._actedUnitIdsInTurn.includes(unit._arcUnitId);
                        const ctCap = alreadyActedThisTurn ? 30 : 100;
                        const agi = unit._arcBattler.agi * (unit._arcAgiBoost ? 2 : 1);

                        if (unit._arcCt < ctCap) {
                            unit._arcCt = Math.min(ctCap, unit._arcCt + agi);
                        }

                        if (!alreadyActedThisTurn && unit._arcCt >= 100) {
                            this.startUnitTurn(unit);
                            return;
                        }
                    }
                }
            }
            this.requestRedraw();
        },

        recordEnemyRewards: function(enemyBattler) {
            if (!enemyBattler || enemyBattler._arcRewardRecorded) return;
            enemyBattler._arcRewardRecorded = true;
            this._rewards.exp += enemyBattler.exp();
            this._rewards.gold += enemyBattler.gold();
            const drops = enemyBattler.makeDropItems();
            drops.forEach(item => {
                this._rewards.items.push(item);
            });
        },

        gainRecordedRewards: function() {
            const exp = this._rewards.exp;
            const gold = this._rewards.gold;
            const items = this._rewards.items;

            if (exp > 0) {
                $gameMessage.add(exp + " の経験値を獲得！");
            }
            if (gold > 0) {
                $gameParty.gainGold(gold);
                $gameMessage.add(gold + " " + TextManager.currencyUnit + "を手に入れた！");
            }
            items.forEach(item => {
                $gameParty.gainItem(item, 1);
                $gameMessage.add(item.name + "を手に入れた！");
            });
            if (exp > 0) {
                $gameParty.allMembers().forEach(actor => {
                    actor.gainExp(exp);
                });
            }
            this._rewards = { exp: 0, gold: 0, items: [] };
        },

        endBattle: function(message, grantRewards) {
            this._active = false;
            this._phase = 'none';
            this._activeUnit = null;
            this._validTiles = [];
            this._enemyMoveTiles = [];
            this._aoeTiles = [];
            this._comboQueue = [];
            this._comboParticipants = [];
            this._comboTargets = [];
            this._comboCount = 0;
            this._cutinTimer = 0;
            this._timelineOrder = [];
            this._actedUnitIdsInTurn = [];
            if (this._cmdWindow) this._cmdWindow.close();
            if (this._skillWindow) this._skillWindow.close();
            if (this._statusWindow) {
                this._statusWindow.close();
                this._statusWindow.openness = 0;
                this._statusWindow.visible = false;
            }

            this.stopBattleBgm();
            this.resetPlayerVisualsOnEnd();
            $gamePlayer.center($gamePlayer.x, $gamePlayer.y);

            $gamePlayer.followers().forEach(f => {
                f.locate($gamePlayer.x, $gamePlayer.y);
            });
            this._units.forEach(u => {
                if (!u._arcIsActor && u._origSpeed) {
                    u.setMoveSpeed(u._origSpeed);
                }
                u._arcBattler = null;
                u._arcAgiBoost = false;
                u._arcUnitId = null;
            });

            $gamePlayer.followers().gather();
            this.startCooldown();
            this.requestRedraw();
            if (message) $gameMessage.add(message);

            if (grantRewards !== false) {
                this.gainRecordedRewards();
            }
        },

        startUnitTurn: function(unit) {
            this._activeUnit = unit;
            this._prevX = unit.x;
            this._prevY = unit.y;
            this._prevDir = unit.direction();
            this._enemyMoveTiles = [];

            this.syncTimelineOrder(null, unit);

            if (unit._arcIsActor) {
                this.calcValidTiles(this._prevX, this._prevY, unit._arcMove, true, true, 0, 'diamond');
                this._phase = 'walkMove';
            } else {
                this.startEnemyAi(unit);
            }
            this.requestRedraw();
        },

        triggerTransferEventIfPresent: function(unit) {
            const transferEv = this.getTransferEventAt(unit.x, unit.y);
            if (!transferEv) return false;

            if (unit !== $gamePlayer) {
                $gamePlayer.locate(unit.x, unit.y);
                $gamePlayer.setDirection(unit.direction());
            }
            this.finishBattleOnTransfer();
            transferEv.start();
            return true;
        },

        updateWalkMove: function() {
            const unit = this._activeUnit;
            if (unit.isMoving()) return;

            if (unit._arcJustMoved) {
                unit._arcJustMoved = false;
                if (this.triggerTransferEventIfPresent(unit)) {
                    return;
                }
            }

            const dir = Input.dir4;
            if (dir > 0) {
                unit.setDirection(dir);

                const tx = $gameMap.roundXWithDirection(unit.x, dir);
                const ty = $gameMap.roundYWithDirection(unit.y, dir);

                const inRange = this._validTiles.some(t => t.x === tx && t.y === ty);
                const blockedByEnemy = this.hasOppositeUnitAt(tx, ty, true);

                if (inRange && !blockedByEnemy && unit.canPass(unit.x, unit.y, dir)) {
                    unit.moveStraight(dir);
                    unit._arcJustMoved = true;
                    this.requestRedraw();
                }
            } else if (Input.isTriggered('ok')) {
                if (this.triggerTransferEventIfPresent(unit)) {
                    return;
                }
                if (!this.isInBattleArea(unit.x, unit.y)) {
                    SoundManager.playEscape();
                    if (unit !== $gamePlayer) {
                        $gamePlayer.locate(unit.x, unit.y);
                    }
                    this.endBattle("戦闘範囲から離脱した！（逃走成功）", true);
                    return;
                }
                SoundManager.playOk();
                this.openCommandWindow();
            } else if (Input.isTriggered('cancel')) {
                if (unit.x !== this._prevX || unit.y !== this._prevY) {
                    SoundManager.playCancel();
                    unit.locate(this._prevX, this._prevY);
                    unit.setDirection(this._prevDir);
                    unit._arcJustMoved = false;
                    this.requestRedraw();
                }
            }
        },

        calcValidTiles: function(startX, startY, maxRange, checkPassable, isActor, minRange, shape) {
            if (checkPassable) {
                this._validTiles = this.getReachableTilesBfs(startX, startY, maxRange, true, isActor);
                return;
            }

            this._validTiles = [];
            const minR = (minRange !== undefined) ? minRange : 0;
            const shapeType = shape || 'diamond';

            for (let dx = -maxRange; dx <= maxRange; dx++) {
                for (let dy = -maxRange; dy <= maxRange; dy++) {
                    const adx = Math.abs(dx);
                    const ady = Math.abs(dy);
                    let validShape = false;

                    if (shapeType === 'cross') {
                        const dist = adx + ady;
                        validShape = (dx === 0 || dy === 0) && dist >= minR && dist <= maxRange;
                    } else if (shapeType === 'square') {
                        const dist = Math.max(adx, ady);
                        validShape = dist >= minR && dist <= maxRange;
                    } else if (shapeType === 'x') {
                        const dist = adx;
                        validShape = (adx === ady) && dist >= minR && dist <= maxRange;
                    } else {
                        const dist = adx + ady;
                        validShape = dist >= minR && dist <= maxRange;
                    }

                    if (validShape) {
                        const tx = startX + dx;
                        const ty = startY + dy;
                        if ($gameMap.isValid(tx, ty) && this.isTilePassable(tx, ty)) {
                            this._validTiles.push({ x: tx, y: ty });
                        }
                    }
                }
            }
        },

        updateAoeTiles: function() {
            this._aoeTiles = [];
            const inRange = this._validTiles.some(t => t.x === this._cursorX && t.y === this._cursorY);
            if (!inRange) return;

            const area = this._skillArea || 0;
            const areaShape = this._skillAreaShape || 'diamond';

            if (area === 0) {
                if (this.isTilePassable(this._cursorX, this._cursorY)) {
                    this._aoeTiles.push({ x: this._cursorX, y: this._cursorY });
                }
                return;
            }

            const ux = this._activeUnit ? this._activeUnit.x : this._cursorX;
            const uy = this._activeUnit ? this._activeUnit.y : this._cursorY;

            if (areaShape === 'line') {
                const vx = Math.sign(this._cursorX - ux);
                const vy = Math.sign(this._cursorY - uy);
                if (vx === 0 && vy === 0) {
                    if (this.isTilePassable(this._cursorX, this._cursorY)) {
                        this._aoeTiles.push({ x: this._cursorX, y: this._cursorY });
                    }
                } else {
                    for (let i = 0; i <= area; i++) {
                        const tx = this._cursorX + vx * i;
                        const ty = this._cursorY + vy * i;
                        if ($gameMap.isValid(tx, ty) && this.isTilePassable(tx, ty)) {
                            this._aoeTiles.push({ x: tx, y: ty });
                        }
                    }
                }
                return;
            }

            if (areaShape === 'sweep') {
                const dx = this._cursorX - ux;
                const dy = this._cursorY - uy;
                for (let i = -area; i <= area; i++) {
                    const tx = Math.abs(dx) >= Math.abs(dy) ? this._cursorX : this._cursorX + i;
                    const ty = Math.abs(dx) >= Math.abs(dy) ? this._cursorY + i : this._cursorY;
                    if ($gameMap.isValid(tx, ty) && this.isTilePassable(tx, ty)) {
                        this._aoeTiles.push({ x: tx, y: ty });
                    }
                }
                return;
            }

            for (let dx = -area; dx <= area; dx++) {
                for (let dy = -area; dy <= area; dy++) {
                    const adx = Math.abs(dx);
                    const ady = Math.abs(dy);
                    let ok = false;
                    if (areaShape === 'square') {
                        ok = Math.max(adx, ady) <= area;
                    } else if (areaShape === 'cross') {
                        ok = (dx === 0 || dy === 0) && (adx + ady <= area);
                    } else {
                        ok = (adx + ady <= area);
                    }
                    if (ok) {
                        const tx = this._cursorX + dx;
                        const ty = this._cursorY + dy;
                        if ($gameMap.isValid(tx, ty) && this.isTilePassable(tx, ty)) {
                            this._aoeTiles.push({ x: tx, y: ty });
                        }
                    }
                }
            }
        },

        updateCursorInput: function() {
            let moved = false;
            if (Input.isRepeated('down'))  { this._cursorY = Math.min($gameMap.height() - 1, this._cursorY + 1); moved = true; }
            if (Input.isRepeated('up'))    { this._cursorY = Math.max(0, this._cursorY - 1); moved = true; }
            if (Input.isRepeated('right')) { this._cursorX = Math.min($gameMap.width() - 1, this._cursorX + 1); moved = true; }
            if (Input.isRepeated('left'))  { this._cursorX = Math.max(0, this._cursorX - 1); moved = true; }
            if (moved) {
                this.updateAoeTiles();
                this.requestRedraw();
            }
        },

        openCommandWindow: function() {
            this._phase = 'command';
            this.requestRedraw();
            if (this._cmdWindow) {
                this._cmdWindow.refresh();
                this._cmdWindow.select(0);
                this._cmdWindow.open();
                this._cmdWindow.activate();
            }
        },

        onCommandAttack: function() {
            this._cmdWindow.close();
            this._selectedSkill = $dataSkills[1];

            const atkConfig = this.getUnitAttackConfig(this._activeUnit);
            this._skillArea = atkConfig.area;
            this._skillAreaShape = atkConfig.areaShape;

            this.calcValidTiles(
                this._activeUnit.x,
                this._activeUnit.y,
                atkConfig.maxRange,
                false,
                true,
                atkConfig.minRange,
                atkConfig.shape
            );

            this._cursorX = this._activeUnit.x;
            this._cursorY = this._activeUnit.y;
            this.updateAoeTiles();
            this._phase = 'selectTarget';
            this.requestRedraw();
        },

        onCommandSkill: function() {
            this._phase = 'skillSelect';
            this._skillWindow.setActor(this._activeUnit._arcBattler);
            this._skillWindow.refresh();
            this._skillWindow.select(0);
            this._skillWindow.open();
            this._skillWindow.activate();
            this.requestRedraw();
        },

        onCommandWait: function() {
            this._cmdWindow.close();
            this.endTurn();
        },

        onCommandCancel: function() {
            this._cmdWindow.close();
            this.calcValidTiles(this._prevX, this._prevY, this._activeUnit._arcMove, true, true, 0, 'diamond');
            this._phase = 'walkMove';
            this.requestRedraw();
        },

        onSkillOk: function() {
            const skill = this._skillWindow.item();
            if (!skill || !this._skillWindow.isEnabled(skill)) {
                SoundManager.playBuzzer();
                this._skillWindow.activate();
                return;
            }
            this._skillWindow.close();
            this._cmdWindow.close();
            this._selectedSkill = skill;

            const rangeMatch = skill.note.match(/<ArcRange:(\d+)>/i);
            const maxRange = rangeMatch ? Number(rangeMatch[1]) : 3;

            const minRangeMatch = skill.note.match(/<ArcMinRange:(\d+)>/i);
            const minRange = minRangeMatch ? Number(minRangeMatch[1]) : 0;

            const shapeMatch = skill.note.match(/<ArcShape:(\w+)>/i);
            const shape = shapeMatch ? shapeMatch[1].toLowerCase() : 'diamond';

            const areaMatch = skill.note.match(/<ArcArea:(\d+)>/i);
            const isAllScope = [2, 8].includes(skill.scope);
            this._skillArea = areaMatch ? Number(areaMatch[1]) : (isAllScope ? 1 : 0);

            const areaShapeMatch = skill.note.match(/<ArcAreaShape:(\w+)>/i);
            this._skillAreaShape = areaShapeMatch ? areaShapeMatch[1].toLowerCase() : 'diamond';

            this.calcValidTiles(this._activeUnit.x, this._activeUnit.y, maxRange, false, true, minRange, shape);
            this._cursorX = this._activeUnit.x;
            this._cursorY = this._activeUnit.y;
            this.updateAoeTiles();
            this._phase = 'selectTarget';
            this.requestRedraw();
        },

        onSkillCancel: function() {
            this._skillWindow.close();
            this._phase = 'command';
            this._cmdWindow.activate();
            this.requestRedraw();
        },

        decideTarget: function() {
            const isValid = this._validTiles.some(t => t.x === this._cursorX && t.y === this._cursorY);
            if (!isValid) {
                SoundManager.playBuzzer();
                return;
            }

            const skill = this._selectedSkill;
            const isForFriend = [7, 8, 9, 10, 11].includes(skill.scope);

            const targets = [];
            this._aoeTiles.forEach(tile => {
                const unitsOnTile = this.getUnitsAt(tile.x, tile.y);
                unitsOnTile.forEach(unit => {
                    if (isForFriend && unit._arcIsActor) {
                        targets.push(unit);
                    } else if (!isForFriend && !unit._arcIsActor) {
                        targets.push(unit);
                    }
                });
            });

            if (targets.length === 0) {
                SoundManager.playBuzzer();
                return;
            }

            this.executeSkillAction(this._activeUnit, targets, skill, 0, 0);

            if (!isForFriend) {
                this.startComboSequence(this._activeUnit, targets);
            } else {
                this.endTurn();
            }
        },

        startComboSequence: function(initialAttacker, targets) {
            initialAttacker._arcCt = 0;
            this.markUnitActedInTurn(initialAttacker);

            const aliveTargets = targets.filter(t => t._arcBattler && t._arcBattler.isAlive());
            if (aliveTargets.length === 0) {
                this.endTurn();
                return;
            }

            const candidates = this.getComboEligibleUnitsForTargets(initialAttacker, aliveTargets);
            if (candidates.length === 0) {
                this.endTurn();
                return;
            }

            this._comboQueue = candidates;
            this._comboParticipants = [initialAttacker].concat(candidates);
            this._comboTargets = aliveTargets;
            this._comboCount = 1;
            this._validTiles = [];
            this._aoeTiles = [];
            this._phase = 'comboChain';
            this.requestRedraw();
        },

        // 【改修】コンボ参加キャラごとに設定された技（スキル）の範囲と効果処理で攻撃を実行する
        updateComboChain: function() {
            const aliveTargets = this._comboTargets.filter(t => t._arcBattler && t._arcBattler.isAlive());
            if (aliveTargets.length === 0 || this._comboQueue.length === 0) {
                this._comboQueue = [];
                this._comboParticipants = [];
                this._comboTargets = [];
                this.endTurn();
                return;
            }

            const nextAttacker = this._comboQueue.shift();
            if (!nextAttacker || !nextAttacker._arcBattler.isAlive() || (nextAttacker._arcCt || 0) < 30) {
                return;
            }

            const comboSkill = this.getUnitComboSkill(nextAttacker);
            const atkTiles = this.getUnitComboAttackTiles(nextAttacker);

            // 初期ターゲットのうち、このコンボ技の射程内にいるものを起点として範囲計算
            const primaryTarget = aliveTargets.find(target =>
                atkTiles.some(tile => tile.x === target.x && tile.y === target.y)
            );
            if (!primaryTarget) {
                return;
            }

            const comboAoE = this.getComboAoETilesAt(nextAttacker, primaryTarget.x, primaryTarget.y);
            const isForFriend = [7, 8, 9, 10, 11].includes(comboSkill.scope);
            const reachableTargets = [];

            comboAoE.forEach(tile => {
                const unitsOnTile = this.getUnitsAt(tile.x, tile.y);
                unitsOnTile.forEach(u => {
                    if (isForFriend && u._arcIsActor === nextAttacker._arcIsActor) {
                        reachableTargets.push(u);
                    } else if (!isForFriend && u._arcIsActor !== nextAttacker._arcIsActor) {
                        reachableTargets.push(u);
                    }
                });
            });

            if (reachableTargets.length === 0) {
                return;
            }

            this._comboCount++;
            this._activeUnit = nextAttacker;

            this.triggerComboCutin(nextAttacker, this._comboCount, comboSkill);

            const actor = nextAttacker._arcIsActor ? nextAttacker._arcBattler : null;
            const cfg = this.parseSkillRangeConfig(comboSkill, actor);
            this._skillArea = cfg.area;
            this._skillAreaShape = cfg.areaShape;

            this.executeSkillAction(nextAttacker, reachableTargets, comboSkill, this._comboCount, cfg.area);

            // コンボ攻撃後、CTを0にする（同ターン行動済みでもCT>=30があれば次コンボへ参加可能）
            nextAttacker._arcCt = 0;
            this.markUnitActedInTurn(nextAttacker);
            this.requestRedraw();
        },

        triggerComboCutin: function(unit, comboCount, skill) {
            this._cutinBattler = unit._arcBattler;
            this._cutinIsActor = unit._arcIsActor;
            this._cutinSkillName = skill ? skill.name : '';
            this._cutinTimer = 75;
            SoundManager.playUseSkill();
        },

        executeSkillAction: function(attacker, targets, skill, comboCount, areaSize) {
            const refX = (this._phase === 'selectTarget') ? this._cursorX : targets[0].x;
            const refY = (this._phase === 'selectTarget') ? this._cursorY : targets[0].y;
            if (attacker.x !== refX || attacker.y !== refY) {
                const sx = attacker.deltaXFrom(refX);
                const sy = attacker.deltaYFrom(refY);
                if (Math.abs(sx) > Math.abs(sy)) {
                    attacker.setDirection(sx > 0 ? 4 : 6);
                } else if (sy !== 0) {
                    attacker.setDirection(sy > 0 ? 8 : 2);
                }
            }

            const a = attacker._arcBattler;
            if (a.canPaySkillCost(skill)) {
                a.paySkillCost(skill);
            }

            let animId = skill.animationId;
            if (animId < 0) {
                if (attacker._arcIsActor && a.weapons()[0]) {
                    animId = a.weapons()[0].animationId || 1;
                } else {
                    animId = 1;
                }
            } else if (animId === 0) {
                animId = 1;
            }

            const animData = $dataAnimations[animId];
            if (comboCount && comboCount >= 2) {
                const rateText = (1 + 0.1 * comboCount).toFixed(1);
                $gameMessage.add(`【${comboCount} COMBO!! (威力×${rateText})】 ${a.name()}の${skill.name}！`);
            } else {
                $gameMessage.add(a.name() + "の" + skill.name + "！");
            }

            const effectiveArea = (areaSize !== undefined) ? areaSize : (this._skillArea || 0);

            targets.forEach((target, index) => {
                const b = target._arcBattler;
                if (!animData || animData.position !== 3 || index === 0) {
                    target.requestAnimation(animId);
                }

                let value = 0;
                try {
                    const item = skill;
                    const v = $gameVariables._data;
                    value = Math.max(0, Math.floor(eval(skill.damage.formula)));
                } catch (e) {
                    value = Math.max(1, a.atk * 4 - b.def * 2);
                }

                if (skill.damage.type === 3) {
                    b.gainHp(value);
                    SoundManager.playRecovery();
                    $gameMessage.add("→ " + b.name() + "のHPが " + value + " 回復した！");
                } else {
                    let bonusText = "";
                    const stackOnTargetTile = this.getUnitsAt(target.x, target.y);
                    const isStacked = stackOnTargetTile.length > 1;

                    if (effectiveArea === 0 && !isStacked && attacker !== target && attacker.direction() === target.direction()) {
                        value = Math.floor(value * 1.5);
                        bonusText += "【背面1.5倍！】";
                    }

                    if (comboCount && comboCount >= 2) {
                        const comboMultiplier = 1 + 0.1 * comboCount;
                        value = Math.floor(value * comboMultiplier);
                    }

                    b.gainHp(-value);
                    if (target._arcIsActor) {
                        SoundManager.playActorDamage();
                    } else {
                        SoundManager.playEnemyDamage();
                    }
                    $gameMessage.add("→ " + bonusText + b.name() + "に " + value + " のダメージ！");

                    if (b.isDead()) {
                        if (target._arcIsActor) {
                            SoundManager.playActorCollapse();
                            $gameMessage.add("→ " + b.name() + "は倒れてしまった……！");
                            target.setTransparent(true);
                        } else {
                            SoundManager.playEnemyCollapse();
                            $gameMessage.add("→ " + b.name() + "を倒した！");
                            this.recordEnemyRewards(b);
                            target.erase();
                        }
                    }
                }
            });
            this.requestRedraw();
        },

        startEnemyAi: function(enemyUnit) {
            const aliveActors = this._units.filter(u => u._arcIsActor && u._arcBattler.isAlive());
            if (aliveActors.length === 0) {
                this.endTurn();
                return;
            }

            const reachable = this.getReachableTilesBfs(enemyUnit.x, enemyUnit.y, enemyUnit._arcMove, true, false);
            this._enemyMoveTiles = reachable.filter(t => this.isInBattleArea(t.x, t.y));

            let targetActor = aliveActors[0];
            let nearestActorDist = 999;
            aliveActors.forEach(actorUnit => {
                const d = Math.abs(enemyUnit.x - actorUnit.x) + Math.abs(enemyUnit.y - actorUnit.y);
                if (d < nearestActorDist) {
                    nearestActorDist = d;
                    targetActor = actorUnit;
                }
            });
            enemyUnit._arcAiTarget = targetActor;
            this._enemySteps = enemyUnit._arcMove;
            this._phase = 'enemyWalking';
            this.requestRedraw();
        },

        updateEnemyWalking: function() {
            const enemy = this._activeUnit;
            if (enemy.isMoving()) return;

            const target = enemy._arcAiTarget;
            const atkTiles = this.getUnitNormalAttackTiles(enemy);
            const inAtkRange = atkTiles.some(t => t.x === target.x && t.y === target.y);

            if (this._enemySteps > 0 && !inAtkRange) {
                this._enemySteps--;
                this.stepTowardTarget(enemy, target);
            } else {
                this.executeEnemyAttack();
            }
        },

        stepTowardTarget: function(enemy, target) {
            const dirs = [2, 4, 6, 8];
            let bestDir = 0;
            let minDist = Math.abs(enemy.x - target.x) + Math.abs(enemy.y - target.y);

            for (let i = 0; i < dirs.length; i++) {
                const d = dirs[i];
                const tx = $gameMap.roundXWithDirection(enemy.x, d);
                const ty = $gameMap.roundYWithDirection(enemy.y, d);
                const blockedByActor = this.hasOppositeUnitAt(tx, ty, false);
                if (this.isInBattleArea(tx, ty) && !blockedByActor && enemy.canPass(enemy.x, enemy.y, d)) {
                    const newDist = Math.abs(tx - target.x) + Math.abs(ty - target.y);
                    if (newDist < minDist) {
                        minDist = newDist;
                        bestDir = d;
                    }
                }
            }

            if (bestDir > 0) {
                enemy.moveStraight(bestDir);
                this.requestRedraw();
            } else {
                this._enemySteps = 0;
            }
        },

        executeEnemyAttack: function() {
            const enemy = this._activeUnit;
            const target = enemy._arcAiTarget;
            if (target && target._arcBattler.isAlive()) {
                const atkTiles = this.getUnitNormalAttackTiles(enemy);
                const inAtkRange = atkTiles.some(t => t.x === target.x && t.y === target.y);
                if (inAtkRange) {
                    this._skillArea = 0;
                    this._skillAreaShape = 'diamond';
                    const targetsOnTile = this.getUnitsAt(target.x, target.y).filter(u => u._arcIsActor);
                    this.executeSkillAction(enemy, targetsOnTile, $dataSkills[1], 0, 0);
                    this.startComboSequence(enemy, targetsOnTile);
                    return;
                }
            }
            this.endTurn();
        },

        endTurn: function() {
            const finishedUnit = this._activeUnit;
            if (finishedUnit) {
                finishedUnit._arcCt = 0;
                finishedUnit._arcAgiBoost = false;
                finishedUnit._arcJustMoved = false;
                this.markUnitActedInTurn(finishedUnit);
            }
            this._activeUnit = null;
            this._validTiles = [];
            this._enemyMoveTiles = [];
            this._aoeTiles = [];
            this._comboQueue = [];
            this._comboParticipants = [];
            this._comboTargets = [];
            this._comboCount = 0;

            const advancedTurn = this.checkAndAdvanceTurnIfAllActed();

            this._timelineScrollOffset = 60;
            this.syncTimelineOrder(finishedUnit, null);
            this._phase = 'turnOrder';
            this.requestRedraw();

            if (advancedTurn) {
                this.updateTurnOrder();
            }
        }
    };

    //=============================================================================
    // 5. Scene_Map の拡張（コンボ技範囲表示・グリッド重複カラー・タイムライン描画）
    //=============================================================================
    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);

        this._arcCommandWindow = new Window_ArcCommand();
        this._arcCommandWindow.setHandler('attack', () => ArcManager.onCommandAttack());
        this._arcCommandWindow.setHandler('skill',  () => ArcManager.onCommandSkill());
        this._arcCommandWindow.setHandler('wait',   () => ArcManager.onCommandWait());
        this._arcCommandWindow.setHandler('cancel', () => ArcManager.onCommandCancel());
        this.addWindow(this._arcCommandWindow);
        ArcManager._cmdWindow = this._arcCommandWindow;

        this._arcSkillWindow = new Window_ArcSkill();
        this._arcSkillWindow.setHandler('ok',     () => ArcManager.onSkillOk());
        this._arcSkillWindow.setHandler('cancel', () => ArcManager.onSkillCancel());
        this.addWindow(this._arcSkillWindow);
        ArcManager._skillWindow = this._arcSkillWindow;

        this._arcStatusWindow = new Window_ArcStatus();
        this.addWindow(this._arcStatusWindow);
        ArcManager._statusWindow = this._arcStatusWindow;
    };

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        ArcManager.updateCamera();
        this.updateArcCutin();
        ArcManager.refreshStatusWindow();
        if (!$gameMessage.isBusy()) {
            ArcManager.update();
            ArcManager.updateCooldown();
        }
        this.updateArcGrid();
    };

    const _Spriteset_Map_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function() {
        _Spriteset_Map_createLowerLayer.call(this);

        this._arcGridSprite = new Sprite(new Bitmap(Graphics.width, Graphics.height));
        this._arcGridSprite.z = 1;
        this._tilemap.addChild(this._arcGridSprite);

        this._arcTentSprite = new Sprite(new Bitmap(Graphics.width, Graphics.height));
        this._arcTentSprite.z = 4;
        this._tilemap.addChild(this._arcTentSprite);

        this._arcUiSprite = new Sprite(new Bitmap(Graphics.width, 60));
        this.addChild(this._arcUiSprite);

        this._arcTimelineSprite = new Sprite(new Bitmap(96, Graphics.height));
        this._arcTimelineSprite.x = Graphics.width - 96;
        this._arcTimelineSprite.y = 0;
        this.addChild(this._arcTimelineSprite);

        this._arcCutinSprite = new Sprite(new Bitmap(Graphics.width, 160));
        this._arcCutinSprite.y = 110;
        this._arcCutinSprite.visible = false;
        this.addChild(this._arcCutinSprite);

        this._lastDisplayX = -999;
        this._lastDisplayY = -999;
        ArcManager.requestRedraw();
    };

    Scene_Map.prototype.updateArcCutin = function() {
        const sprite = this._spriteset ? this._spriteset._arcCutinSprite : null;
        if (!sprite) return;

        if (ArcManager._cutinTimer > 0 && ArcManager._cutinBattler) {
            if (ArcManager._cutinTimer === 75) {
                this.drawArcCutin(sprite.bitmap, ArcManager._cutinBattler, ArcManager._cutinIsActor, ArcManager._comboCount, ArcManager._cutinSkillName);
            }
            ArcManager._cutinTimer--;
            sprite.visible = true;
            sprite.opacity = Math.min(255, ArcManager._cutinTimer * 18);
        } else {
            sprite.visible = false;
        }
    };

    Scene_Map.prototype.drawArcCutin = function(bitmap, battler, isActor, comboCount, skillName) {
        bitmap.clear();
        const w = bitmap.width;

        const bgColor = isActor ? 'rgba(0, 50, 140, 0.85)' : 'rgba(140, 20, 20, 0.85)';
        bitmap.fillRect(0, 16, w, 128, bgColor);
        bitmap.fillRect(0, 16, w, 4, '#ffffff');
        bitmap.fillRect(0, 140, w, 4, '#ffffff');

        const mult = (1 + 0.1 * comboCount).toFixed(1);
        bitmap.fontSize = 44;
        bitmap.textColor = '#ffff00';
        bitmap.outlineColor = 'rgba(0, 0, 0, 0.95)';
        bitmap.outlineWidth = 6;
        bitmap.drawText(`${comboCount} COMBO!!`, 210, 24, 420, 54, 'left');

        const actionLabel = skillName ? `${skillName} 連携！` : `連携追撃！`;
        bitmap.fontSize = 26;
        bitmap.textColor = '#ffffff';
        bitmap.drawText(`${battler.name()} の${actionLabel} (ダメージ×${mult})`, 210, 82, 560, 44, 'left');

        if (isActor) {
            const faceBitmap = ImageManager.loadFace(battler.faceName());
            faceBitmap.addLoadListener(() => {
                const pw = Window_Base._faceWidth;
                const ph = Window_Base._faceHeight;
                const faceIndex = battler.faceIndex();
                const sx = (faceIndex % 4) * pw;
                const sy = Math.floor(faceIndex / 4) * ph;
                bitmap.blt(faceBitmap, sx, sy, pw, ph, 40, 8);
            });
        } else {
            const enemyBitmap = ImageManager.loadEnemy(battler.battlerName(), battler.battlerHue());
            enemyBitmap.addLoadListener(() => {
                const sw = enemyBitmap.width;
                const sh = enemyBitmap.height;
                const dh = Math.min(136, sh);
                const dw = Math.floor(sw * (dh / Math.max(1, sh)));
                bitmap.blt(enemyBitmap, 0, 0, sw, sh, 40, 12, dw, dh);
            });
        }
    };

    Scene_Map.prototype.drawArcTimeline = function(bitmap) {
        bitmap.clear();
        if (!ArcManager._active || !ArcManager._timelineOrder || ArcManager._timelineOrder.length === 0) return;

        const order = ArcManager._timelineOrder;
        const radius = 21;
        const gaugeRadius = radius + 4;
        const diameter = radius * 2;
        const spacing = 60;
        const cx = bitmap.width - gaugeRadius - 10;
        const bottomY = bitmap.height - 46;

        const comboReadyUnits = ArcManager.getComboHighlightUnitsAtCursor();
        const pulse = 0.5 + 0.5 * Math.sin((ArcManager._animFrameCounter / 60) * Math.PI * 4);

        const railTop = Math.max(12, bottomY - order.length * spacing);
        bitmap.fillRect(cx - 2, railTop, 4, bottomY - railTop + gaugeRadius, 'rgba(255, 255, 255, 0.22)');

        for (let i = 0; i < order.length; i++) {
            const unit = order[i];
            if (!unit || !unit._arcBattler || !unit._arcBattler.isAlive()) continue;

            const distFromBottom = order.length - 1 - i;
            const cy = bottomY - distFromBottom * spacing + ArcManager._timelineScrollOffset;

            if (cy + gaugeRadius + 8 < 0 || cy - gaugeRadius - 8 > bitmap.height) continue;

            const isCurrentOrNext = (unit === ArcManager._activeUnit) || (distFromBottom === 0 && !ArcManager._activeUnit);
            const isComboReady = comboReadyUnits.includes(unit);
            const isActor = unit._arcIsActor;
            const battler = unit._arcBattler;
            const ctRate = Math.max(0, Math.min(1, (unit._arcCt || 0) / 100));

            const drawCircleIcon = (srcBitmap, sx, sy, sw, sh) => {
                const ctx = bitmap._context;

                if (isComboReady) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(cx, cy, gaugeRadius + 4, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 235, 70, ${0.28 + 0.27 * pulse})`;
                    ctx.fill();
                    ctx.lineWidth = 4;
                    ctx.strokeStyle = `rgba(255, 255, 180, ${0.75 + 0.25 * pulse})`;
                    ctx.stroke();
                    ctx.restore();
                }

                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();

                ctx.fillStyle = isActor ? '#1a3a6c' : '#6c1a1a';
                ctx.fillRect(cx - radius, cy - radius, diameter, diameter);

                if (srcBitmap && srcBitmap.width > 0) {
                    bitmap.blt(srcBitmap, sx, sy, sw, sh, cx - radius, cy - radius, diameter, diameter);
                }
                ctx.restore();

                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, gaugeRadius, 0, Math.PI * 2);
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
                ctx.stroke();
                ctx.restore();

                if (ctRate > 0) {
                    const startAngle = -Math.PI / 2;
                    const endAngle = startAngle + Math.PI * 2 * ctRate;
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(cx, cy, gaugeRadius, startAngle, endAngle);
                    ctx.lineWidth = 3.5;
                    ctx.strokeStyle = isComboReady ? '#ffff44' : (ctRate >= 1.0 ? '#ffff00' : (isActor ? '#44eeff' : '#ff6644'));
                    ctx.stroke();
                    ctx.restore();
                }

                if (isComboReady) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                    ctx.lineWidth = 3.5;
                    ctx.strokeStyle = '#ffffff';
                    ctx.stroke();
                    ctx.restore();
                } else if (isCurrentOrNext) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                    ctx.lineWidth = 2.5;
                    ctx.strokeStyle = '#ffff00';
                    ctx.stroke();
                    ctx.restore();
                }

                bitmap._setDirty();

                if (isComboReady) {
                    bitmap.fontSize = 13;
                    bitmap.textColor = '#ffff66';
                    bitmap.outlineColor = 'rgba(0, 0, 0, 0.95)';
                    bitmap.outlineWidth = 4;
                    bitmap.drawText("COMBO!", 0, cy - 10, cx - gaugeRadius - 4, 20, 'right');
                } else if (isCurrentOrNext) {
                    bitmap.fontSize = 13;
                    bitmap.textColor = '#ffff00';
                    bitmap.outlineColor = 'rgba(0, 0, 0, 0.9)';
                    bitmap.outlineWidth = 4;
                    const label = (unit === ArcManager._activeUnit) ? "ACT▶" : "NEXT▶";
                    bitmap.drawText(label, 0, cy - 10, cx - gaugeRadius - 3, 20, 'right');
                }
            };

            if (isActor) {
                const faceBitmap = ImageManager.loadFace(battler.faceName());
                const pw = Window_Base._faceWidth;
                const ph = Window_Base._faceHeight;
                const faceIndex = battler.faceIndex();
                const sx = (faceIndex % 4) * pw;
                const sy = Math.floor(faceIndex / 4) * ph;
                if (faceBitmap.isReady()) {
                    drawCircleIcon(faceBitmap, sx, sy, pw, ph);
                } else {
                    drawCircleIcon(null, 0, 0, 0, 0);
                    faceBitmap.addLoadListener(() => ArcManager.requestRedraw());
                }
            } else {
                const enemyBitmap = ImageManager.loadEnemy(battler.battlerName(), battler.battlerHue());
                if (enemyBitmap.isReady()) {
                    drawCircleIcon(enemyBitmap, 0, 0, enemyBitmap.width, enemyBitmap.height);
                } else {
                    drawCircleIcon(null, 0, 0, 0, 0);
                    enemyBitmap.addLoadListener(() => ArcManager.requestRedraw());
                }
            }
        }
    };

    Scene_Map.prototype.drawTentGraphic = function(bitmap, x, y, tw, th, count, isActor) {
        const ctx = bitmap._context;
        ctx.save();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(x + tw / 2, y + th - 6, tw * 0.38, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isActor ? '#2288ee' : '#dd3333';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + tw / 2, y + 6);
        ctx.lineTo(x + tw - 6, y + th - 6);
        ctx.lineTo(x + 6, y + th - 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#222222';
        ctx.beginPath();
        ctx.moveTo(x + tw / 2, y + th * 0.45);
        ctx.lineTo(x + tw * 0.65, y + th - 6);
        ctx.lineTo(x + tw * 0.35, y + th - 6);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
        bitmap._setDirty();

        bitmap.fontSize = 16;
        bitmap.textColor = '#ffff00';
        bitmap.outlineColor = 'rgba(0, 0, 0, 0.9)';
        bitmap.outlineWidth = 4;
        bitmap.drawText("×" + count, x, y + 2, tw - 4, 20, 'right');
    };

    // 敵同士の通常攻撃範囲の重なり数を集計（1〜4までカウント）
    function countEnemyAttackOverlaps() {
        const counts = {};
        ArcManager._units.forEach(u => {
            if (u._arcBattler && u._arcBattler.isAlive() && !u._arcIsActor) {
                const tiles = ArcManager.getUnitNormalAttackTiles(u);
                tiles.forEach(t => {
                    const key = t.x + "," + t.y;
                    const curr = counts[key] || 0;
                    counts[key] = Math.min(4, curr + 1);
                });
            }
        });
        return counts;
    }

    // 【改修】味方同士のコンボ技範囲の重なり数を集計（他キャラ攻撃中は各味方の「技設定」で選ばれた技の範囲を反映）
    function countAllyComboAttackOverlaps() {
        const counts = {};
        ArcManager._units.forEach(u => {
            if (u._arcBattler && u._arcBattler.isAlive() && u._arcIsActor) {
                const tiles = ArcManager.getUnitComboAttackTiles(u);
                tiles.forEach(t => {
                    const key = t.x + "," + t.y;
                    const curr = counts[key] || 0;
                    counts[key] = Math.min(4, curr + 1);
                });
            }
        });
        return counts;
    }

    Scene_Map.prototype.updateArcGrid = function() {
        const gridSprite = this._spriteset._arcGridSprite;
        const tentSprite = this._spriteset._arcTentSprite;
        const uiSprite = this._spriteset._arcUiSprite;
        const timelineSprite = this._spriteset._arcTimelineSprite;
        if (!gridSprite || !tentSprite || !uiSprite || !timelineSprite) return;

        const scrolled = (this._spriteset._lastDisplayX !== $gameMap.displayX() ||
                          this._spriteset._lastDisplayY !== $gameMap.displayY());

        if (!ArcManager._needsRedraw && !scrolled) return;

        ArcManager._needsRedraw = false;
        this._spriteset._lastDisplayX = $gameMap.displayX();
        this._spriteset._lastDisplayY = $gameMap.displayY();

        const bitmap = gridSprite.bitmap;
        const tentBitmap = tentSprite.bitmap;
        const uiBitmap = uiSprite.bitmap;
        const tlBitmap = timelineSprite.bitmap;
        bitmap.clear();
        tentBitmap.clear();
        uiBitmap.clear();
        tlBitmap.clear();

        const tw = $gameMap.tileWidth();
        const th = $gameMap.tileHeight();

        if (!ArcManager._active) {
            const sensorTiles = {};
            const isCooldown = ArcManager._cooldownTimer > 0;

            $gameMap.events().forEach(event => {
                if (!event._erased && event.event() && event.event().note) {
                    if (/<ArcEnemy:\d+>/i.test(event.event().note)) {
                        const sensorMatch = event.event().note.match(/<ArcSensor:(\d+)>/i);
                        const range = sensorMatch ? Number(sensorMatch[1]) : 5;

                        const reachable = ArcManager.getReachableTilesBfs(event.x, event.y, range, false, false);
                        reachable.forEach(t => {
                            const key = t.x + "," + t.y;
                            const isEdge = (t.steps === range);
                            if (!sensorTiles[key] || isEdge) {
                                sensorTiles[key] = { x: t.x, y: t.y, isEdge: isEdge };
                            }
                        });
                    }
                }
            });

            const fillColor = isCooldown ? 'rgba(180, 180, 180, 0.18)' : 'rgba(255, 40, 40, 0.22)';
            const edgeColor = isCooldown ? 'rgba(200, 200, 200, 0.30)' : 'rgba(255, 60, 60, 0.38)';

            Object.keys(sensorTiles).forEach(key => {
                const t = sensorTiles[key];
                const sx = $gameMap.adjustX(t.x) * tw;
                const sy = $gameMap.adjustY(t.y) * th;
                if (sx + tw >= 0 && sx < Graphics.width && sy + th >= 0 && sy < Graphics.height) {
                    bitmap.fillRect(sx + 2, sy + 2, tw - 4, th - 4, t.isEdge ? edgeColor : fillColor);
                }
            });
            return;
        }

        this.drawArcTimeline(tlBitmap);

        const enemyAtkCounts = countEnemyAttackOverlaps();

        if (ArcManager._phase === 'walkMove') {
            const enemyRedAlphas = [0, 0.16, 0.30, 0.46, 0.64];
            const enemyBorderAlphas = [0, 0.55, 0.70, 0.85, 0.98];

            Object.keys(enemyAtkCounts).forEach(key => {
                const parts = key.split(",");
                const tx = Number(parts[0]);
                const ty = Number(parts[1]);
                const n = Math.min(4, enemyAtkCounts[key]);
                const sx = $gameMap.adjustX(tx) * tw;
                const sy = $gameMap.adjustY(ty) * th;
                if (sx + tw >= 0 && sx < Graphics.width && sy + th >= 0 && sy < Graphics.height) {
                    const fillColor = `rgba(255, 45, 25, ${enemyRedAlphas[n]})`;
                    const borderColor = `rgba(255, 70, 40, ${enemyBorderAlphas[n]})`;
                    bitmap.fillRect(sx + 3, sy + 3, tw - 6, th - 6, fillColor);
                    bitmap.fillRect(sx + 3, sy + 3, tw - 6, 1, borderColor);
                    bitmap.fillRect(sx + 3, sy + th - 4, tw - 6, 1, borderColor);
                    bitmap.fillRect(sx + 3, sy + 3, 1, th - 6, borderColor);
                    bitmap.fillRect(sx + tw - 4, sy + 3, 1, th - 6, borderColor);
                }
            });
        } else if (ArcManager._phase === 'selectTarget' || ArcManager._phase === 'comboChain') {
            const allyAtkCounts = countAllyComboAttackOverlaps();
            const allyBlueAlphas = [0, 0.16, 0.30, 0.46, 0.64];
            const allyBorderAlphas = [0, 0.55, 0.70, 0.85, 0.98];

            Object.keys(allyAtkCounts).forEach(key => {
                const parts = key.split(",");
                const tx = Number(parts[0]);
                const ty = Number(parts[1]);
                const n = Math.min(4, allyAtkCounts[key]);
                const sx = $gameMap.adjustX(tx) * tw;
                const sy = $gameMap.adjustY(ty) * th;
                if (sx + tw >= 0 && sx < Graphics.width && sy + th >= 0 && sy < Graphics.height) {
                    const fillColor = `rgba(30, 130, 255, ${allyBlueAlphas[n]})`;
                    const borderColor = `rgba(60, 175, 255, ${allyBorderAlphas[n]})`;
                    bitmap.fillRect(sx + 3, sy + 3, tw - 6, th - 6, fillColor);
                    bitmap.fillRect(sx + 3, sy + 3, tw - 6, 1, borderColor);
                    bitmap.fillRect(sx + 3, sy + th - 4, tw - 6, 1, borderColor);
                    bitmap.fillRect(sx + 3, sy + 3, 1, th - 6, borderColor);
                    bitmap.fillRect(sx + tw - 4, sy + 3, 1, th - 6, borderColor);
                }
            });
        }

        if (ArcManager._phase === 'enemyWalking' && ArcManager._enemyMoveTiles && ArcManager._enemyMoveTiles.length > 0) {
            ArcManager._enemyMoveTiles.forEach(t => {
                const sx = $gameMap.adjustX(t.x) * tw;
                const sy = $gameMap.adjustY(t.y) * th;
                if (sx + tw >= 0 && sx < Graphics.width && sy + th >= 0 && sy < Graphics.height) {
                    bitmap.fillRect(sx + 2, sy + 2, tw - 4, th - 4, 'rgba(255, 90, 30, 0.42)');
                    bitmap.fillRect(sx + 2, sy + 2, tw - 4, 2, 'rgba(255, 160, 60, 0.85)');
                    bitmap.fillRect(sx + 2, sy + th - 4, tw - 4, 2, 'rgba(255, 160, 60, 0.85)');
                    bitmap.fillRect(sx + 2, sy + 2, 2, th - 4, 'rgba(255, 160, 60, 0.85)');
                    bitmap.fillRect(sx + tw - 4, sy + 2, 2, th - 4, 'rgba(255, 160, 60, 0.85)');
                }
            });
        }

        const rect = ArcManager._areaRect;
        const bx = $gameMap.adjustX(rect.x1) * tw;
        const by = $gameMap.adjustY(rect.y1) * th;
        const bw = (rect.x2 - rect.x1 + 1) * tw;
        const bh = (rect.y2 - rect.y1 + 1) * th;
        const areaBorderColor = 'rgba(255, 255, 255, 0.85)';
        bitmap.fillRect(bx, by, bw, 3, areaBorderColor);
        bitmap.fillRect(bx, by + bh - 3, bw, 3, areaBorderColor);
        bitmap.fillRect(bx, by, 3, bh, areaBorderColor);
        bitmap.fillRect(bx + bw - 3, by, 3, bh, areaBorderColor);

        if (ArcManager._activeUnit && ArcManager._activeUnit._arcIsActor) {
            const px = $gameMap.adjustX(ArcManager._prevX) * tw;
            const py = $gameMap.adjustY(ArcManager._prevY) * th;
            bitmap.fillRect(px + 4, py + 4, tw - 8, th - 8, 'rgba(0, 255, 100, 0.45)');
        }

        if (ArcManager._phase === 'walkMove') {
            ArcManager._validTiles.forEach(t => {
                const sx = $gameMap.adjustX(t.x) * tw;
                const sy = $gameMap.adjustY(t.y) * th;
                const isInside = ArcManager.isInBattleArea(t.x, t.y);
                const isTransfer = ArcManager.isTransferEventAt(t.x, t.y);
                const isEscapeTile = !isInside || isTransfer;
                const overlapsEnemyAtk = Boolean(enemyAtkCounts[t.x + "," + t.y]);

                let tileColor;
                if (isEscapeTile) {
                    tileColor = 'rgba(180, 0, 255, 0.45)';
                } else if (overlapsEnemyAtk) {
                    tileColor = 'rgba(115, 55, 255, 0.55)';
                } else {
                    tileColor = 'rgba(0, 120, 255, 0.38)';
                }
                bitmap.fillRect(sx + 2, sy + 2, tw - 4, th - 4, tileColor);
            });
        }

        $gameMap.events().forEach(ev => {
            if (ev && !ev._erased && ArcManager.isTransferEventAt(ev.x, ev.y)) {
                const alreadyInValid = ArcManager._validTiles.some(t => t.x === ev.x && t.y === ev.y);
                if (!alreadyInValid) {
                    const sx = $gameMap.adjustX(ev.x) * tw;
                    const sy = $gameMap.adjustY(ev.y) * th;
                    bitmap.fillRect(sx + 2, sy + 2, tw - 4, th - 4, 'rgba(180, 0, 255, 0.35)');
                }
            }
        });

        if (ArcManager._phase === 'selectTarget') {
            const comboTileKeys = ArcManager.getComboTriggerTileKeys();
            const pulse = 0.5 + 0.5 * Math.sin((ArcManager._animFrameCounter / 60) * Math.PI * 4);

            ArcManager._validTiles.forEach(t => {
                const sx = $gameMap.adjustX(t.x) * tw;
                const sy = $gameMap.adjustY(t.y) * th;
                const isComboTile = Boolean(comboTileKeys[t.x + "," + t.y]);

                if (isComboTile) {
                    const glowFill = `rgba(255, 225, 40, ${0.42 + 0.28 * pulse})`;
                    const glowBorder = `rgba(255, 255, 190, ${0.8 + 0.2 * pulse})`;
                    bitmap.fillRect(sx + 2, sy + 2, tw - 4, th - 4, glowFill);
                    bitmap.fillRect(sx + 1, sy + 1, tw - 2, 3, glowBorder);
                    bitmap.fillRect(sx + 1, sy + th - 4, tw - 2, 3, glowBorder);
                    bitmap.fillRect(sx + 1, sy + 1, 3, th - 2, glowBorder);
                    bitmap.fillRect(sx + tw - 4, sy + 1, 3, th - 2, glowBorder);
                } else {
                    bitmap.fillRect(sx + 2, sy + 2, tw - 4, th - 4, 'rgba(255, 40, 40, 0.35)');
                }
            });

            ArcManager._aoeTiles.forEach(t => {
                const sx = $gameMap.adjustX(t.x) * tw;
                const sy = $gameMap.adjustY(t.y) * th;
                const isComboTile = Boolean(comboTileKeys[t.x + "," + t.y]);
                const aoeColor = isComboTile ? `rgba(255, 240, 90, ${0.65 + 0.25 * pulse})` : 'rgba(255, 200, 0, 0.65)';
                bitmap.fillRect(sx + 4, sy + 4, tw - 8, th - 8, aoeColor);
            });

            const cx = $gameMap.adjustX(ArcManager._cursorX) * tw;
            const cy = $gameMap.adjustY(ArcManager._cursorY) * th;
            bitmap.fillRect(cx, cy, tw, 4, 'rgba(255, 255, 255, 0.95)');
            bitmap.fillRect(cx, cy + th - 4, tw, 4, 'rgba(255, 255, 255, 0.95)');
            bitmap.fillRect(cx, cy, 4, th, 'rgba(255, 255, 255, 0.95)');
            bitmap.fillRect(cx + tw - 4, cy, 4, th, 'rgba(255, 255, 255, 0.95)');
        }

        const coordMap = {};
        ArcManager._units.forEach(u => {
            if (u._arcBattler && u._arcBattler.isAlive()) {
                const key = u.x + "," + u.y;
                if (!coordMap[key]) coordMap[key] = [];
                coordMap[key].push(u);
            }
        });

        Object.keys(coordMap).forEach(key => {
            const stack = coordMap[key];
            if (stack.length > 1) {
                const tx = $gameMap.adjustX(stack[0].x) * tw;
                const ty = $gameMap.adjustY(stack[0].y) * th;
                const hasActive = stack.includes(ArcManager._activeUnit);
                if (!hasActive) {
                    this.drawTentGraphic(tentBitmap, tx, ty, tw, th, stack.length, stack[0]._arcIsActor);
                } else {
                    tentBitmap.fontSize = 16;
                    tentBitmap.textColor = '#ffff00';
                    tentBitmap.outlineColor = 'rgba(0, 0, 0, 0.9)';
                    tentBitmap.outlineWidth = 4;
                    tentBitmap.drawText("⛺×" + stack.length, tx, ty - 8, tw, 24, 'right');
                }
            }
        });

        uiBitmap.fillRect(10, 10, 128, 38, 'rgba(25, 35, 65, 0.88)');
        uiBitmap.fillRect(10, 10, 128, 2, '#66ccff');
        uiBitmap.fontSize = 20;
        uiBitmap.textColor = '#66eeff';
        uiBitmap.drawText(`TURN ${ArcManager._turnCount}`, 18, 12, 112, 34, 'center');

        const guideX = 146;
        if (ArcManager._comboCount >= 2) {
            uiBitmap.fillRect(guideX, 10, 320, 38, 'rgba(200, 80, 0, 0.88)');
            uiBitmap.fontSize = 20;
            uiBitmap.textColor = '#ffff00';
            uiBitmap.drawText(`★ ${ArcManager._comboCount} COMBO!! (×${(1 + 0.1 * ArcManager._comboCount).toFixed(1)})`, guideX + 10, 12, 300, 34, 'left');
        } else if (ArcManager._activeUnit && ArcManager._activeUnit._arcIsActor) {
            const unit = ArcManager._activeUnit;
            const isOutside = !ArcManager.isInBattleArea(unit.x, unit.y);
            const isOnTransfer = ArcManager.isTransferEventAt(unit.x, unit.y);
            const isEscapePos = isOutside || isOnTransfer;
            const comboReadyCount = ArcManager.getComboHighlightUnitsAtCursor().length;
            let guide = "";
            if (ArcManager._phase === 'walkMove') {
                guide = isEscapePos ? "【逃走可能マス：移動／決定で離脱！】" : "【移動フェイズ】 矢印:歩行 / Z:決定 / X:初期位置";
            } else if (ArcManager._phase === 'command' || ArcManager._phase === 'skillSelect') {
                guide = "【コマンド選択】 行動を選択してください (X:移動やり直し)";
            } else if (ArcManager._phase === 'selectTarget') {
                guide = comboReadyCount > 0
                    ? `【コンボ発動可能！ 連携+${comboReadyCount}人】 Z:発動 / X:戻る`
                    : `【ターゲット選択】 効果範囲:${ArcManager._skillArea}マス / Z:発動 / X:戻る`;
            }
            if (guide) {
                uiBitmap.fillRect(guideX, 10, 490, 38, isEscapePos ? 'rgba(120, 0, 160, 0.82)' : (comboReadyCount > 0 ? 'rgba(150, 95, 0, 0.88)' : 'rgba(0, 0, 0, 0.68)'));
                uiBitmap.fontSize = 17;
                uiBitmap.textColor = comboReadyCount > 0 ? '#ffff77' : '#ffffff';
                uiBitmap.drawText(guide, guideX + 12, 12, 466, 34, 'left');
            }
        }
    };

})();