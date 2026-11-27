/*:
 * @plugindesc STAR PICKER 詳細ステータス（MV）
 * @param メニュー名
 * @default 詳細能力
 * @param 状態ID一覧
 * @desc 空欄で全ての名前付き状態。例 4,5,6
 * @default
 * @help SP_RecordsCore の下に配置。仲間を選び、各項目を決定。
 * Q/W・PageUp/PageDown・見出しの矢印で仲間を切り替えられます。連携技の設定にはStarPickerMenu v4.5が必要です。
 * 耐性画面は有効度（倍率）を表示。100%が標準、50%は半減です。
 */
window.StarPickerModules = window.StarPickerModules || {};
window.StarPickerModules.SP_ActorDetails = function() {
    'use strict';
    var S = window.SPRecords, p = PluginManager.parameters('SP_ActorDetails');
    var title = p['メニュー名'] || '詳細能力';
    var selected = String(p['状態ID一覧'] || '').trim();
    var ids = selected.split(',').map(Number);
    function percent(rate) { return Math.round(rate*1000)/10+'%'; }
    function blocks(a) {
        var sections = [
            ['基本能力',function() {
                var lines = [a.currentClass().name+'　Lv '+a.level,'HP '+a.hp+' / '+a.mhp,'MP '+a.mp+' / '+a.mmp];
                for (var i=0;i<8;i++) lines.push(TextManager.param(i)+'　'+a.param(i));
                return lines;
            }],
            ['装備',function() {
                var equips = a.equips();
                return a.equipSlots().map(function(type,i) {
                    return $dataSystem.equipTypes[type]+'　'+(equips[i] ? equips[i].name : 'なし');
                });
            }],
            ['属性耐性',function() {
                var lines = ['◆ 属性有効度（100%が標準）'];
                $dataSystem.elements.forEach(function(name,i) {
                    if (i && name) lines.push(name+'　'+percent(a.elementRate(i)));
                });
                return lines;
            }],
            ['状態異常耐性',function() {
                var lines = ['◆ 付与有効度（100%が標準）'];
                $dataStates.forEach(function(st) {
                    if (st && st.name && (!selected || ids.indexOf(st.id)>=0))
                        lines.push(st.name+'　'+(a.isStateResist(st.id) ? '無効' : percent(a.stateRate(st.id))));
                });
                return lines;
            }],
            ['習得技',function() {
                var lines = a.skills().filter(function(s) { return a.isLearnedSkill(s.id); })
                    .map(function(s) { return s.name; });
                return lines.length ? lines : ['習得した技はありません。'];
            }]
        ];
        var skill = S.combo(a);
        var rows = sections.map(function(pair) {
            return S.item(pair[0],function() { return S.article(a.name()+' ／ '+pair[0],pair[1]()); });
        });
        var combo = S.item('設定中の技　'+(skill ? skill.name : '未設定'),null,skill && skill.iconIndex);
        if (window.Scene_ArcComboConfig) {
            combo.label += '　変更';
            combo.external = true;
            combo.next = function() {
                SceneManager.push(Scene_ArcComboConfig);
                SceneManager.prepareNextScene(a.actorId());
            };
        }
        rows.push(combo);
        return S.page(a.name()+' ／ '+title,rows);
    }
    if (window.Scene_ArcComboConfig) {
        var proto = Scene_ArcComboConfig.prototype, prepare = proto.prepare, start = proto.start;
        proto.prepare = function(actorId) {
            if (prepare) prepare.apply(this,arguments);
            this._spInitialActorId = actorId;
        };
        proto.start = function() {
            start.call(this);
            if (!this._spInitialActorId) return;
            var i = $gameParty.members().indexOf($gameActors.actor(this._spInitialActorId));
            if (i>=0) { this._statusWindow.select(i); this.updateActorSelection(); }
        };
    }
    S.register('STATUS',title,function() {
        return S.page(title+' ／ 仲間を選択',$gameParty.members().map(function(a) {
            return S.item(a.name(),blocks.bind(null,a));
        }));
    });
};
