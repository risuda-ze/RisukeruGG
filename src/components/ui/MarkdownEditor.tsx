'use client';

import { useState, useContext, createContext } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownEditorProps {
  label?: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  /** true の場合はプレビューのみ表示（編集不可） */
  readOnly?: boolean;
  rows?: number;
  className?: string;
}

const textareaClass =
  'w-full bg-bg border border-border text-text px-3.5 py-2.5 rounded-[12px] text-[14px] outline-none transition-colors focus:border-purple resize-y';

/* ── コードブロックコンテキスト ──────────────────────────────────
 * pre コンポーネントが true を流すことで、内側の code がブロックか否かを判定。
 * react-markdown v10 では children の型だけでは区別できないため Context を使用。
 */
const InsidePreCtx = createContext(false);

/* ── コードコンポーネント ──────────────────────────────────────── */
function CodeComp({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const insidePre = useContext(InsidePreCtx);

  if (insidePre) {
    /* ブロックコード内の <code> — スタイルは <pre> が担う */
    return (
      <code
        className={`font-mono text-[13px] text-text/90 ${className ?? ''}`}
        style={{ background: 'none', padding: 0 }}
      >
        {children}
      </code>
    );
  }

  /* インラインコード */
  return (
    <code className="bg-surface px-1.5 py-0.5 rounded text-[12px] font-mono text-purple-l">
      {children}
    </code>
  );
}

/* ── マークダウンコンポーネント定義 ──────────────────────────── */
const MD_COMPONENTS: Components = {
  /* 見出し */
  h1: ({ children }) => <h1 className="text-[18px] font-bold mb-2 mt-1">{children}</h1>,
  h2: ({ children }) => <h2 className="text-[16px] font-bold mb-1.5 mt-1">{children}</h2>,
  h3: ({ children }) => <h3 className="text-[14px] font-bold mb-1 mt-1">{children}</h3>,

  /* 段落 */
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,

  /* リスト */
  ul: ({ children }) => (
    <ul className="list-disc pl-4 mb-2 flex flex-col gap-0.5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-4 mb-2 flex flex-col gap-0.5">{children}</ol>
  ),
  li: ({ children }) => <li className="text-[14px]">{children}</li>,

  /* コードブロック（pre 内に Provider を配置してコンテキスト伝播を確実にする） */
  pre: ({ children }) => (
    <pre
      className="bg-surface px-3 py-2.5 rounded-[8px] text-[12px] font-mono overflow-x-auto mb-2"
      style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
    >
      <InsidePreCtx.Provider value={true}>
        {children}
      </InsidePreCtx.Provider>
    </pre>
  ),
  code: CodeComp,

  /* テーブル */
  table: ({ children }) => (
    <div className="overflow-x-auto mb-2">
      <table className="min-w-full border-collapse text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b-2 border-border">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-border/50">{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-text whitespace-nowrap">{children}</th>
  ),
  td: ({ children }) => <td className="px-3 py-2 text-text/90">{children}</td>,

  /* 引用 */
  blockquote: ({ children }) => (
    <blockquote className="border-l-[3px] border-purple-l/40 pl-3 text-muted italic mb-2">
      {children}
    </blockquote>
  ),

  /* インライン装飾 */
  strong: ({ children }) => <strong className="font-bold text-text">{children}</strong>,
  em: ({ children }) => <em className="italic text-text/80">{children}</em>,

  /* 区切り線 */
  hr: () => <hr className="border-border my-3" />,

  /* リンク */
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-purple-l underline hover:text-purple transition-colors"
    >
      {children}
    </a>
  ),

  /* GFM チェックリスト */
  input: ({ checked }) => (
    <input type="checkbox" checked={checked} readOnly className="mr-1.5 accent-purple-l" />
  ),
};

/** マークダウン記法の入力とプレビュー切替をサポートするテキストエリア */
export function MarkdownEditor({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  readOnly = false,
  rows = 4,
  className,
}: MarkdownEditorProps) {
  // readOnly の場合は常にプレビュー表示
  const [preview, setPreview] = useState(readOnly);

  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      {/* ラベル行 */}
      {(label || !readOnly) && (
        <div className="flex items-center justify-between">
          {label && (
            <label className="text-[12px] font-semibold text-muted">{label}</label>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              className="flex items-center gap-1 text-[11px] text-muted hover:text-purple-l transition-colors"
              title={preview ? '編集モードに切替' : 'プレビューモードに切替'}
            >
              <span className="material-icons text-[14px]">
                {preview ? 'edit' : 'visibility'}
              </span>
              {preview ? '編集' : 'プレビュー'}
            </button>
          )}
        </div>
      )}

      {/* 編集モード */}
      {!preview && (
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={rows}
          className={textareaClass}
        />
      )}

      {/* プレビューモード */}
      {preview && (
        <div
          className={[
            'min-h-[60px] px-3.5 py-2.5 rounded-[12px] text-[14px] text-text leading-relaxed',
            readOnly ? '' : 'border border-border bg-bg',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {value ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
              {value}
            </ReactMarkdown>
          ) : (
            <span className="text-muted/50 italic text-[13px]">{placeholder ?? '内容なし'}</span>
          )}
        </div>
      )}

      {/* 文字数カウンター */}
      {maxLength && !readOnly && (
        <p className="text-[11px] text-muted/50 self-end">
          {value.length} / {maxLength}
        </p>
      )}
    </div>
  );
}
