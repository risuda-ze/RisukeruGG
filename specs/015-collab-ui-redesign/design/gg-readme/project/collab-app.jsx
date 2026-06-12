// collab-app.jsx — DesignCanvas 組み立て（FPS × PC / モバイル × 一覧 / 詳細）
const { DesignCanvas, DCSection, DCArtboard } = window;
const { CollabAppPC, CollabAppMobile } = window;

function App() {
  return (
    <DesignCanvas style={{ background: '#07071a' }}>
      <DCSection id="list" title="コラボ画面（一覧）"
        subtitle="調整中ゾーン＋予定確定ゾーン。タイトル / ステータス / 参加者 / 残り回答者数 / 詳細・削除。">
        <DCArtboard id="fps-list" label="PC — コラボ一覧" width={1440} height={1160} style={{ background: 'var(--bg)' }}>
          <CollabAppPC initialView="board" />
        </DCArtboard>
        <DCArtboard id="m-list" label="モバイル — コラボ一覧" width={390} height={844} style={{ background: 'var(--bg)' }}>
          <CollabAppMobile initialView="board" />
        </DCArtboard>
      </DCSection>

      <DCSection id="detail" title="コラボ詳細画面"
        subtitle="新規作成・編集・日程確定。タイトル / ステータス / 内容 / 候補日時カード / 参加者 / メタ情報 / コメント。">
        <DCArtboard id="fps-detail" label="PC — コラボ詳細" width={1440} height={920} style={{ background: 'var(--bg)' }}>
          <CollabAppPC initialView="detail" />
        </DCArtboard>
        <DCArtboard id="m-detail" label="モバイル — コラボ詳細" width={390} height={844} style={{ background: 'var(--bg)' }}>
          <CollabAppMobile initialView="detail" />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
