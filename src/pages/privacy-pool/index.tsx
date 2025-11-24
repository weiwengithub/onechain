/**
 * Privacy Pool Main Page
 * 隐私池主页面
 */

import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { usePrivacyPool, selectTotalBalance } from '@/zustand/hooks/usePrivacyPool';
import { PRIVACY_POOL_CONFIG } from '@/constants/privacyPool';
import type { PrivacyPoolTransaction } from '@/types/privacyPool';

export const Route = createFileRoute('/privacy-pool/')({
  component: PrivacyPoolPage,
});

function PrivacyPoolPage() {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

  const {
    deposits,
    transactions,
    getUnspentDeposits,
  } = usePrivacyPool();

  const totalBalance = usePrivacyPool(selectTotalBalance);
  const unspentDeposits = getUnspentDeposits();

  return (
    <div className="privacy-pool-container max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="header mb-8">
        <h1 className="text-3xl font-bold mb-2">Privacy Pool</h1>
        <p className="text-gray-600">
          基于零知识证明的匿名转账系统
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="stat-card bg-white rounded-lg p-6 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">总余额</div>
          <div className="text-2xl font-bold">{totalBalance}</div>
        </div>

        <div className="stat-card bg-white rounded-lg p-6 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">可用存款</div>
          <div className="text-2xl font-bold">{unspentDeposits.length}</div>
        </div>

        <div className="stat-card bg-white rounded-lg p-6 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">总交易</div>
          <div className="text-2xl font-bold">{transactions.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mb-6">
        <div className="flex border-b">
          <button
            className={`px-6 py-3 font-medium ${
              activeTab === 'deposit'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('deposit')}
          >
            存款
          </button>
          <button
            className={`px-6 py-3 font-medium ${
              activeTab === 'withdraw'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('withdraw')}
          >
            提款
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'deposit' && <DepositPanel />}
        {activeTab === 'withdraw' && <WithdrawPanel />}
      </div>

      {/* Recent Activity */}
      <div className="recent-activity mt-8">
        <h2 className="text-xl font-bold mb-4">最近活动</h2>
        <TransactionList transactions={transactions.slice(0, 10)} />
      </div>
    </div>
  );
}

/**
 * Deposit Panel Component
 */
function DepositPanel() {
  const [selectedDenomination, setSelectedDenomination] = useState<string>('1');
  const [isDepositing, setIsDepositing] = useState(false);

  const handleDeposit = async () => {
    setIsDepositing(true);
    try {
      // TODO: Implement deposit logic
      const denomination = PRIVACY_POOL_CONFIG.DENOMINATIONS[selectedDenomination as keyof typeof PRIVACY_POOL_CONFIG.DENOMINATIONS];
      console.log('Depositing:', denomination);
    } catch (error) {
      console.error('Deposit failed:', error);
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <div className="deposit-panel bg-white rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-bold mb-4">选择存款金额</h3>

      <div className="denomination-grid grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Object.keys(PRIVACY_POOL_CONFIG.DENOMINATIONS).map((amount) => (
          <button
            key={amount}
            className={`denomination-btn p-4 rounded-lg border-2 transition-colors ${
              selectedDenomination === amount
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedDenomination(amount)}
          >
            <div className="text-2xl font-bold">{amount}</div>
            <div className="text-sm text-gray-500">SUI</div>
          </button>
        ))}
      </div>

      <div className="info-box bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">
          💡 存款后会生成一个 Note,请务必安全保存。提款时需要使用此 Note。
        </p>
      </div>

      <button
        className="deposit-btn w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        onClick={handleDeposit}
        disabled={isDepositing}
      >
        {isDepositing ? '处理中...' : `存入 ${selectedDenomination} SUI`}
      </button>
    </div>
  );
}

/**
 * Withdraw Panel Component
 */
function WithdrawPanel() {
  const unspentDeposits = usePrivacyPool((state: any) => state.getUnspentDeposits());
  const [selectedNote, setSelectedNote] = useState<string>('');
  const [recipient, setRecipient] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleWithdraw = async () => {
    if (!selectedNote || !recipient) {
      alert('请选择 Note 并输入接收地址');
      return;
    }

    setIsWithdrawing(true);
    try {
      // TODO: Implement withdraw logic
      console.log('Withdrawing:', { selectedNote, recipient });
    } catch (error) {
      console.error('Withdraw failed:', error);
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (unspentDeposits.length === 0) {
    return (
      <div className="withdraw-panel bg-white rounded-lg p-6 shadow-sm">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-lg font-bold mb-2">暂无可用存款</h3>
          <p className="text-gray-500 mb-4">
            请先进行存款操作
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="withdraw-panel bg-white rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-bold mb-4">选择要提取的存款</h3>

      <div className="note-list space-y-3 mb-6">
        {unspentDeposits.map((note: any) => (
          <button
            key={note.id}
            className={`note-item w-full p-4 rounded-lg border-2 text-left transition-colors ${
              selectedNote === note.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedNote(note.id)}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">{note.amount}</div>
                <div className="text-sm text-gray-500">
                  {new Date(note.timestamp).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Leaf #{note.leafIndex}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="recipient-input mb-6">
        <label className="block text-sm font-medium mb-2">接收地址</label>
        <input
          type="text"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0x..."
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">
          提款将发送到此地址,建议使用新地址以保护隐私
        </p>
      </div>

      <div className="info-box bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          🔐 提款需要生成零知识证明,可能需要 10-30 秒,请耐心等待。
        </p>
      </div>

      <button
        className="withdraw-btn w-full bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        onClick={handleWithdraw}
        disabled={isWithdrawing || !selectedNote || !recipient}
      >
        {isWithdrawing ? '生成证明中...' : '提款'}
      </button>
    </div>
  );
}

/**
 * Transaction List Component
 */
function TransactionList({ transactions }: { transactions: PrivacyPoolTransaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        暂无交易记录
      </div>
    );
  }

  return (
    <div className="transaction-list bg-white rounded-lg shadow-sm overflow-hidden">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="transaction-item p-4 border-b last:border-b-0 hover:bg-gray-50"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  tx.type === 'deposit'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-green-100 text-green-600'
                }`}
              >
                {tx.type === 'deposit' ? '↓' : '↑'}
              </div>
              <div>
                <div className="font-medium">
                  {tx.type === 'deposit' ? '存款' : '提款'}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(tx.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">{tx.amount / 1e9} SUI</div>
              <div
                className={`text-xs ${
                  tx.status === 'confirmed'
                    ? 'text-green-500'
                    : tx.status === 'pending'
                    ? 'text-yellow-500'
                    : 'text-red-500'
                }`}
              >
                {tx.status === 'confirmed'
                  ? '已确认'
                  : tx.status === 'pending'
                  ? '处理中'
                  : '失败'}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
