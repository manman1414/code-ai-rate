export const ANALYZER_VERSION = '1.3.0-heuristic';
export const EXTENSION_ID = 'codeAiRate';
export const BATCH_SIZE = 50;
export const LARGE_WORKSPACE_FILE_COUNT = 5000;
export const AUTO_SCAN_DELAY_MS = 3000;

export const DEFAULT_DISCLAIMER =
  '本报告基于启发式统计，仅供参考，不构成任何判定依据。';

export const GENERIC_NAMES = [
  'data', 'result', 'item', 'temp', 'value', 'response', 'output', 'input',
  'payload', 'params', 'args', 'options', 'config', 'ctx', 'context',
  'err', 'error', 'res', 'req', 'obj', 'val', 'info', 'metadata',
  'handler', 'callback', 'instance', 'manager', 'service', 'helper', 'utils',
  'entity', 'model', 'record', 'entry', 'element', 'component', 'resource',
];

/** 语言关键字，不计入泛化命名统计 */
export const IDENTIFIER_STOP_WORDS = new Set([
  'import', 'export', 'from', 'const', 'let', 'var', 'function', 'async', 'await',
  'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
  'class', 'interface', 'type', 'extends', 'implements', 'new', 'this', 'super',
  'true', 'false', 'null', 'undefined', 'void', 'public', 'private', 'protected',
  'static', 'readonly', 'def', 'self', 'None', 'True', 'False', 'pass', 'with',
  'try', 'catch', 'finally', 'throw', 'package', 'void', 'int', 'string', 'boolean',
]);
