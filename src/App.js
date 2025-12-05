import React, { useState, useEffect, useRef } from 'react';
import * as xrpl from 'xrpl';
import { motion } from 'framer-motion';
import Chart from 'chart.js/auto';
import { QRCodeCanvas } from 'qrcode.react';

const TABS = ['Dashboard', 'Receive', 'Send', 'History', 'RWA', 'NFT', 'BUY/SELL Crypto', 'NEWS'];

const XRPZipWallet = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(0);
  const [xrpPrice, setXrpPrice] = useState(2.17);
  const [txStatus, setTxStatus] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [seedInput, setSeedInput] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [generatedSeed, setGeneratedSeed] = useState('');

  const chartRef = useRef(null);
  const clientRef = useRef(null);

  const ROYAL_BLUE = '#002366';
  const GOLD = '#FFD700';

  useEffect(() => {
    const stored = localStorage.getItem('xrpzip-wallet');
    if (stored) {
      const w = JSON.parse(stored);
      setWallet(w);
      getBalance(w.classicAddress);
      getTransactions(w.classicAddress);
    }
  }, []);

  useEffect(() => {
    if (wallet) localStorage.setItem('xrpzip-wallet', JSON.stringify(wallet));
  }, [wallet]);

  const getClient = async () => {
    if (!clientRef.current) clientRef.current = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
    if (!clientRef.current.isConnected()) await clientRef.current.connect();
    return clientRef.current;
  };

  const getBalance = async (addr) => {
    const client = await getClient();
    try {
      const info = await client.request({ command: 'account_info', account: addr, ledger_index: 'validated' });
      setBalance(xrpl.dropsToXrp(info.result.account_data.Balance));
    } catch (err) {
      setBalance(0);
    }
  };

  const getTransactions = async (addr) => {
    const client = await getClient();
    try {
      const res = await client.request({ command: 'account_tx', account: addr, limit: 15 });
      setTransactions(res.result.transactions || []);
    } catch (err) {
      setTransactions([]);
    }
  };

  const generateWallet = () => {
    const w = xrpl.Wallet.generate();
    setWallet(w);
    localStorage.setItem('xrpzip-wallet', JSON.stringify(w));
    setGeneratedSeed(w.seed);
    setShowSeedModal(true);
  };

  const importWallet = () => {
    if (!seedInput.trim()) return alert('Enter seed');
    try {
      const w = xrpl.Wallet.fromSeed(seedInput.trim());
      setWallet(w);
      localStorage.setItem('xrpzip-wallet', JSON.stringify(w));
      setSeedInput('');
      getBalance(w.classicAddress);
      getTransactions(w.classicAddress);
    } catch (e) {
      alert('Invalid seed');
    }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setTxStatus('Copied!');
  };

  const sendXRP = async () => {
    if (!wallet || !sendAmount || !recipient) return setTxStatus('Fill all fields');
    try {
      const client = await getClient();
      const freshWallet = xrpl.Wallet.fromSeed(wallet.seed);
      const prepared = await client.autofill({
        TransactionType: 'Payment',
        Account: wallet.classicAddress,
        Amount: xrpl.xrpToDrops(sendAmount),
        Destination: recipient,
      });
      const signed = freshWallet.sign(prepared);
      await client.submitAndWait(signed.tx_blob);
      setTxStatus(`Success! Sent ${sendAmount} XRP`);
      setSendAmount('');
      setRecipient('');
      getBalance(wallet.classicAddress);
      getTransactions(wallet.classicAddress);
    } catch (err) {
      setTxStatus('Failed: ' + (err.message || 'Error'));
    }
  };

  // Chart
  useEffect(() => {
    if (!wallet) return;
    if (chartRef.current) chartRef.current.destroy();
    const canvas = document.getElementById('zipMeter');
    if (!canvas) return;
    chartRef.current = new Chart(canvas, {
      type: 'doughnut',
      data: { datasets: [{ data: [0, 5], backgroundColor: ['#00ff00', '#222'] }] },
      options: { cutout: '85%', rotation: -90, circumference: 180, plugins: { legend: false, tooltip: false } }
    });
    return () => chartRef.current?.destroy();
  }, [wallet]);

  // FIRST VISIT
  if (!wallet) {
    return (
      <div style={{ background: ROYAL_BLUE, color: 'white', minHeight: '100vh', textAlign: 'center', paddingTop: '10%' }}>
        <motion.h1 style={{ fontSize: '7rem', color: GOLD }}>XRPZip</motion.h1>
        <p style={{ fontSize: '2.2rem', maxWidth: '900px', margin: '40px auto' }}>
          The fastest, most beautiful XRPL wallet
        </p>
        <button onClick={generateWallet} style={{ background: GOLD, color: ROYAL_BLUE, padding: '20px 60px', fontSize: '2rem' }}>
          Create Wallet
        </button>
        <div style={{ marginTop: '60px' }}>
          <input placeholder="Import seed" value={seedInput} onChange={e => setSeedInput(e.target.value)} style={{ width: '500px', padding: '15px' }} />
          <button onClick={importWallet} style={{ background: 'transparent', color: GOLD, padding: '15px 40px', border: '2px solid gold' }}>
            Import
          </button>
        </div>
      </div>
    );
  }

  // SEED MODAL
  if (showSeedModal) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <motion.div style={{ background: ROYAL_BLUE, padding: '60px', borderRadius: '30px', border: '6px solid gold', maxWidth: '700px', textAlign: 'center' }}>
          <h2 style={{ color: GOLD, fontSize: '3rem' }}>Wallet Created!</h2>
          <p style={{ color: '#ff4444', fontSize: '1.8rem' }}>BACKUP YOUR SEED</p>
          <div style={{ background: '#001133', padding: '25px', borderRadius: '15px', margin: '30px 0', fontSize: '1.5rem', wordBreak: 'break-all' }}>
            {generatedSeed}
          </div>
          <button onClick={() => copy(generatedSeed)} style={{ background: GOLD, color: ROYAL_BLUE, padding: '15px 30px' }}>
            Copy Seed
          </button>
          <button onClick={() => setShowSeedModal(false)} style={{ marginLeft: '20px', background: 'transparent', color: 'white', padding: '15px 30px', border: '2px solid gold' }}>
            I’ve Saved It
          </button>
        </motion.div>
      </div>
    );
  }

  // MAIN APP
  return (
    <div style={{ background: ROYAL_BLUE, color: 'white', minHeight: '100vh', fontFamily: 'Arial' }}>
      <div style={{ background: '#001133', padding: '15px', textAlign: 'center', borderBottom: '4px solid gold' }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? GOLD : 'transparent',
              color: activeTab === tab ? ROYAL_BLUE : 'white',
              border: '2px solid gold',
              padding: '12px 20px',
              margin: '0 8px',
              fontWeight: 'bold',
              borderRadius: '10px'
            }}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {activeTab === 'Dashboard' && (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '6rem', color: GOLD }}>XRPZip</h1>
          <p style={{ fontSize: '2.5rem' }}>Balance: <strong style={{ color: GOLD }}>{balance.toFixed(6)} XRP</strong></p>
          <p style={{ fontSize: '2rem' }}>≈ ${(balance * xrpPrice).toFixed(2)} USD</p>
          <canvas id="zipMeter" width="300" height="160"></canvas>
        </div>
      )}

      {/* RECEIVE */}
      {activeTab === 'Receive' && (
        <div style={{ padding: '80px', textAlign: 'center' }}>
          <h2 style={{ color: GOLD, fontSize: '3.5rem' }}>RECEIVE XRP</h2>
          <QRCodeCanvas value={wallet.classicAddress} size={240} bgColor="#000" fgColor="#fff" />
          <p style={{ margin: '40px 0', wordBreak: 'break-all', fontSize: '1.4rem' }}>{wallet.classicAddress}</p>
          <button onClick={() => copy(wallet.classicAddress)} style={{ background: GOLD, color: ROYAL_BLUE, padding: '15px 40px' }}>
            Copy Address
          </button>
        </div>
      )}

      {/* SEND */}
      {activeTab === 'Send' && (
        <div style={{ padding: '60px', maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ color: GOLD, textAlign: 'center', fontSize: '3.5rem' }}>SEND XRP</h2>
          <input placeholder="Recipient address" value={recipient} onChange={e => setRecipient(e.target.value)} style={{ width: '100%', padding: '16px', margin: '15px 0', background: '#001133', border: '2px solid gold', color: 'white', borderRadius: '12px' }} />
          <input placeholder="Amount in XRP" value={sendAmount} onChange={e => setSendAmount(e.target.value)} style={{ width: '100%', padding: '16px', margin: '15px 0', background: '#001133', border: '2px solid gold', color: 'white', borderRadius: '12px' }} />
          <motion.button whileTap={{ scale: 0.95 }} onClick={sendXRP} style={{ width: '100%', background: GOLD, color: ROYAL_BLUE, padding: '20px', fontSize: '1.8rem', fontWeight: 'bold', border: 'none', borderRadius: '15px', marginTop: '30px' }}>
            SEND XRP
          </motion.button>
          <p style={{ marginTop: '30px', textAlign: 'center', fontSize: '1.4rem' }}>{txStatus}</p>
        </div>
      )}

               {/* HISTORY — FINAL, TESTED, BEAUTIFUL & WORKING */}
      {activeTab === 'History' && (
        <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ color: GOLD, textAlign: 'center', fontSize: '3.5rem', marginBottom: '40px' }}>
            TRANSACTION HISTORY
          </h2>

          {transactions.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#888', fontSize: '1.4rem' }}>
              No transactions yet
            </p>
          ) : (
            transactions
              .filter(item => {
                const tx = item?.tx;
                if (!tx || tx.TransactionType !== 'Payment') return false;
                const amount = tx.Amount || item.meta?.DeliveredAmount;
                if (!amount) return false;
                if (typeof amount === 'string') return parseFloat(xrpl.dropsToXrp(amount)) > 0;
                if (amount.value) return parseFloat(amount.value) > 0;
                return false;
              })
              .map((item, i) => {
                const tx = item.tx;
                const meta = item.meta;
                const isSent = tx.Account === wallet.classicAddress;

                const rawAmount = isSent ? tx.Amount : (meta?.DeliveredAmount || tx.Amount);
                let amountStr = '0 XRP';
                if (typeof rawAmount === 'string') {
                  amountStr = parseFloat(xrpl.dropsToXrp(rawAmount)).toFixed(6) + ' XRP';
                } else if (rawAmount?.value) {
                  amountStr = `${parseFloat(rawAmount.value).toFixed(6)} ${rawAmount.currency}`;
                }

                const counterparty = isSent ? tx.Destination : tx.Account;
                const hash = item.hash;
                const date = new Date((item.date || Date.now() / 1000) * 1000).toLocaleString();

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: '#001133',
                      borderRadius: '20px',
                      margin: '15px 0',
                      border: '2px solid #333',
                      overflow: 'hidden',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.4)'
                    }}
                  >
                    <div
                      style={{
                        padding: '22px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: isSent ? 'rgba(255,51,102,0.12)' : 'rgba(0,255,153,0.12)'
                      }}
                      onClick={() => {
                        const el = document.getElementById(`detail-${i}`);
                        el.style.display = el.style.display === 'block' ? 'none' : 'block';
                      }}
                    >
                      <div>
                        <strong style={{ color: isSent ? '#ff3366' : '#00ff99', fontSize: '1.8rem' }}>
                          {isSent ? 'SENT' : 'RECEIVED'} {amountStr}
                        </strong>
                        <br />
                        <span style={{ color: '#ccc', fontSize: '1.1rem' }}>
                          {isSent ? 'To' : 'From'}: {counterparty.slice(0,12)}...{counterparty.slice(-8)}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: GOLD, fontSize: '1.3rem', fontWeight: 'bold' }}>{date}</div>
                        <div style={{ color: '#888', fontSize: '0.9rem' }}>Click for details ↓</div>
                      </div>
                    </div>

                    <div id={`detail-${i}`} style={{ display: 'none', padding: '20px', background: '#000822', borderTop: '1px solid #444' }}>
                      <p><strong>Hash:</strong><br />
                        <a href={`https://testnet.xrpl.org/transactions/${hash}`} target="_blank" rel="noopener noreferrer" style={{ color: GOLD }}>
                          {hash}
                        </a>
                      </p>
                      <p><strong>Full Amount:</strong> {amountStr}</p>
                      <p><strong>{isSent ? 'Recipient' : 'Sender'}:</strong> {counterparty}</p>
                    </div>
                  </motion.div>
                );
              })
          )}
        </div>
      )}

      {/* Placeholder tabs */}
      {['RWA', 'NFT', 'BUY/SELL Crypto', 'NEWS'].includes(activeTab) && (
        <div style={{ padding: '100px', textAlign: 'center', fontSize: '2.5rem', color: GOLD }}>
          {activeTab} — Coming Soon
        </div>
      )}
    </div>
  );
};

export default XRPZipWallet;