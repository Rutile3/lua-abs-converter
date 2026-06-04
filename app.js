'use strict';

(() => {
    const sourceCode = document.getElementById('source-code');
    const convertedCode = document.getElementById('converted-code');

    const loadSampleButton = document.getElementById('load-sample-button');
    const clearSourceButton = document.getElementById('clear-source-button');
    const copyConvertedButton = document.getElementById('copy-converted-button');

    const updateConvertedCode = () => {
        convertedCode.value = sourceCode.value;
    };

    sourceCode.addEventListener('input', updateConvertedCode);

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
})();
