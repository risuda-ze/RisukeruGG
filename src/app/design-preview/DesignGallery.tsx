'use client';

import { useState, useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, type ColorFamily } from '@/components/ui/Card';
import { Dropdown } from '@/components/ui/Dropdown';
import { HintBar } from '@/components/ui/HintBar';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { StatCard } from '@/components/ui/StatCard';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';

const SURFACES = ['canvas', 'surface', 'card', 'surface-2', 'border', 'border-strong'] as const;
const BRAND = ['primary', 'primary-hover', 'primary-active', 'brand', 'brand-2'] as const;
const TEXTS = ['text', 'text-2', 'text-muted', 'text-disabled'] as const;
const STATUS = ['success', 'warning', 'danger', 'info'] as const;
const FAMILIES: ColorFamily[] = ['pink', 'orange', 'green', 'blue', 'teal'];

const OPTIONS = [
  { value: 'stream', label: '配信' },
  { value: 'edit', label: '動画編集' },
  { value: 'collab', label: 'コラボ' },
  { value: 'meeting', label: '打ち合わせ' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ name }: { name: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-14 rounded-md border border-border" style={{ background: `var(--${name})` }} />
      <span className="text-caption text-text-2">--{name}</span>
    </div>
  );
}

export function DesignGallery() {
  const { resolvedTheme, setTheme } = useTheme();
  // サーバーでは選択がわからないため、マウント後にだけ選択中を示す
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const theme = mounted ? resolvedTheme : undefined;
  const [modal, setModal] = useState<null | 'confirm' | 'danger'>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [hint, setHint] = useState(true);
  const [allDay, setAllDay] = useState(true);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-10 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-text-2">RisukeruGG design system v3</p>
          <h1 className="mt-2">デザインシステム確認</h1>
          <p className="mt-2 text-sm text-text-2">正本: docs/DESIGN.md。開発時のみ表示されるページです。</p>
        </div>
        <div className="flex gap-2" role="group" aria-label="テーマ">
          <Button size="sm" variant={theme === 'dark' ? 'primary' : 'ghost'} onClick={() => setTheme('dark')}>
            ダーク
          </Button>
          <Button size="sm" variant={theme === 'light' ? 'primary' : 'ghost'} onClick={() => setTheme('light')}>
            ライト
          </Button>
        </div>
      </header>

      <Section title="色">
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">{SURFACES.map((n) => <Swatch key={n} name={n} />)}</div>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">{BRAND.map((n) => <Swatch key={n} name={n} />)}</div>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">{TEXTS.map((n) => <Swatch key={n} name={n} />)}</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {STATUS.map((n) => (
            <div key={n} className="flex flex-col gap-1.5">
              <div
                className="flex h-14 items-center justify-center rounded-md border text-sm font-semibold"
                style={{ background: `var(--${n}-tint)`, borderColor: `var(--${n})`, color: `var(--${n})` }}
              >
                {n}
              </div>
              <span className="text-caption text-text-2">--{n} / --{n}-tint</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {FAMILIES.map((f) => (
            <Card key={f} variant="specimen" family={f} noPadding className="p-3">
              <p className="text-sm font-semibold" style={{ color: `var(--${f}-text)` }}>
                {f}
              </p>
              <p className="text-caption" style={{ color: `var(--${f}-text)` }}>
                tint + border + text
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="タイポグラフィ">
        <Card className="flex flex-col gap-4">
          <p className="text-display">display 40 / 12月24日</p>
          <h1>h1 28 / ページタイトル</h1>
          <h2>h2 24 / セクション見出し</h2>
          <h3>h3 20 / カード見出し</h3>
          <p>body 16 / 配信スケジュールとタスクをチームでひとつにまとめる。</p>
          <p className="text-sm text-text-2">body-sm 14 / リスト行・補足のテキスト。</p>
          <p className="text-caption text-text-2">caption 12 / 2026-11-16 21:00 更新</p>
          <p className="eyebrow text-text-2">eyebrow 12 / section label</p>
          <p className="font-num text-h2">21:00 – 23:30 / 1,234,567</p>
        </Card>
      </Section>

      <Section title="Button">
        <Card className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button>予定を追加</Button>
            <Button variant="ghost">キャンセル</Button>
            <Button variant="subtle">絞り込み</Button>
            <Button variant="danger">削除する</Button>
            <Button variant="link">詳しく見る</Button>
            <Button variant="amber">アップグレード</Button>
            <Button variant="success">確定済み</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">sm 36px</Button>
            <Button>md 44px</Button>
            <Button size="lg">lg 52px</Button>
            <Button size="icon" variant="subtle" aria-label="追加">
              <Icon name="add" size={18} />
            </Button>
            <Button size="icon-sm" variant="subtle" aria-label="閉じる">
              <Icon name="close" size={16} />
            </Button>
            <Button loading>保存中</Button>
            <Button disabled>無効</Button>
          </div>
        </Card>
      </Section>

      <Section title="Badge">
        <Card className="flex flex-wrap items-center gap-3">
          <Badge variant="primary">primary</Badge>
          <Badge variant="success" dot>
            完了
          </Badge>
          <Badge variant="warning">期限間近</Badge>
          <Badge variant="danger">期限超過</Badge>
          <Badge variant="info">お知らせ</Badge>
          <Badge variant="neutral">下書き</Badge>
          <Badge variant="live" dot>
            LIVE
          </Badge>
        </Card>
      </Section>

      <Section title="Card">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <h3>default</h3>
            <p className="mt-2 text-sm text-text-2">card 面 + 1px border。一般的なカード。</p>
          </Card>
          <Card variant="specimen" family="pink">
            <h3 className="text-pink-text">specimen</h3>
            <p className="mt-2 text-sm text-pink-text">ファミリーの tint 面 + 2px border。</p>
          </Card>
          <Card variant="flat">
            <h3>flat</h3>
            <p className="mt-2 text-sm text-text-2">surface 面。セクション背景・グループ枡。</p>
          </Card>
          <Card interactive accent="primary">
            <h3>interactive + accent</h3>
            <p className="mt-2 text-sm text-text-2">hover で枡線だけ強くなる。浮かせない。</p>
          </Card>
          <Card noPadding className="md:col-span-2">
            <CardHeader title="CardHeader 付き" action="すべて見る" />
            <p className="p-4 text-sm text-text-2">noPadding のカードにヘッダーを載せた例。</p>
          </Card>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="今週の配信" value={5} sub="先週 +2" />
          <StatCard label="期限間近" value={3} color="amber" sub="3日以内" />
          <StatCard label="期限超過" value={1} color="live" />
          <StatCard label="完了タスク" value={24} color="green" sub="今月" />
        </div>
      </Section>

      <Section title="Input / Textarea / Dropdown / Switch">
        <Card className="grid gap-5 md:grid-cols-2">
          <Input label="タイトル" placeholder="予定のタイトルを入力" />
          <Input label="メールアドレス" defaultValue="invalid" error="メールアドレスの形式が正しくありません" />
          <Input label="表示名" hint="チームメンバーに表示されます" defaultValue="りす" />
          <div className="flex flex-col gap-1.5">
            <span className="eyebrow text-text-2">カテゴリ</span>
            <Dropdown options={OPTIONS} value={category} onChange={setCategory} placeholder="未選択" icon="task_alt" />
          </div>
          <Textarea label="メモ" placeholder="補足を入力" className="md:col-span-2" />
          <div className="flex flex-wrap items-center gap-3">
            <Dropdown size="sm" options={OPTIONS} value={category} onChange={setCategory} className="w-40" />
            <select defaultValue="week" aria-label="表示">
              <option value="week">週</option>
              <option value="month">月</option>
            </select>
            <input type="date" aria-label="日付" defaultValue="2026-11-16" />
            <Switch label="終日" checked={allDay} onCheckedChange={setAllDay} />
          </div>
        </Card>
      </Section>

      <Section title="Dialog / Drawer / Toast">
        <Card className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" onClick={() => setModal('confirm')}>
            モーダルを開く
          </Button>
          <Button variant="danger" onClick={() => setModal('danger')}>
            削除の確認
          </Button>
          <Button variant="subtle" onClick={() => toast.success('予定を保存しました')}>
            Toast: success
          </Button>
          <Button variant="subtle" onClick={() => toast.error('保存に失敗しました。もう一度お試しください。')}>
            Toast: error
          </Button>
          <Button variant="subtle" onClick={() => toast.info('新しいコメントがあります', { description: '「歌枠の準備」に1件' })}>
            Toast: info
          </Button>
          <p className="w-full text-caption text-text-2">
            モーダルは PC（768px 以上）で Dialog、モバイル幅では下からの Drawer になります。
          </p>
        </Card>
      </Section>

      <Section title="その他">
        <Card noPadding className="pb-4">
          {hint ? (
            <HintBar onDismiss={() => setHint(false)}>
              <b>ヒント:</b> 日付をクリックすると予定を追加できます。
            </HintBar>
          ) : (
            <div className="px-4 pt-4">
              <Button size="sm" variant="subtle" onClick={() => setHint(true)}>
                ヒントを再表示
              </Button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4 px-4 pt-4 md:px-7">
            <Spinner size="sm" />
            <Spinner />
            <Spinner size="lg" />
            <Avatar initials="りす" size="sm" />
            <Avatar initials="ゆき" />
            <Avatar initials="あめ" size="lg" online />
          </div>
        </Card>
      </Section>

      <Modal
        open={modal === 'confirm'}
        onClose={() => setModal(null)}
        title="予定を保存しますか？"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>
              キャンセル
            </Button>
            <Button
              onClick={() => {
                setModal(null);
                toast.success('予定を保存しました');
              }}
            >
              保存する
            </Button>
          </>
        }
      >
        <p className="text-text-2">12月24日 21:00 – 23:30「クリスマス歌枠」をチームのカレンダーに追加します。</p>
        <div className="mt-4">
          <Input label="メモ" placeholder="任意" />
        </div>
      </Modal>

      <Modal
        open={modal === 'danger'}
        onClose={() => setModal(null)}
        title="この予定を削除しますか？"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>
              キャンセル
            </Button>
            <Button variant="danger" onClick={() => setModal(null)}>
              削除する
            </Button>
          </>
        }
      >
        <p className="text-text-2">削除した予定は元に戻せません。</p>
      </Modal>
    </main>
  );
}
