/*:
 * @plugindesc STAR PICKER 記録データ（監獄編の仮データ）
 * @requiredAssets img/pictures/SP_DemoDuct
 * @param デモ開始スイッチ
 * @type switch
 * @default 0
 * @param デモ進行変数
 * @type variable
 * @default 0
 * @help 下の配列に記録を追加します。0は条件を使用しません。IDは変更せず、
 * 公開済みの段階は末尾に追加してください。詳細は導入手引きを参照。
 */
window.StarPickerModules = window.StarPickerModules || {};
window.StarPickerModules.SP_RecordData = function() {
    'use strict';
    var p = PluginManager.parameters('SP_RecordData');
    var start = Number(p['デモ開始スイッチ']) || 0;
    var progress = Number(p['デモ進行変数']) || 0;
    window.SPRecordData = {
        categories:['人物','勢力','世界記録','調査資料'],
        quests:[
            {id:'vent', category:'メイン', name:'排熱弁の向こうへ',
             steps:[
                 {objective:'外郭の排熱洞で先遣隊と合流する。', event:'監獄外郭に到着した。', when:{switchId:start}},
                 {objective:'排熱弁を起動し、帰還用ダクトを開通させる。', event:'先遣隊から保守通路の位置を聞いた。', when:{variableId:progress,min:2}}
             ], finish:{event:'ダクトを通って拠点へ帰還した。', when:{variableId:progress,min:3}}},
            {id:'ledger', category:'サブ', name:'補給箱の記録',
             steps:[{objective:'補給箱のそばで古い台帳を探す。',event:'先遣隊から台帳の回収を頼まれた。'}],
             finish:{event:'回収した台帳を届けた。'}}
        ],
        archive:[
            {id:'scout', category:'人物', name:'先遣隊の斥候', stages:[
                {text:'外郭の岩陰で一行を待っていた斥候。',when:{switchId:start}},
                {text:'先遣隊の斥候。排熱管の温度差から、現在も稼働する通路を見分けている。'}]},
            {id:'star', category:'勢力', name:'星拾い', stages:[
                {text:'監獄へ先遣隊を派遣し、排熱洞に補給線を築いた組織。',when:{switchId:start}}]},
            {id:'duct', category:'世界記録', name:'旧式の保守ダクト', stages:[
                {text:'監獄内の中継地点と外郭を結ぶ旧時代の通路。',when:{variableId:progress,min:3}}]},
            {id:'note', category:'調査資料', name:'霜の付いた整備票', stages:[
                {text:'補給箱の陰から見つけた紙片。弁番号の横に「帰路」と書かれている。'},
                {text:'整備票の裏には外郭に戻る分岐の略図がある。二本線は閉鎖区画を表す。',picture:'SP_DemoDuct'}]}
        ]
    };
};
