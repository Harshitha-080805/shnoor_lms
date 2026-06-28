const axios = require('axios');

const WANDBOX_COMPILERS = {
    'python': 'cpython-3.12.7',
    'javascript': 'nodejs-18.20.4',
    'js': 'nodejs-18.20.4',
    'java': 'openjdk-jdk-22+36',
    'cpp': 'clang-15.0.7',
    'c++': 'clang-15.0.7',
    'c': 'clang-15.0.7-c',
    'php': 'php-7.4.33'
};

const executeCode = async (lang, code, stdin = '') => {
    return new Promise(async (resolve) => {
        const normalizedLang = (lang || '').toLowerCase();
        const compiler = WANDBOX_COMPILERS[normalizedLang];

        if (!compiler) {
            return resolve({ stdout: '', stderr: 'Unsupported language' });
        }

        try {
            const payload = { compiler, code, stdin };
            const response = await axios.post('https://wandbox.org/api/compile.json', payload);
            const data = response.data;
            
            const stdout = data.program_output || '';
            const stderr = data.compiler_error || data.program_error || '';

            resolve({ stdout, stderr });
        } catch (err) {
            resolve({ stdout: '', stderr: err.message || 'Execution failed' });
        }
    });
};

const executeAllTestCases = async (lang, code, stdins = []) => {
    const results = [];
    for (const stdin of stdins) {
        const res = await executeCode(lang, code, stdin);
        results.push(res);
    }
    return results;
};

module.exports = {
    executeCode,
    executeAllTestCases
};
