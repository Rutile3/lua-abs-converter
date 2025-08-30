// app.js
(function () {
    const $ = (sel) => document.querySelector(sel);

    // --- Elements ---
    const elInput = $('#input');
    const elOutput = $('#output');

    // Buttons
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

    // 数値なら二乗して返す。数値以外は (expr)^2 にする
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

        // 任意の変数名に対応：abs(v)
        const varToken = '([A-Za-z_]\\w*)';
        const rhsToken = '([A-Za-z_]\\w*|-?\\d+(?:\\.\\d+)?|\\([^()]*\\)|[A-Za-z0-9_+\\-*/\\s.]+)';

        // abs(v) == n
        const reEq = new RegExp(`abs\\(\\s*${varToken}\\s*\\)\\s*==\\s*${rhsToken}`, 'g');
        out = out.replace(reEq, (_, v, nRaw) => {
            const n = nRaw.trim();
            if (eqMode === 'abs') return `abs(${v}) == ${n}`;
            if (eqMode === 'square') return `${v}^2 == ${squaredValue(n)}`;
            if (eqMode === 'split') return `${v} == -${wrap(n)} or ${v} == ${wrap(n)}`;
            return _;
        });

        // abs(v) <= n
        const reLe = new RegExp(`abs\\(\\s*${varToken}\\s*\\)\\s*<=\\s*${rhsToken}`, 'g');
        out = out.replace(reLe, (_, v, nRaw) => {
            const n = nRaw.trim();
            if (leMode === 'abs') return `abs(${v}) <= ${n}`;
            if (leMode === 'square') return `${v}^2 <= ${squaredValue(n)}`;
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

    // --- Events ---
    elInput?.addEventListener('input', runTransform);

    document.querySelectorAll('input[name="eq-mode"], input[name="le-mode"]').forEach(el => {
        el.addEventListener('change', runTransform);
    });

    btnTransform?.addEventListener('click', runTransform);

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

    btnClearInput?.addEventListener('click', () => {
        if (!elInput) return;
        elInput.value = '';
        runTransform();
    });

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

    // リセット：変換設定のみ初期値に戻す
    btnReset?.addEventListener('click', () => {
        const eqAbs = document.querySelector('#eq-abs');
        const leAbs = document.querySelector('#le-abs');
        if (eqAbs) eqAbs.checked = true;
        if (leAbs) leAbs.checked = true;
        runTransform();
    });

    // 便利ショートカット
    document.addEventListener('keydown', (e) => {
        const isMod = e.metaKey || e.ctrlKey;
        if (!isMod) return;
        if (e.key === 'Enter') { e.preventDefault(); btnTransform?.click(); }
        if (e.key.toLowerCase() === 'b') { e.preventDefault(); btnCopy?.click(); }
    });

    // 初期描画
    runTransform();
})();
