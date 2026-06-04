'use strict';

(() => {
    const sourceCode = document.getElementById('source-code');
    const convertedCode = document.getElementById('converted-code');

    const loadSampleButton = document.getElementById('load-sample-button');
    const clearSourceButton = document.getElementById('clear-source-button');
    const copyConvertedButton = document.getElementById('copy-converted-button');

    const getSelectedEqRule = () => document.querySelector('input[name="eq-rule"]:checked')?.value ?? 'abs';
    const getSelectedLeRule = () => document.querySelector('input[name="le-rule"]:checked')?.value ?? 'abs';

    const copyButtonText = copyConvertedButton.textContent;
    let copyMessageTimeoutId = null;

    const isNumber = (value) => /^-?\d+(?:\.\d+)?$/.test(String(value).trim());

    const wrapExpression = (value) => {
        const expression = String(value).trim();
        const isIdentifier = /^[A-Za-z_]\w*$/.test(expression);
        const isParenthesized = /^\([^()\n]*\)$/.test(expression);

        return isIdentifier || isNumber(expression) || isParenthesized ? expression : `(${expression})`;
    };

    const squareValue = (value) => {
        const expression = value.trim();

        if (!isNumber(expression)) {
            return `${wrapExpression(expression)}^2`;
        }

        const squared = Number.parseFloat(expression) ** 2;
        return Number.isInteger(squared)
            ? String(squared)
            : String(+squared.toFixed(12)).replace(/\.?0+$/, '');
    };

    const convertCode = (code, eqRule, leRule) => {
        let converted = code;

        const identifier = '[A-Za-z_]\\w*';
        const number = '-?\\d+(?:\\.\\d+)?';
        const parenthesizedExpression = '\\([^()\\n]*\\)';
        const rightHandSide = `(${number}|${identifier}|${parenthesizedExpression})`;

        const eqPattern = new RegExp(`\\babs\\(\\s*(${identifier})\\s*\\)\\s*==\\s*${rightHandSide}`, 'g');
        const lePattern = new RegExp(`\\babs\\(\\s*(${identifier})\\s*\\)\\s*<=\\s*${rightHandSide}`, 'g');

        converted = converted.replace(eqPattern, (matched, variable, rawValue) => {
            const value = rawValue.trim();

            switch (eqRule) {
                case 'abs':
                    return `abs(${variable}) == ${value}`;
                case 'square':
                    return `${variable}^2 == ${squareValue(value)}`;
                case 'split':
                    return `(${variable} == -${wrapExpression(value)} or ${variable} == ${wrapExpression(value)})`;
                default:
                    return matched;
            }
        });

        converted = converted.replace(lePattern, (matched, variable, rawValue) => {
            const value = rawValue.trim();

            switch (leRule) {
                case 'abs':
                    return `abs(${variable}) <= ${value}`;
                case 'square':
                    return `${variable}^2 <= ${squareValue(value)}`;
                case 'range':
                    return `(-${wrapExpression(value)} <= ${variable} and ${variable} <= ${wrapExpression(value)})`;
                default:
                    return matched;
            }
        });

        return converted;
    };

    const updateConvertedCode = () => {
        const eqRule = getSelectedEqRule();
        const leRule = getSelectedLeRule();

        convertedCode.value = convertCode(sourceCode.value, eqRule, leRule);
    };

    sourceCode.addEventListener('input', updateConvertedCode);

    document.querySelectorAll('input[name="eq-rule"], input[name="le-rule"]').forEach((rule) => {
        rule.addEventListener('change', updateConvertedCode);
    });

    loadSampleButton.addEventListener('click', () => {
        sourceCode.value = [
            'if abs(x) <= 3 and y == 1 then',
            '  if abs(x) == 4 and z == 1 then return true end',
            'end',
            'y = abs(x) == N',
            'z = abs(a) <= (A+B)',
            'w = abs(foo) == 3.5',
        ].join('\n');
        updateConvertedCode();
    });

    clearSourceButton.addEventListener('click', () => {
        sourceCode.value = '';
        updateConvertedCode();
    });

    copyConvertedButton.addEventListener('click', async () => {
        if (!convertedCode.value) {
            return;
        }

        try {
            await navigator.clipboard.writeText(convertedCode.value);

            copyConvertedButton.textContent = 'コピーしました';
            clearTimeout(copyMessageTimeoutId);
            copyMessageTimeoutId = setTimeout(() => {
                copyConvertedButton.textContent = copyButtonText;
            }, 1500);
        } catch {
            alert('クリップボードへのコピーに失敗しました。');
        }
    });
})();
