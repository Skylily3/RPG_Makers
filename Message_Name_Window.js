//=============================================================================
// MessageNameWindow.js
//=============================================================================

/*:
 * @plugindesc メッセージウィンドウの左上または右上にキャラクター名枠を表示します。
 * @author Custom
 *
 * @param defaultPosition
 * @text デフォルト表示位置
 * @desc 位置指定なし（\n<名前>）の場合の表示位置です。
 * @type select
 * @option 左上
 * @value left
 * @option 右上
 * @value right
 * @default left
 *
 * @param fontSize
 * @text フォントサイズ
 * @desc 名前ウィンドウ内の文字サイズです。
 * @type number
 * @min 12
 * @max 72
 * @default 26
 *
 * @param paddingX
 * @text 左右の余白
 * @desc 名前の左右に追加する余白（ピクセル）です。
 * @type number
 * @min 0
 * @default 16
 *
 * @param offsetX
 * @text X座標の微調整
 * @desc 名前ウィンドウの横位置を調整します（正の値で内側へ移動）。
 * @type number
 * @min -500
 * @max 500
 * @default 0
 *
 * @param offsetY
 * @text Y座標の微調整
 * @desc 名前ウィンドウの縦位置を調整します（負の値で上へ移動）。
 * @type number
 * @min -500
 * @max 500
 * @default 0
 *
 * @param syncBackground
 * @text 背景タイプを同期
 * @desc メッセージウィンドウの背景設定（通常・暗くする・透明）に合わせるか。
 * @type boolean
 * @on 同期する
 * @off 常に通常ウィンドウ
 * @default true
 *
 * @help
 * 「文章の表示」のテキスト内に以下の制御文字を記述すると、
 * メッセージウィンドウの左上または右上に名前枠が表示されます。
 *
 * 【制御文字】
 * \n<名前>   : パラメータで設定したデフォルト位置に表示
 * \nl<名前>  : 左上に表示
 * \nr<名前>  : 右上に表示
 *
 * 【使用例】
 * \nl<ハロルド>こんにちは！
 * \nr<\C[2]魔王\C[0]>よく来たな、勇者よ。
 * \n<\N[1]>アクター1番の名前も使えます。
 *
 * 【仕様】
 * - 名前の中で色変更(\C[n])、アクター名(\N[n])、変数(\V[n])などの
 *   制御文字を使用できます。
 * - メッセージウィンドウの表示位置が「上」のときは、画面外にはみ出さないよう
 *   自動的にメッセージウィンドウの下側へ表示されます。
 */

(function() {
    'use strict';

    var pluginName = 'MessageNameWindow';
    var parameters = PluginManager.parameters(pluginName);

    var paramDefaultPos = String(parameters['defaultPosition'] || 'left');
    var paramFontSize = Number(parameters['fontSize'] || 26);
    var paramPaddingX = Number(parameters['paddingX'] || 16);
    var paramOffsetX = Number(parameters['offsetX'] || 0);
    var paramOffsetY = Number(parameters['offsetY'] || 0);
    var paramSyncBg = String(parameters['syncBackground'] || 'true') === 'true';

    //=========================================================================
    // Window_MessageName
    //=========================================================================
    function Window_MessageName() {
        this.initialize.apply(this, arguments);
    }

    Window_MessageName.prototype = Object.create(Window_Base.prototype);
    Window_MessageName.prototype.constructor = Window_MessageName;

    Window_MessageName.prototype.initialize = function(messageWindow) {
        this._messageWindow = messageWindow;
        this._text = '';
        this._position = paramDefaultPos;
        Window_Base.prototype.initialize.call(this, 0, 0, 240, this.windowHeight());
        this.openness = 0;
        this.deactivate();
    };

    Window_MessageName.prototype.windowHeight = function() {
        return this.fittingHeight(1);
    };

    Window_MessageName.prototype.standardFontSize = function() {
        return paramFontSize;
    };

    Window_MessageName.prototype.setName = function(text, position) {
        this._text = text || '';
        this._position = position || paramDefaultPos;
    };

    Window_MessageName.prototype.clearName = function() {
        this._text = '';
    };

    Window_MessageName.prototype.hasName = function() {
        return this._text.length > 0;
    };

    Window_MessageName.prototype.start = function() {
        if (!this.hasName()) {
            this.close();
            return;
        }
        this.refresh();
        this.updatePlacement();
        this.updateBackground();
        this.open();
    };

    Window_MessageName.prototype.refresh = function() {
        var textWidth = this.textWidthEx(this._text);
        var width = textWidth + this.standardPadding() * 2 + paramPaddingX * 2;
        this.width = Math.min(width, Graphics.boxWidth);
        this.height = this.windowHeight();
        this.createContents();
        this.contents.clear();
        this.drawTextEx(this._text, paramPaddingX, 0);
    };

    Window_MessageName.prototype.textWidthEx = function(text) {
        return this.drawTextEx(text, 0, this.contents.height);
    };

    Window_MessageName.prototype.updatePlacement = function() {
        var mw = this._messageWindow;
        if (this._position === 'right') {
            this.x = mw.x + mw.width - this.width - paramOffsetX;
        } else {
            this.x = mw.x + paramOffsetX;
        }

        // メッセージウィンドウが上端にある場合は下側へ自動退避
        if (mw.y < this.height) {
            this.y = mw.y + mw.height - paramOffsetY;
        } else {
            this.y = mw.y - this.height + paramOffsetY;
        }
    };

    Window_MessageName.prototype.updateBackground = function() {
        if (paramSyncBg) {
            this.setBackgroundType($gameMessage.background());
        } else {
            this.setBackgroundType(0);
        }
    };

    //=========================================================================
    // Window_Message の拡張
    //=========================================================================
    var _Window_Message_createSubWindows = Window_Message.prototype.createSubWindows;
    Window_Message.prototype.createSubWindows = function() {
        _Window_Message_createSubWindows.call(this);
        this._nameWindow = new Window_MessageName(this);
    };

    var _Window_Message_subWindows = Window_Message.prototype.subWindows;
    Window_Message.prototype.subWindows = function() {
        var windows = _Window_Message_subWindows.call(this);
        windows.push(this._nameWindow);
        return windows;
    };

    var _Window_Message_startMessage = Window_Message.prototype.startMessage;
    Window_Message.prototype.startMessage = function() {
        this._nameWindow.clearName();
        _Window_Message_startMessage.call(this);
        this._nameWindow.start();
    };

    var _Window_Message_terminateMessage = Window_Message.prototype.terminateMessage;
    Window_Message.prototype.terminateMessage = function() {
        _Window_Message_terminateMessage.call(this);
        this._nameWindow.close();
    };

    var _Window_Message_convertEscapeCharacters = Window_Message.prototype.convertEscapeCharacters;
    Window_Message.prototype.convertEscapeCharacters = function(text) {
        text = _Window_Message_convertEscapeCharacters.call(this, text);
        text = text.replace(/\x1bN([LR]?)<(.*?)>/gi, function(_, dir, name) {
            var pos = paramDefaultPos;
            if (dir) {
                pos = dir.toUpperCase() === 'R' ? 'right' : 'left';
            }
            this._nameWindow.setName(name, pos);
            return '';
        }.bind(this));
        return text;
    };

})();