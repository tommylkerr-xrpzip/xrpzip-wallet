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
  const [firstVisit, setFirstVisit] = useState(true);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [generatedSeed, setGeneratedSeed] = useState('');

  const chartRef = useRef(null);
  const clientRef = useRef(null);

  const ROYAL_BLUE = '#002366';
  const GOLD = '#FFD700';

  // Load wallet & first visit
  useEffect(() => {
    const stored = localStorage.getItem('xrpzip-wallet');
    const visited = localStorage.getItem('xrpzip-visited');
    if (stored) {
      const w = JSON.parse(stored);
      setWallet(w);
      getBalance(w.classicAddress);
      getTransactions(w.classicAddress);
    }
    if (visited) setFirstVisit(false);
  }, []);

  // Save wallet
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
      const res = await client.request({ command: 'account_tx', account: addr, limit: 10 });
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
    setFirstVisit(false);
    localStorage.setItem('xrpzip-visited', 'true');
  };

  const importWallet = () => {
    if (!seedInput.trim()) return alert('Enter seed');
    try {
      const w = xrpl.Wallet.fromSeed(seedInput.trim());
      setWallet(w);
      localStorage.setItem('xrpzip-wallet', JSON.stringify(w));
      setSeedInput('');
      setFirstVisit(false);
      localStorage.setItem('xrpzip-visited', 'true');
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
    if (!wallet || !sendAmount || !recipient) {
      setTxStatus('Fill all fields');
      return;
    }

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

      const duration = (Date.now() - performance.now()) / 1000;
      setTxStatus(`Success! Sent ${sendAmount} XRP in ${duration.toFixed(2)}s`);

      if (chartRef.current) {
        chartRef.current.data.datasets[0].data = [duration, 5 - duration];
        chartRef.current.update();
      }

      getBalance(wallet.classicAddress);
      getTransactions(wallet.classicAddress);
    } catch (err) {
      setTxStatus('Failed: ' + (err.message || 'Check recipient'));
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

  // FIRST VISIT — BEAUTIFUL LANDING PAGE
  if (firstVisit && !wallet) {
    return (
      <div style={{ background: ROYAL_BLUE, color: 'white', minHeight: '100vh', textAlign: 'center', paddingTop: '10%' }}>
        <motion.h1 style={{ fontSize: '7rem', color: GOLD, marginBottom: '40px' }}>
          XRPZip
        </motion.h1>

        <p style={{ fontSize: '2.2rem', maxWidth: '900px', margin: '0 auto 50px', lineHeight: 1.6 }}>
          The fastest, most beautiful XRPL wallet.<br />
          Send XRP in under 5 seconds • Own NFTs • Trade real-world assets
        </p>

        <button
          onClick={generateWallet}
          style={{ background: GOLD, color: ROYAL_BLUE, padding: '20px 60px', fontSize: '2rem', borderRadius: '20px', margin: '20px', fontWeight: 'bold' }}
        >
          Create Your Wallet
        </button>

        <div style={{ marginTop: '60px' }}>
          <p style={{ fontSize: '1.5rem', color: '#ccc' }}>Already have a wallet?</p>
          <input
            style={{ width: '500px', padding: '15px', margin: '20px', fontSize: '1.3rem', borderRadius: '12px', border: `2px solid ${GOLD}` }}
            placeholder="Paste your seed phrase to import"
            value={seedInput}
            onChange={e => setSeedInput(e.target.value)}
          />
          <br />
          <button
            onClick={importWallet}
            style={{ background: 'transparent', color: GOLD, padding: '15px 40px', fontSize: '1.5rem', border: `3px solid ${GOLD}`, borderRadius: '15px' }}
          >
            Import Wallet
          </button>
        </div>
      </div>
    );
  }

  // SEED BACKUP MODAL
  if (showSeedModal) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          style={{ background: ROYAL_BLUE, padding: '60px', borderRadius: '30px', border: `6px solid ${GOLD}`, maxWidth: '700px', textAlign: 'center' }}
        >
          <h2 style={{ color: GOLD, fontSize: '3rem', marginBottom: '30px' }}>Wallet Created!</h2>
          <p style={{ color: '#ff4444', fontSize: '1.8rem', marginBottom: '30px' }}>
            BACKUP YOUR SEED PHRASE NOW
          </p>
          <div style={{ background: '#001133', padding: '25px', borderRadius: '15px', margin: '30px 0', fontSize: '1.5rem', wordBreak: 'break-all', display: 'block' }}>
            {generatedSeed}
          </div>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <button
              onClick={() => copy(generatedSeed)}
              style={{ background: GOLD, color: ROYAL_BLUE, padding: '15px 30px', borderRadius: '12px', fontWeight: 'bold' }}
            >
              Copy Seed
            </button>
            <button
              onClick={() => setShowSeedModal(false)}
              style={{ background: 'transparent', color: 'white', padding: '15px 30px', border: `3px solid ${GOLD}`, borderRadius: '12px' }}
            >
              I’ve Saved It
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // MAIN WALLET (all tabs)
  return (
    <div style={{ background: ROYAL_BLUE, color: 'white', minHeight: '100vh', fontFamily: 'Arial' }}>
      {/* Tab Bar */}
      <div style={{ background: '#001133', padding: '15px 0', textAlign: 'center', borderBottom: `4px solid ${GOLD}` }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? GOLD : 'transparent',
              color: activeTab === tab ? ROYAL_BLUE : 'white',
              border: `2px solid ${GOLD}`,
              padding: '12px 20px',
              margin: '0 8px',
              fontWeight: 'bold',
              borderRadius: '10px',
              fontSize: '1.1rem'
            }}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {activeTab === 'Dashboard' && (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <motion.h1 style={{ fontSize: '6rem', color: GOLD }}>XRPZip</motion.h1>
          <p style={{ fontSize: '2.5rem' }}>Balance: <strong style={{ color: GOLD }}>{balance.toFixed(6)} XRP</strong></p>
          <p style={{ fontSize: '2rem' }}>≈ ${(balance * xrpPrice).toFixed(2)} USD</p>
          <canvas id="zipMeter" width="300" height="160"></canvas>
        </div>
      )}

      {/* Other tabs remain the same as before */}
      {activeTab === 'Send' && (/* your full Send tab code */)}
      {activeTab === 'Receive' && (/* your full Receive tab code */)}
      {/* etc. */}
    </div>
  );
};

export default XRPZipWallet;