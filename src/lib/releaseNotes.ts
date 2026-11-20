// リリースノートの原稿（公開ページ /release-notes に表示する）
// リリース時に GitHub Releases の下書きの本文を先頭に 1 件として移す。
// 手順とテンプレートは docs/仕様・計画/platform/ と docs/変更仕様/release-notes.md を参照。

export type ReleaseNote = {
  /** バージョン番号（例: 0.2.0）。先頭の 1 件は package.json の version と一致させる */
  version: string;
  /** 公開日（JST、YYYY-MM-DD）。そのまま表示する */
  date: string;
  /** 更新内容（Markdown）。見出しは「見どころ！」「追加」「変更」「修正」「セキュリティ」 */
  body: string;
};

/** 新しい順に並べる */
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '0.2.0',
    date: '2026-11-20',
    body: `
### 見どころ！

- リリースノートを見られるようにしました。

### 追加

- 個人設定の「アプリ情報」のバージョンから、これまでの更新内容を確認できるようになりました。
`,
  },
];
