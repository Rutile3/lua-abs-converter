'use strict';

// すべて IIFE 内に閉じてグローバル漏れを防止
(() => {
    const $ = (sel) => document.querySelector(sel);

    // --- Elements ---
    const elInput = $('#input');
    const elOutput = $('#output');

    // Buttons（存在しないIDは無視）
    const btnTransform = $('#btn-transform');
    const btnSample = $('#btn-sample');
    const btnCopy = $('#btn-copy');
    const btnClearInput = $('#btn-clear-input');
    const btnReset = $('#btn-reset');

    // --- Helpers ---
    const getEqMode = () => (document.querySelector('input[name="eq-mode"]:checked')?.value ?? 'abs');
    const getLeMode = () => (document.querySelector('input[name="le-mode"]:checked')?.value ?? 'abs');

    const isNumber = (s) => /^-?\d+(?:\.\d+)?$/.test(String(s).trim());
    const wrap = (s) => {
        const t = String(s).trim();
        const ident = /^[A-Za-z_]\w*$/;
        return (ident.test(t) || isNumber(t)) ? t : `(${t})`;
    };

    // 数値なら二乗した実数を返す。数値以外は (expr)^2 を生成
    function squaredValue(exprRaw) {
        const t = exprRaw.trim();
        if (isNumber(t)) {
            const n = parseFloat(t);
            const v = n * n;
            return Number.isInteger(v) ? String(v) : String(+v.toFixed(12)).replace(/\.?0+$/, '');
        }
        return `${wrap(t)}^2`;
    }

    // --- Core transform ---
    function transform(text, { eqMode, leMode }) {
        let out = text;

        // パターン部品（非捕獲）
        const IDENT_MAIN = '[A-Za-z_]\\w*';                     // v 用
        const NUMBER = '(?:-?\\d+(?:\\.\\d+)?)';            // 数値
        const IDENT_RHS = '(?:[A-Za-z_]\\w*)';                 // 識別子
        const PAREN_EXPR = '(?:\\([^()\\n]*\\))';               // 改行なしの簡単な括弧式（入れ子は対象外）

        // 右辺は「数値 or 識別子 or 括弧式」を一つだけ許容（←ここを 1 キャプチャにまとめる）
        const RHS = `(${NUMBER}|${IDENT_RHS}|${PAREN_EXPR})`;

        // 語境界つき abs
        const reEq = new RegExp(`\\babs\\(\\s*(${IDENT_MAIN})\\s*\\)\\s*==\\s*${RHS}`, 'g');
        const reLe = new RegExp(`\\babs\\(\\s*(${IDENT_MAIN})\\s*\\)\\s*<=\\s*${RHS}`, 'g');

        // abs(v) == n
        out = out.replace(reEq, (_, v, nRaw) => {
            const n = nRaw.trim();
            if (eqMode === 'abs') return `abs(${v}) == ${n}`;
            if (eqMode === 'square') return `${v}^2 == ${squaredValue(n)}`;       // 右辺は数値なら二乗済みに
            if (eqMode === 'split') return `${v} == -${wrap(n)} or ${v} == ${wrap(n)}`;
            return _;
        });

        // abs(v) <= n
        out = out.replace(reLe, (_, v, nRaw) => {
            const n = nRaw.trim();
            if (leMode === 'abs') return `abs(${v}) <= ${n}`;
            if (leMode === 'square') return `${v}^2 <= ${squaredValue(n)}`;       // 右辺は数値なら二乗済みに
            if (leMode === 'range') return `-${wrap(n)} <= ${v} and ${v} <= ${wrap(n)}`;
            return _;
        });

        return out;
    }

    function runTransform() {
        if (!elInput || !elOutput) return;
        const res = transform(elInput.value, {
            eqMode: getEqMode(),
            leMode: getLeMode(),
        });
        elOutput.value = res;
    }

    // デバウンス（貼り付けや連打での無駄処理を抑制）
    const debounce = (fn, ms = 120) => {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    };
    const runTransformDebounced = debounce(runTransform, 120);

    // --- Events ---

    // 入力が変わったら即反映（デバウンス）
    elInput?.addEventListener('input', runTransformDebounced);

    // ラジオ変更で再変換（デバウンス）
    document.querySelectorAll('input[name="eq-mode"], input[name="le-mode"]').forEach(el => {
        el.addEventListener('change', runTransformDebounced);
    });

    // 変換する
    btnTransform?.addEventListener('click', runTransform);

    // サンプルを入れる（正しい改行）
    btnSample?.addEventListener('click', () => {
        if (!elInput) return;
        elInput.value = [
            'if abs(x) <= 3 then',
            '  if abs(x) == 4 then return true end',
            'end',
            'y = abs(x) == N',
            'z = abs(a) <= (A+B)',
            'w = abs(foo) == 3.5'
        ].join('\n');
        runTransform();
    });

    // 入力クリア（出力は触らない）
    btnClearInput?.addEventListener('click', () => {
        if (!elInput) return;
        elInput.value = '';
        runTransform();
    });

    // コピー
    btnCopy?.addEventListener('click', async () => {
        if (!elOutput) return;
        try {
            await navigator.clipboard.writeText(elOutput.value);
            const prev = btnCopy.textContent;
            btnCopy.textContent = 'コピーしました';
            setTimeout(() => (btnCopy.textContent = prev ?? 'コピー'), 1200);
        } catch {
            alert('クリップボードへのコピーに失敗しました。');
        }
    });

    // リセット：変換設定のみ初期値に戻す（入力・出力は維持）
    btnReset?.addEventListener('click', () => {
        document.querySelector('#eq-abs') && ((document.querySelector('#eq-abs')).checked = true);
        document.querySelector('#le-abs') && ((document.querySelector('#le-abs')).checked = true);
        runTransform(); // 現在の入力に対して既定設定で再計算
    });

    // 便利ショートカット
    // Cmd/Ctrl + Enter => 変換、 Cmd/Ctrl + B => コピー
    document.addEventListener('keydown', (e) => {
        const isMod = e.metaKey || e.ctrlKey;
        if (!isMod) return;
        if (e.key === 'Enter') { e.preventDefault(); btnTransform?.click(); }
        if (e.key.toLowerCase() === 'b') { e.preventDefault(); btnCopy?.click(); }
    });

    // 初期描画
    runTransform();
})();