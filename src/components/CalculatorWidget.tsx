import React, { useCallback, useEffect, useState } from 'react';
import { Calculator, Check, Copy, Delete, History, X } from 'lucide-react';

interface CalcHistoryEntry {
  expression: string;
  result: string;
}

type Token =
  | { type: 'num'; value: number }
  | { type: 'op'; value: '+' | '-' | '*' | '/' | '%' }
  | { type: 'paren'; value: '(' | ')' };

function tokenizeExpression(expr: string): Token[] | null {
  const normalized = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/\s+/g, '');

  if (!normalized) return null;

  const tokens: Token[] = [];
  let i = 0;

  while (i < normalized.length) {
    const ch = normalized[i];

    // Unary + or - at start, after '(', or after another operator
    const prev = tokens[tokens.length - 1];
    const isUnarySign =
      (ch === '-' || ch === '+') &&
      (!prev || prev.type === 'op' || (prev.type === 'paren' && prev.value === '('));

    if ((ch >= '0' && ch <= '9') || ch === '.' || isUnarySign) {
      let numStr = ch;
      i += 1;
      let dotCount = ch === '.' ? 1 : 0;
      while (i < normalized.length) {
        const next = normalized[i];
        if (next >= '0' && next <= '9') {
          numStr += next;
          i += 1;
        } else if (next === '.' && dotCount === 0) {
          dotCount += 1;
          numStr += next;
          i += 1;
        } else {
          break;
        }
      }
      if (numStr === '-' || numStr === '+' || numStr === '.') {
        return null;
      }
      const parsed = Number(numStr);
      if (!Number.isFinite(parsed)) return null;
      tokens.push({ type: 'num', value: parsed });
      continue;
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%') {
      tokens.push({ type: 'op', value: ch });
      i += 1;
      continue;
    }

    if (ch === '(' || ch === ')') {
      // Implicit multiplication e.g. 2(3) or )(
      if (
        ch === '(' &&
        prev &&
        (prev.type === 'num' || (prev.type === 'paren' && prev.value === ')'))
      ) {
        tokens.push({ type: 'op', value: '*' });
      }
      tokens.push({ type: 'paren', value: ch });
      i += 1;
      continue;
    }

    return null;
  }

  return tokens;
}

function evaluateSafeMath(expr: string): number | null {
  const tokens = tokenizeExpression(expr);
  if (!tokens || tokens.length === 0) return null;

  const output: Token[] = [];
  const ops: Token[] = [];
  const precedence: Record<string, number> = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
    '%': 2,
  };

  for (const token of tokens) {
    if (token.type === 'num') {
      output.push(token);
    } else if (token.type === 'op') {
      while (ops.length > 0) {
        const top = ops[ops.length - 1];
        if (top.type === 'op' && precedence[top.value] >= precedence[token.value]) {
          output.push(ops.pop()!);
        } else {
          break;
        }
      }
      ops.push(token);
    } else if (token.value === '(') {
      ops.push(token);
    } else {
      let matched = false;
      while (ops.length > 0) {
        const top = ops.pop()!;
        if (top.type === 'paren' && top.value === '(') {
          matched = true;
          break;
        }
        output.push(top);
      }
      if (!matched) return null;
    }
  }

  while (ops.length > 0) {
    const top = ops.pop()!;
    if (top.type === 'paren') return null;
    output.push(top);
  }

  const stack: number[] = [];
  for (const token of output) {
    if (token.type === 'num') {
      stack.push(token.value);
    } else if (token.type === 'op') {
      if (stack.length < 2) return null;
      const b = stack.pop()!;
      const a = stack.pop()!;
      let res = 0;
      if (token.value === '+') res = a + b;
      else if (token.value === '-') res = a - b;
      else if (token.value === '*') res = a * b;
      else if (token.value === '/') {
        if (b === 0) return null;
        res = a / b;
      } else if (token.value === '%') {
        if (b === 0) return null;
        res = a % b;
      }
      if (!Number.isFinite(res)) return null;
      stack.push(res);
    }
  }

  if (stack.length !== 1) return null;
  // Clean floating point artifacts like 0.1 + 0.2
  return Math.round(stack[0] * 1e10) / 1e10;
}

function formatCalcNumber(num: number): string {
  if (Math.abs(num) >= 1e12 || (Math.abs(num) > 0 && Math.abs(num) < 1e-8)) {
    return num.toExponential(6);
  }
  return String(num);
}

export function CalculatorButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [expression, setExpression] = useState('');
  const [displayValue, setDisplayValue] = useState('0');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [justEvaluated, setJustEvaluated] = useState(false);
  const [history, setHistory] = useState<CalcHistoryEntry[]>([]);
  const [copied, setCopied] = useState(false);

  const handleClear = useCallback(() => {
    setExpression('');
    setDisplayValue('0');
    setErrorMsg(null);
    setJustEvaluated(false);
  }, []);

  const handleBackspace = useCallback(() => {
    setErrorMsg(null);
    if (justEvaluated) {
      setExpression('');
      setDisplayValue('0');
      setJustEvaluated(false);
      return;
    }
    setExpression((prev) => {
      const next = prev.slice(0, -1);
      setDisplayValue(next || '0');
      return next;
    });
  }, [justEvaluated]);

  const appendChar = useCallback(
    (char: string) => {
      setErrorMsg(null);
      const isOperator = ['+', '-', '×', '÷', '%'].includes(char);

      if (justEvaluated) {
        if (isOperator) {
          const next = `${displayValue}${char}`;
          setExpression(next);
          setDisplayValue(next);
          setJustEvaluated(false);
          return;
        }
        const start = char === '.' ? '0.' : char;
        setExpression(start);
        setDisplayValue(start);
        setJustEvaluated(false);
        return;
      }

      setExpression((prev) => {
        // Prevent consecutive binary operators (except '-' after '(')
        const last = prev.slice(-1);
        if (isOperator && ['+', '-', '×', '÷', '%'].includes(last)) {
          const next = `${prev.slice(0, -1)}${char}`;
          setDisplayValue(next);
          return next;
        }
        if (isOperator && prev === '' && char !== '-') {
          const next = `0${char}`;
          setDisplayValue(next);
          return next;
        }
        if (char === '.') {
          // Ensure current number segment does not already have a dot
          const segments = prev.split(/[+\-×÷%()]/);
          const currentSegment = segments[segments.length - 1] || '';
          if (currentSegment.includes('.')) {
            return prev;
          }
          const addition = currentSegment === '' ? '0.' : '.';
          const next = `${prev}${addition}`;
          setDisplayValue(next);
          return next;
        }
        const next = `${prev}${char}`;
        setDisplayValue(next);
        return next;
      });
    },
    [displayValue, justEvaluated]
  );

  const handleToggleParen = useCallback(() => {
    setErrorMsg(null);
    setExpression((prev) => {
      const base = justEvaluated ? '' : prev;
      const openCount = (base.match(/\(/g) || []).length;
      const closeCount = (base.match(/\)/g) || []).length;
      const last = base.slice(-1);
      const shouldClose =
        openCount > closeCount &&
        last !== '' &&
        !['+', '-', '×', '÷', '%', '('].includes(last);
      const next = `${base}${shouldClose ? ')' : '('}`;
      setJustEvaluated(false);
      setDisplayValue(next);
      return next;
    });
  }, [justEvaluated]);

  const handleToggleSign = useCallback(() => {
    setErrorMsg(null);
    const current = justEvaluated ? displayValue : expression || displayValue;
    if (!current || current === '0') return;

    const evaluated = evaluateSafeMath(current);
    if (evaluated !== null) {
      const negated = formatCalcNumber(-evaluated);
      setExpression(negated);
      setDisplayValue(negated);
      setJustEvaluated(false);
    }
  }, [displayValue, expression, justEvaluated]);

  const handleEvaluate = useCallback(() => {
    const targetExpr = expression.trim() || displayValue;
    if (!targetExpr) return;
    const result = evaluateSafeMath(targetExpr);
    if (result === null) {
      setErrorMsg('Invalid expression or division by zero');
      return;
    }
    const formatted = formatCalcNumber(result);
    setHistory((prev) =>
      [{ expression: targetExpr, result: formatted }, ...prev].slice(0, 5)
    );
    setExpression(targetExpr);
    setDisplayValue(formatted);
    setJustEvaluated(true);
    setErrorMsg(null);
  }, [displayValue, expression]);

  const handleCopyResult = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(displayValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard may be unavailable in restricted contexts
    }
  }, [displayValue]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      const activeTag = document.activeElement?.tagName;
      if (
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA' ||
        activeTag === 'SELECT'
      ) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        appendChar(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        appendChar('.');
      } else if (e.key === '+') {
        e.preventDefault();
        appendChar('+');
      } else if (e.key === '-') {
        e.preventDefault();
        appendChar('-');
      } else if (e.key === '*') {
        e.preventDefault();
        appendChar('×');
      } else if (e.key === '/') {
        e.preventDefault();
        appendChar('÷');
      } else if (e.key === '%') {
        e.preventDefault();
        appendChar('%');
      } else if (e.key === '(' || e.key === ')') {
        e.preventDefault();
        appendChar(e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEvaluate();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Delete' || e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleClear();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    appendChar,
    handleBackspace,
    handleClear,
    handleEvaluate,
  ]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open math calculator"
        title="Math Calculator"
        className="cursor-pointer p-2 text-slate-600 dark:text-slate-300 hover:text-[#2B2F36] dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
      >
        <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Math Calculator"
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-xs sm:max-w-sm shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#2C3A57] dark:text-sky-300" />
                <h2 className="font-display text-sm font-bold text-[#2B2F36] dark:text-slate-100">
                  Quick Calculator
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close calculator"
                className="cursor-pointer p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Display Screen */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between gap-2 min-h-[18px]">
                <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400 truncate">
                  {justEvaluated ? `${expression} =` : expression || 'Ready'}
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopyResult()}
                  className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-[#2C3A57] dark:hover:text-sky-300 shrink-0"
                  title="Copy result"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-[#4B756E] dark:text-[#8FB9B1]" />
                      <span className="text-[#4B756E] dark:text-[#8FB9B1]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div
                aria-live="polite"
                className="text-right text-2xl sm:text-3xl font-bold font-mono-tabular text-[#2B2F36] dark:text-slate-100 truncate select-all"
              >
                {displayValue}
              </div>

              {errorMsg && (
                <p role="alert" className="text-right text-[11px] text-[#C44D34] dark:text-[#E87A64]">
                  {errorMsg}
                </p>
              )}
            </div>

            {/* Keypad */}
            <div className="p-3.5 grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="cursor-pointer min-h-[44px] rounded-lg text-sm font-semibold bg-red-50 dark:bg-red-950/40 text-[#A83C25] dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/70 transition-colors"
              >
                AC
              </button>
              <button
                type="button"
                onClick={handleToggleParen}
                className="cursor-pointer min-h-[44px] rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-[#2B2F36] dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-mono-tabular"
              >
                ( )
              </button>
              <button
                type="button"
                onClick={() => appendChar('%')}
                className="cursor-pointer min-h-[44px] rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-[#2B2F36] dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-mono-tabular"
                title="Modulo remainder"
              >
                %
              </button>
              <button
                type="button"
                onClick={() => appendChar('÷')}
                aria-label="Divide"
                className="cursor-pointer min-h-[44px] rounded-lg text-base font-semibold bg-[#68978F]/15 dark:bg-[#68978F]/25 text-[#2C3A57] dark:text-[#8FB9B1] hover:bg-[#68978F]/25 dark:hover:bg-[#68978F]/35 transition-colors font-mono-tabular"
              >
                ÷
              </button>

              {['7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => appendChar(digit)}
                  className="cursor-pointer min-h-[44px] rounded-lg text-base font-semibold font-mono-tabular bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => appendChar('×')}
                aria-label="Multiply"
                className="cursor-pointer min-h-[44px] rounded-lg text-base font-semibold bg-[#68978F]/15 dark:bg-[#68978F]/25 text-[#2C3A57] dark:text-[#8FB9B1] hover:bg-[#68978F]/25 dark:hover:bg-[#68978F]/35 transition-colors font-mono-tabular"
              >
                ×
              </button>

              {['4', '5', '6'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => appendChar(digit)}
                  className="cursor-pointer min-h-[44px] rounded-lg text-base font-semibold font-mono-tabular bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => appendChar('-')}
                aria-label="Subtract"
                className="cursor-pointer min-h-[44px] rounded-lg text-base font-semibold bg-[#68978F]/15 dark:bg-[#68978F]/25 text-[#2C3A57] dark:text-[#8FB9B1] hover:bg-[#68978F]/25 dark:hover:bg-[#68978F]/35 transition-colors font-mono-tabular"
              >
                −
              </button>

              {['1', '2', '3'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => appendChar(digit)}
                  className="cursor-pointer min-h-[44px] rounded-lg text-base font-semibold font-mono-tabular bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => appendChar('+')}
                aria-label="Add"
                className="cursor-pointer min-h-[44px] rounded-lg text-base font-semibold bg-[#68978F]/15 dark:bg-[#68978F]/25 text-[#2C3A57] dark:text-[#8FB9B1] hover:bg-[#68978F]/25 dark:hover:bg-[#68978F]/35 transition-colors font-mono-tabular"
              >
                +
              </button>

              <button
                type="button"
                onClick={handleToggleSign}
                aria-label="Negate value"
                className="cursor-pointer min-h-[44px] rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-[#2B2F36] dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-mono-tabular"
              >
                ±
              </button>
              <button
                type="button"
                onClick={() => appendChar('0')}
                className="cursor-pointer min-h-[44px] rounded-lg text-base font-semibold font-mono-tabular bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => appendChar('.')}
                aria-label="Decimal point"
                className="cursor-pointer min-h-[44px] rounded-lg text-base font-semibold font-mono-tabular bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-[#2B2F36] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                .
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={handleBackspace}
                  aria-label="Backspace"
                  title="Backspace"
                  className="cursor-pointer min-h-[44px] rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <Delete className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleEvaluate}
                  aria-label="Equals"
                  className="cursor-pointer min-h-[44px] rounded-lg text-base font-bold bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] text-white transition-colors font-mono-tabular"
                >
                  =
                </button>
              </div>
            </div>

            {/* Calculation History Tape */}
            {history.length > 0 && (
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <History className="w-3 h-3" />
                    <span>Recent Calculations</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setHistory([])}
                    className="cursor-pointer hover:underline"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {history.map((item, idx) => (
                    <button
                      key={`${item.expression}-${idx}`}
                      type="button"
                      onClick={() => {
                        setExpression(item.result);
                        setDisplayValue(item.result);
                        setJustEvaluated(false);
                        setErrorMsg(null);
                      }}
                      className="cursor-pointer w-full flex items-center justify-between gap-2 text-xs font-mono-tabular px-2 py-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                    >
                      <span className="text-slate-500 dark:text-slate-400 truncate">
                        {item.expression}
                      </span>
                      <span className="font-semibold text-[#2B2F36] dark:text-slate-200 shrink-0">
                        = {item.result}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
