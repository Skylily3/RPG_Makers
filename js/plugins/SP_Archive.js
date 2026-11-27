/*:
 * @plugindesc STAR PICKER 人物図鑑・アーカイブ（MV）
 * @param メニュー名
 * @default 資料庫
 * @param 未発見表示
 * @type select
 * @option ？？？
 * @option 非表示
 * @default ？？？
 * @help SP_RecordsCore・SP_RecordData の下に配置。
 * SP ARCHIVE note 1 を調査イベントに記入。2で説明を更新します。
 * SP OPEN ARCHIVE で表示。stagesのpictureはimg/picturesの拡張子なし名。
 */
window.StarPickerModules = window.StarPickerModules || {};
window.StarPickerModules.SP_Archive = function() {
    'use strict';
    var S = window.SPRecords, db = window.SPRecordData;
    var state = S.progress('archive',db.archive,function(a) { return a.stages; });
    var p = PluginManager.parameters('SP_Archive'), title = p['メニュー名'] || '資料庫';
    S.command('ARCHIVE',function(args) { state.advance(args[0],Number(args[1])); });
    function list(c) {
        var rows = [];
        db.archive.forEach(function(a) {
            if (a.category !== c) return;
            var level = state.level(a.id);
            if (!level) {
                if (p['未発見表示'] !== '非表示') rows.push(S.item('？？？'));
                return;
            }
            rows.push(S.item(a.name,function() {
                var stage = a.stages[level-1];
                return S.article(a.name,['◆ '+c+'　記録 '+level,stage.text],stage.picture);
            }));
        });
        return S.page(title+' ／ '+c,rows);
    }
    S.register('ARCHIVE',title,function() {
        return S.page(title,db.categories.map(function(c) { return S.item(c,list.bind(null,c)); }));
    });
};
