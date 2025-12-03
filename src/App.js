import React, { useState, useEffect, useRef } from 'react';
import * as xrpl from 'xrpl';
import { motion } from 'framer-motion';
import Chart from 'chart.js/auto';
import { QRCodeCanvas } from 'qrcode.react';

const XRPZipWallet = () => {
  const [hasWallet, setHasWallet] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(0);
  const [xrpPrice, setXrpPrice] = useState(2.17);
  const [txStatus, setTxStatus] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [seedInput, setSeedInput] = useState('');
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [generatedSeed, setGeneratedSeed] = useState('');

  const chartRef = useRef(null);
  const clientRef = useRef(null);

  const ROYAL_BLUE = '#002366';
  const GOLD = '#FFD700';

  // Load wallet on first visit
  useEffect(() => {
    const stored = localStorage.getItem('xrpzip-wallet');
    if (stored) {
      const w = JSON.parse(stored);
      setWallet(w);
      setHasWallet(true);
      getBalance(w.classicAddress);
    }
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

  const generateWallet = () => {
    const w = xrpl.Wallet.generate();
    setWallet(w);
    localStorage.setItem('xrpzip-wallet', JSON.stringify(w));
    setGeneratedSeed(w.seed);
    setShowSeedModal(true);
    setHasWallet(true);
  };

  const importWallet = () => {
    if (!seedInput.trim()) return alert('Enter seed');
    try {
      const w = xrpl.Wallet.fromSeed(seedInput.trim());
      setWallet(w);
      localStorage.setItem('xrpzip-wallet', JSON.stringify(w));
      setSeedInput('');
      setHasWallet(true);
      getBalance(w.classicAddress);
    } catch (e) {
      alert('Invalid seed');
    }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setTxStatus('Copied!');
  };

  // ──────── LANDING PAGE (first visit) ────────
  if (!hasWallet) {
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

  // ──────── SEED BACKUP MODAL ────────
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

  // ──────── MAIN WALLET UI (after wallet exists) ────────
  return (
    <div style={{ background: ROYAL_BLUE, color: 'white', minHeight: '100vh', fontFamily: 'Arial' }}>
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ color: GOLD, fontSize: '4rem' }}>XRPZip</h1>
        <p>Balance: {balance.toFixed(6)} XRP</p>
        <p>≈ ${(balance * xrpPrice).toFixed(2)} USD</p>
        <button onClick={() => getBalance(wallet.classicAddress)}>Refresh Balance</button>
        {/* Add your Send, Receive, History tabs here later */}
      </div>
    </div>
  );
};

export default XRPZipWallet;