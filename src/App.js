import React, { useState, useEffect, useRef } from 'react';
import * as xrpl from 'xrpl';
import { motion } from 'framer-motion';
import Chart from 'chart.js/auto';
import { QRCodeCanvas } from 'qrcode.react';
import TransactionHistory from "./TransactionHistory";

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

  // Live XRP price
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd');
        const data = await res.json();
        setXrpPrice(data.ripple.usd);
      } catch (e) { }
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, []);

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
    const res = await client.request({ command: 'account_tx', account: addr, limit: 20 });
    console.log("Fetched transactions:", res.result.transactions); // 👈 added log
    setTransactions(res.result.transactions || []);
  } catch (err) {
    console.error("Error fetching transactions:", err);
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
    return () => chartRef.current?.destroy();
  }, [wallet]);

  if (!wallet) {
    return (
      <div style={{ background: ROYAL_BLUE, color: 'white', minHeight: '100vh', textAlign: 'center', paddingTop: '10%' }}>
        <h1 style={{ fontSize: '7rem', color: GOLD }}>XRPZip</h1>
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
        <p style={{ fontSize: '2.5rem' }}>
          Balance: <strong style={{ color: GOLD }}>{balance.toFixed(6)} XRP</strong>
        </p>
        <p style={{ fontSize: '2rem' }}>≈ ${(balance * xrpPrice).toFixed(2)} USD</p>
        <canvas id="zipMeter" width="300" height="160"></canvas>
      </div>
    )}

    {activeTab === 'Receive' && (
      <div style={{ padding: '80px', textAlign: 'center' }}>
        <h2 style={{ color: GOLD, fontSize: '3.5rem' }}>RECEIVE XRP</h2>
        <QRCodeCanvas value={wallet.classicAddress} size={240} bgColor="#000" fgColor="#fff" />
        <p style={{ margin: '40px 0', wordBreak: 'break-all', fontSize: '1.4rem' }}>{wallet.classicAddress}</p>
        <button
          onClick={() => copy(wallet.classicAddress)}
          style={{ background: GOLD, color: ROYAL_BLUE, padding: '15px 40px' }}
        >
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

    {/* HISTORY TAB */}
    <TransactionHistory
  activeTab={activeTab}
  transactions={transactions}
  wallet={wallet}
  xrpPrice={xrpPrice}
/>
  </div>
);
} // closes XRPZipWallet

export default XRPZipWallet;