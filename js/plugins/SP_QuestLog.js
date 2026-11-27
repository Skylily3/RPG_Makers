/*:
 * @plugindesc STAR PICKER クエストログ（MV）
 * @param メニュー名
 * @default クエスト
 * @help SP_RecordsCore・SP_RecordData の下に配置。
 * SP QUEST vent 1 で開始、2で第2段階、COMPLETEで完了。
 * SP OPEN QUEST で表示。メイン・サブ → 依頼名 → 目的と履歴。
 */
window.StarPickerModules = window.StarPickerModules || {};
window.StarPickerModules.SP_QuestLog = function() {
    'use strict';
    var S = window.SPRecords, data = window.SPRecordData.quests;
    function stages(q) { return q.steps.concat([q.finish]); }
    var state = S.progress('quests', data, stages, function(q,step) {
        if (step === q.steps.length+1) S.store('questFinished')[q.id] = true;
    });
    function level(q) {
        return S.store('questFinished')[q.id] ? q.steps.length+1 : state.level(q.id);
    }
    var title = PluginManager.parameters('SP_QuestLog')['メニュー名'] || 'クエスト';
    S.command('QUEST', function(args) {
        var q = data.filter(function(v) { return v.id === args[0]; })[0];
        state.advance(args[0], q && String(args[1]).toUpperCase() === 'COMPLETE' ?
            q.steps.length+1 : Number(args[1]));
    });
    function label(q,n) { return n === 0 ? '未開始' : n > q.steps.length ? '完了' : '進行中'; }
    function detail(q) {
        var n = level(q);
        var lines = ['◆ 現在の目的', n === 0 ? 'まだ受注していません。' :
            n > q.steps.length ? 'すべての目的を達成しました。' : q.steps[n-1].objective,
            '', '◆ これまでの出来事'];
        stages(q).slice(0,n).forEach(function(s) { if (s.event) lines.push('・' + s.event); });
        if (!n) lines.push('記録はありません。');
        return S.article(q.name + '　' + label(q,n), lines);
    }
    function list(category) {
        return S.page(title+' ／ '+category, data.filter(function(q) {
            return q.category === category;
        }).map(function(q) {
            return S.item('［'+label(q,level(q))+'］ '+q.name,detail.bind(null,q));
        }));
    }
    S.register('QUEST',title,function() {
        return S.page(title,['メイン','サブ'].map(function(c) { return S.item(c,list.bind(null,c)); }));
    });
};
