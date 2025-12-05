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
    if (!clientRef.current) {
      clientRef.current = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
      await clientRef.current.connect();
    }
    return clientRef.current;
  };

  const getBalance = async (addr) => {
    try {
      const client = await getClient();
      const info = await client.request({ command: 'account_info', account: addr, ledger_index: 'validated' });
      setBalance(xrpl.dropsToXrp(info.result.account_data.Balance));
    } catch (err) {
      setBalance(0);
    }
  };

  const getTransactions = async (addr) => {
    try {
      const client = await getClient();
      const res = await client.request({ command: 'account_tx', account: addr, limit: 20 });
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
  }, [wallet]);

  if (!wallet) {
    return (
      <div style={{ background: ROYAL_BLUE, color: 'white', minHeight: '100vh', textAlign: 'center', paddingTop: '10%' }}>
        <h1 style={{ fontSize: '7rem', color: GOLD }}>XRPZip</h1>
        <p style={{ fontSize: '2rem' }}>The fastest, most beautiful XRPL wallet</p>
        <button onClick={generateWallet} style={{ background: GOLD, color: ROYAL_BLUE, padding: '20px 60px', fontSize: '2rem', margin: '20px' }}>
          Create Wallet
        </button>
        <div>
          <input placeholder="Import seed" value={seedInput} onChange={e => setSeedInput(e.target.value)} style={{ width: '500px', padding: '15px' }} />
          <button onClick={importWallet} style={{ background: 'transparent', color: GOLD, padding: '15px 40px', border: '2px solid gold' }}>
            Import
          </button>
        </div>
      </div>
    );
  }

  if (showSeedModal) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <div style={{ background: ROYAL_BLUE, padding: '60px', borderRadius: '30px', border: '6px solid gold', maxWidth: '700px', textAlign: 'center' }}>
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
        </div>
      </div>
    );
  }

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

      {activeTab === 'Dashboard' && (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '6rem', color: GOLD }}>XRPZip</h1>
          <p style={{ fontSize: '2.5rem' }}>Balance: <strong style={{ color: GOLD }}>{balance.toFixed(6)} XRP</strong></p>
          <canvas id="zipMeter" width="300" height="160"></canvas>
        </div>
      )}

      {activeTab === 'Receive' && (
        <div style={{ padding: '80px', textAlign: 'center' }}>
          <h2 style={{ color: GOLD, fontSize: '3.5rem' }}>RECEIVE XRP</h2>
          <QRCodeCanvas value={wallet.classicAddress} size={240} bgColor="#000" fgColor="#fff" />
          <p style={{ margin: '40px 0', wordBreak: 'break-all' }}>{wallet.classicAddress}</p>
          <button onClick={() => copy(wallet.classicAddress)} style={{ background: GOLD, color: ROYAL_BLUE, padding: '15px 40px' }}>
            Copy Address
          </button>
        </div>
      )}

      {activeTab === 'Send' && (
        <div style={{ padding: '60px', maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ color: GOLD, textAlign: 'center', fontSize: '3.5rem' }}>SEND XRP</h2>
          <input placeholder="Recipient" value={recipient} onChange={e => setRecipient(e.target.value)} style={{ width: '100%', padding: '16px', margin: '15px 0', background: '#001133', border: '2px solid gold', color: 'white' }} />
          <input placeholder="Amount" value={sendAmount} onChange={e => setSendAmount(e.target.value)} style={{ width: '100%', padding: '16px', margin: '15px 0', background: '#001133', border: '2px solid gold', color: 'white' }} />
          <button onClick={sendXRP} style={{ width: '100%', background: GOLD, color: ROYAL_BLUE, padding: '20px', fontSize: '1.8rem', marginTop: '30px' }}>
            SEND XRP
          </button>
          <p style={{ marginTop: '20px', textAlign: 'center' }}>{txStatus}</p>
        </div>
      )}

              {/* HISTORY */} 

      {activeTab === 'History' && ( 

  <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}> 

    <h2 style={{ color: GOLD, textAlign: 'center', fontSize: '3.5rem', marginBottom: '40px' }}> 

      TRANSACTION HISTORY 

    </h2> 

 

    {transactions.length === 0 ? ( 

      <p style={{ textAlign: 'center', color: '#888', fontSize: '1.4rem' }}>No transactions yet</p> 

    ) : ( 

      transactions.map((item, i) => { 

        const tx = item?.tx || {}; 

        const meta = item?.meta || {}; 

        const isSent = tx.Account === wallet.classicAddress; 

        const amount = tx.Amount ? (typeof tx.Amount === 'string' ? xrpl.dropsToXrp(tx.Amount) : tx.Amount.value || '0') : '0'; 

        const counterparty = isSent ? tx.Destination : tx.Account; 

        const hash = item.hash; 

        const date = new Date(item.date * 1000 || Date.now()).toLocaleString(); 

 

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

              overflow: 'hidden' 

            }} 

          > 

            {/* Summary Row */} 

            <div 

              style={{ 

                padding: '20px', 

                cursor: 'pointer', 

                display: 'flex', 

                justifyContent: 'space-between', 

                alignItems: 'center', 

                background: isSent ? 'rgba(255,51,102,0.1)' : 'rgba(0,255,153,0.1)' 

              }} 

              onClick={() => { 

                const el = document.getElementById(`detail-${i}`); 

                el.style.display = el.style.display === 'block' ? 'none' : 'block'; 

              }} 

            > 

              <div> 

                <strong style={{ color: isSent ? '#ff3366' : '#00ff99', fontSize: '1.6rem' }}> 

                  {isSent ? 'SENT' : 'RECEIVED'} {parseFloat(amount).toFixed(6)} XRP 

                </strong> 

                <br /> 

                <span style={{ color: '#aaa', fontSize: '1rem' }}> 

                  {isSent ? 'To' : 'From'}: {counterparty?.slice(0, 12)}...{counterparty?.slice(-8)} 

                </span> 

              </div> 

              <div style={{ textAlign: 'right' }}> 

                <div style={{ color: GOLD, fontSize: '1.2rem' }}>{date}</div> 

                <div style={{ color: '#666', fontSize: '0.9rem' }}>Click for details</div> 

              </div> 

            </div> 

 

            {/* Expandable Details */} 

            <div id={`detail-${i}`} style={{ display: 'none', padding: '20px', background: '#000822', borderTop: '1px solid #333' }}> 

              <p><strong>Transaction Hash:</strong><br /> 

                <a href={`https://testnet.xrpl.org/transactions/${hash}`} target="_blank" style={{ color: GOLD }}> 

                  {hash} 

                </a> 

              </p> 

              <p><strong>Full Amount:</strong> {amount} XRP</p> 

              <p><strong>{isSent ? 'Recipient' : 'Sender'}:</strong> {counterparty}</p> 

              <p><strong>Status:</strong> {meta.TransactionResult === 'tesSUCCESS' ? 'Success' : 'Failed'}</p> 

            </div> 

          </motion.div> 

        ); 

      }) 

    )} 

  </div> 

)} 

      {['RWA', 'NFT', 'BUY/SELL Crypto', 'NEWS'].includes(activeTab) && (
        <div style={{ padding: '100px', textAlign: 'center', color: GOLD, fontSize: '3rem' }}>
          {activeTab} — Coming Soon
        </div>
      )}
    </div>
  );
};

export default XRPZipWallet;