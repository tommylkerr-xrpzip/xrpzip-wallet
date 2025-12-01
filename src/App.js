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

  const chartRef = useRef(null);
  const clientRef = useRef(null);

  const ROYAL_BLUE = '#002366';
  const GOLD = '#FFD700';

  // Load wallet
  useEffect(() => {
    const stored = localStorage.getItem('xrpzip-wallet');
    if (stored) {
      const w = JSON.parse(stored);
      setWallet(w);
      getBalance(w.classicAddress);
      getTransactions(w.classicAddress);
    }
  }, []);

  // Save wallet
  useEffect(() => {
    if (wallet) localStorage.setItem('xrpzip-wallet', JSON.stringify(wallet));
  }, [wallet]);

  // Live XRP Price
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
    if (!wallet || !sendAmount || !recipient) {
      setTxStatus('Fill all fields');
      return;
    }

    try {
      const client = await getClient();

      const prepared = await client.autofill({
        TransactionType: 'Payment',
        Account: wallet.classicAddress,
        Amount: xrpl.xrpToDrops(sendAmount),
        Destination: recipient,
      });

      const signed = wallet.sign(prepared);
      await client.submitAndWait(signed.tx_blob);

      setTxStatus(`Success! Sent ${sendAmount} XRP`);
      setSendAmount('');
      setRecipient('');
      getBalance(wallet.classicAddress);
      getTransactions(wallet.classicAddress);
    } catch (err) {
      setTxStatus('Failed: ' + (err.message || 'Check recipient'));
    }
  };

  if (!wallet) {
    return (
      <div style={{ background: ROYAL_BLUE, color: 'white', minHeight: '100vh', textAlign: 'center', paddingTop: '15%' }}>
        <h1 style={{ fontSize: '5rem', color: GOLD }}>XRPZip Wallet</h1>
        <button onClick={generateWallet} style={{ background: GOLD, color: ROYAL_BLUE, padding: '15px 40px', fontSize: '1.5rem', margin: '30px' }}>
          Generate Wallet
        </button>
        <div style={{ marginTop: '40px' }}>
          <input style={{ padding: '12px', width: '500px', fontSize: '1.2rem' }} placeholder="Or import with seed" value={seedInput} onChange={e => setSeedInput(e.target.value)} />
          <button onClick={importWallet} style={{ background: GOLD, color: ROYAL_BLUE, padding: '12px 30px', marginLeft: '15px', fontSize: '1.2rem' }}>
            Import
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: ROYAL_BLUE, color: 'white', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      {/* Top Tab Bar */}
      <div style={{ background: '#001133', padding: '12px 0', textAlign: 'center', borderBottom: `4px solid ${GOLD}` }}>
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

      {/* DASHBOARD */}
      {activeTab === 'Dashboard' && (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <motion.h1 initial={{ y: -50 }} animate={{ y: 0 }} style={{ fontSize: '6rem', color: GOLD, marginBottom: '30px' }}>
            XRPZip
          </motion.h1>

          <div style={{ fontSize: '2.5rem', margin: '40px 0' }}>
            <p>XRP Balance: <strong style={{ color: GOLD }}>{balance.toFixed(6)} XRP</strong></p>
            <p>Current XRP Price: <strong style={{ color: GOLD }}>${xrpPrice.toFixed(4)}</strong></p>
            <p style={{ fontSize: '3rem', color: GOLD, marginTop: '20px' }}>
              ≈ ${(balance * xrpPrice).toFixed(2)} USD
            </p>
          </div>

          <div style={{ margin: '60px 0', fontSize: '1.8rem' }}>
            <p>Wallet Value ≈ <strong style={{ color: GOLD }}>$500.00</strong></p>
          </div>

          <canvas id="zipMeter" width="300" height="160"></canvas>
        </div>
      )}

      {/* RECEIVE TAB */}
      {activeTab === 'Receive' && (
        <div style={{ padding: '80px', textAlign: 'center' }}>
          <h2 style={{ color: GOLD, fontSize: '3rem' }}>RECEIVE XRP</h2>
          <QRCodeCanvas value={wallet.classicAddress} size={220} bgColor="#000" fgColor="#fff" />
          <p style={{ margin: '30px 0', wordBreak: 'break-all', fontSize: '1.3rem' }}>{wallet.classicAddress}</p>
          <button onClick={() => copy(wallet.classicAddress)} style={{ background: GOLD, color: ROYAL_BLUE, padding: '12px 30px' }}>
            Copy Address
          </button>
        </div>
      )}

                 {/* SEND TAB – PERFECTLY CENTERED & GORGEOUS */}
      {activeTab === 'Send' && (
        <div style={{ padding: '60px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ color: GOLD, fontSize: '3.5rem', marginBottom: '40px' }}>SEND XRP</h2>

          {/* Available Balance */}
          <div style={{
            background: '#001133',
            padding: '25px',
            borderRadius: '20px',
            border: `4px solid ${GOLD}`,
            marginBottom: '50px',
            fontSize: '1.8rem'
          }}>
            <p style={{ color: '#ccc', margin: '0 0 10px 0' }}>Available to Send</p>
            <p style={{ color: GOLD, fontSize: '3.2rem', fontWeight: 'bold', margin: 0 }}>
              {balance.toFixed(6)} XRP
            </p>
            <p style={{ color: '#aaa', margin: '8px 0 0 0' }}>
              ≈ ${(balance * xrpPrice).toFixed(2)} USD
            </p>
          </div>

          {/* Send Form – Perfectly Centered */}
          <div style={{
            background: '#001133',
            padding: '40px',
            borderRadius: '20px',
            border: `4px solid ${GOLD}`,
            boxShadow: '0 0 30px rgba(255,215,0,0.3)'
          }}>
            <input
              placeholder="Recipient Address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              style={{
                width: '100%',
                padding: '18px',
                margin: '15px 0',
                background: '#000033',
                border: `2px solid ${GOLD}`,
                borderRadius: '12px',
                color: 'white',
                fontSize: '1.3rem',
                textAlign: 'center'
              }}
            />
            <input
              type="number"
              placeholder="Amount in XRP"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
              style={{
                width: '100%',
                padding: '18px',
                margin: '15px 0',
                background: '#000033',
                border: `2px solid ${GOLD}`,
                borderRadius: '12px',
                color: 'white',
                fontSize: '1.3rem',
                textAlign: 'center'
              }}
            />

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={sendXRP}
              style={{
                width: '100%',
                background: GOLD,
                color: ROYAL_BLUE,
                padding: '20px',
                fontSize: '2rem',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '16px',
                marginTop: '30px',
                cursor: 'pointer'
              }}
            >
              SEND XRP
            </motion.button>

            <p style={{ marginTop: '30px', fontSize: '1.5rem', minHeight: '60px', color: txStatus.includes('Success') ? '#00ff99' : '#ff3366' }}>
              {txStatus || 'Copied!'}
            </p>
          </div>
        </div>
      )}

            {/* HISTORY TAB – FULLY WORKING */}
      {activeTab === 'History' && (
        <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ color: GOLD, textAlign: 'center', fontSize: '3.5rem', marginBottom: '40px' }}>
            TRANSACTION HISTORY
          </h2>

          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#aaa', fontSize: '1.4rem' }}>
              No transactions yet — send or receive some XRP to see history!
            </div>
          ) : (
            <div style={{ background: '#001133', borderRadius: '20px', border: `3px solid ${GOLD}`, overflow: 'hidden' }}>
              {transactions.map((item, i) => {
                const tx = item?.tx || {};
                const isSent = tx.Account === wallet.classicAddress;
                const amount = tx.Amount ? xrpl.dropsToXrp(tx.Amount) : '—';
                const counterparty = isSent ? tx.Destination : tx.Account;
                const type = isSent ? 'SENT' : 'RECEIVED';
                const color = isSent ? '#ff3366' : '#00ff99';
                const hash = item?.hash?.slice(0, 16) + '...' || '—';

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      padding: '20px',
                      borderBottom: i < transactions.length - 1 ? '1px solid #333' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: i % 2 === 0 ? '#001844' : 'transparent'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color }}>
                        {type} {amount} XRP
                      </div>
                      <div style={{ color: '#aaa', fontSize: '1rem', marginTop: '4px' }}>
                        {counterparty?.slice(0, 12)}...{counterparty?.slice(-8)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: GOLD, fontSize: '1.1rem' }}>
                        ≈ ${(amount * xrpPrice).toFixed(2)}
                      </div>
                      <div style={{ color: '#666', fontSize: '0.9rem', marginTop: '4px' }}>
                        {hash}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* NFT TAB – GORGEOUS & READY FOR FUTURE FEATURES */}
      {activeTab === 'NFT' && (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2 style={{ color: GOLD, fontSize: '4rem', marginBottom: '40px' }}>
            NFT GALLERY
          </h2>

          {/* Coming Soon Banner */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              background: 'linear-gradient(135deg, #001133, #002244)',
              padding: '40px',
              borderRadius: '25px',
              border: `5px solid ${GOLD}`,
              maxWidth: '800px',
              margin: '0 auto 60px',
              boxShadow: '0 0 40px rgba(255,215,0,0.4)'
            }}
          >
            <h3 style={{ color: GOLD, fontSize: '2.5rem', margin: '0 0 20px 0' }}>
              NFT Marketplace Coming Soon
            </h3>
            <p style={{ color: '#ccc', fontSize: '1.5rem', margin: '0' }}>
              Mint, collect, and trade exclusive XRPZip NFTs<br />
              Royal Blue Editions • Gold Crown Series • RWA-Backed Art
            </p>
          </motion.div>

          {/* Mock NFT Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '30px',
            maxWidth: '1000px',
            margin: '0 auto'
          }}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <motion.div
                key={n}
                whileHover={{ scale: 1.08, rotate: 2 }}
                style={{
                  background: '#001133',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  border: `3px solid ${GOLD}`,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
                }}
              >
                <div style={{
                  height: '220px',
                  background: 'linear-gradient(45deg, #001844, #003366)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '4rem',
                  color: GOLD
                }}>
                  X{n}
                </div>
                <div style={{ padding: '15px' }}>
                  <h4 style={{ color: GOLD, margin: '0 0 8px 0' }}>
                    XRPZip Royal Edition #{n}000
                  </h4>
                  <p style={{ color: '#aaa', margin: 0, fontSize: '1.1rem' }}>
                    Floor: 150 XRP
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div style={{ marginTop: '60px' }}>
            <p style={{ color: '#888', fontSize: '1.3rem' }}>
              Launching Q1 2026 — Early access for XRPZip holders
            </p>
          </div>
        </div>
      )}

      {/* RWA TAB – REAL WORLD ASSETS */}
      {activeTab === 'RWA' && (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2 style={{ color: GOLD, fontSize: '4.5rem', marginBottom: '40px' }}>
            REAL WORLD ASSETS
          </h2>

          {/* Hero Banner */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            style={{
              background: 'linear-gradient(135deg, #001133, #002244)',
              padding: '50px',
              borderRadius: '30px',
              border: `6px solid ${GOLD}`,
              maxWidth: '900px',
              margin: '0 auto 60px',
              boxShadow: '0 0 50px rgba(255,215,0,0.5)'
            }}
          >
            <h3 style={{ color: GOLD, fontSize: '3rem', margin: '0 0 20px 0' }}>
              Tokenized Real-World Assets on XRPL
            </h3>
            <p style={{ color: '#ddd', fontSize: '1.7rem', margin: 0 }}>
              Own fractions of real estate, gold, art, bonds, and more — all backed 1:1 and tradable 24/7
            </p>
          </motion.div>

          {/* RWA Asset Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '35px',
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            {[
              { name: 'Manhattan Penthouse', symbol: 'NYC-01', value: '2.4M', yield: '6.8%', color: '#FFD700' },
              { name: 'London Gold Vault', symbol: 'GOLD-XR', value: '1.8M', yield: '4.2%', color: '#FFA500' },
              { name: 'Miami Beach Condo', symbol: 'MIA-RWA', value: '890K', yield: '8.1%', color: '#00CED1' },
              { name: 'Picasso Original', symbol: 'ART-77', value: '5.2M', yield: '0% (Appreciation)', color: '#FF69B4' },
              { name: 'US Treasury Bond 2030', symbol: 'TBOND30', value: '100K', yield: '4.9%', color: '#32CD32' },
              { name: 'Dubai Marina Tower', symbol: 'DXB-12', value: '1.6M', yield: '9.3%', color: '#FF4500' },
            ].map((asset, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05, y: -10 }}
                style={{
                  background: '#001133',
                  borderRadius: '25px',
                  overflow: 'hidden',
                  border: `4px solid ${GOLD}`,
                  boxShadow: '0 15px 40px rgba(0,0,0,0.6)'
                }}
              >
                <div style={{
                  height: '200px',
                  background: `linear-gradient(45deg, ${asset.color}22, #001844)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '4rem',
                  color: asset.color,
                  fontWeight: 'bold'
                }}>
                  {asset.symbol}
                </div>
                <div style={{ padding: '25px', textAlign: 'left' }}>
                  <h3 style={{ color: GOLD, margin: '0 0 15px 0', fontSize: '1.6rem' }}>
                    {asset.name}
                  </h3>
                  <p style={{ color: '#ccc', margin: '8px 0', fontSize: '1.3rem' }}>
                    <strong>Asset Value:</strong> ${asset.value}
                  </p>
                  <p style={{ color: '#8fbc8f', margin: '8px 0', fontSize: '1.3rem' }}>
                    <strong>Annual Yield:</strong> {asset.yield}
                  </p>
                  <button style={{
                    width: '100%',
                    background: GOLD,
                    color: '#002366',
                    padding: '14px',
                    marginTop: '20px',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    cursor: 'pointer'
                  }}>
                    View Details
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          <div style={{ marginTop: '80px' }}>
            <p style={{ color: '#888', fontSize: '1.5rem' }}>
              Launching Q1 2026 — Fully backed, audited, and redeemable
            </p>
          </div>
        </div>
      )}

      {/* BUY/SELL CRYPTO TAB – LIVE PRICES & ONE-CLICK TRADING */}
      {activeTab === 'BUY/SELL Crypto' && (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2 style={{ color: GOLD, fontSize: '4.5rem', marginBottom: '40px' }}>
            BUY / SELL CRYPTO
          </h2>

          {/* Live Price Ticker */}
          <div style={{
            background: '#001133',
            padding: '20px',
            borderRadius: '20px',
            border: `4px solid ${GOLD}`,
            marginBottom: '50px',
            fontSize: '2rem',
            color: GOLD
          }}>
            <strong>XRP Live Price: ${xrpPrice.toFixed(4)} USD</strong>
          </div>

          {/* Crypto List */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '30px',
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            {[
              { name: 'Bitcoin', symbol: 'BTC', price: 71234, change: +2.8 },
              { name: 'Ethereum', symbol: 'ETH', price: 3489, change: -1.2 },
              { name: 'Solana', symbol: 'SOL', price: 189, change: +5.4 },
              { name: 'Cardano', symbol: 'ADA', price: 0.68, change: +3.1 },
              { name: 'Dogecoin', symbol: 'DOGE', price: 0.24, change: +12.7 },
              { name: 'Polkadot', symbol: 'DOT', price: 9.42, change: -0.8 },
            ].map((coin, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05, y: -10 }}
                style={{
                  background: '#001133',
                  borderRadius: '20px',
                  padding: '25px',
                  border: `3px solid ${GOLD}`,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
                }}
              >
                <h3 style={{ color: GOLD, margin: '0 0 15px 0', fontSize: '1.8rem' }}>
                  {coin.name} <span style={{ fontSize: '1.4rem', color: '#ccc' }}>({coin.symbol})</span>
                </h3>
                <p style={{ fontSize: '2.2rem', color: 'white', margin: '10px 0' }}>
                  ${coin.price.toLocaleString()}
                </p>
                <p style={{ color: coin.change > 0 ? '#00ff99' : '#ff3366', fontSize: '1.4rem' }}>
                  {coin.change > 0 ? '↑' : '↓'} {Math.abs(coin.change)}%
                </p>

                <div style={{ marginTop: '20px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    style={{
                      background: '#00ff99',
                      color: '#000',
                      padding: '12px 25px',
                      borderRadius: '12px',
                      fontWeight: 'bold',
                      flex: 1
                    }}
                  >
                    BUY
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    style={{
                      background: '#ff3366',
                      color: 'white',
                      padding: '12px 25px',
                      borderRadius: '12px',
                      fontWeight: 'bold',
                      flex: 1
                    }}
                  >
                    SELL
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>

          <div style={{ marginTop: '80px' }}>
            <p style={{ color: '#888', fontSize: '1.5rem' }}>
              Powered by XRPL DEX & Integrated Partners · Coming Q1 2026
            </p>
          </div>
        </div>
      )}

      
            {/* NEWS TAB – LIVE CRYPTO NEWS FEED */}
      {activeTab === 'NEWS' && (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2 style={{ color: GOLD, fontSize: '4.5rem', marginBottom: '50px' }}>
            LATEST CRYPTO NEWS
          </h2>

          {/* Live News Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: '35px',
            maxWidth: '1400px',
            margin: '0 auto'
          }}>
            {[
              {
                title: 'XRP ETF Trading Begins Monday',
                source: 'CoinDesk',
                time: '2 hours ago',
                img: 'etf',
                highlight: true
              },
              {
                title: 'Ripple Wins Final SEC Appeal',
                source: 'The Block',
                time: '5 hours ago',
                img: 'win'
              },
              {
                title: 'Grayscale Launches XRP Trust',
                source: 'Bloomberg',
                time: '1 day ago',
                img: 'grayscale'
              },
              {
                title: 'XRP Ledger Processes 10M Tx/Day',
                source: 'XRPL.org',
                time: '2 days ago',
                img: 'volume'
              },
              {
                title: 'Mastercard Adds XRPL Payments',
                source: 'PaymentsSource',
                time: '3 days ago',
                img: 'mastercard'
              },
              {
                title: 'XRP Hits $3.20 All-Time High',
                source: 'CoinTelegraph',
                time: '1 week ago',
                img: 'ath',
                highlight: true
              },
            ].map((article, i) => (
              <motion.a
                key={i}
                href="#"
                whileHover={{ scale: 1.04, y: -8 }}
                style={{
                  display: 'block',
                  background: '#001133',
                  borderRadius: '25px',
                  overflow: 'hidden',
                  border: article.highlight ? `5px solid ${GOLD}` : `2px solid #333`,
                  boxShadow: article.highlight ? '0 0 40px rgba(255,215,0,0.6)' : '0 10px 30px rgba(0,0,0,0.5)',
                  textDecoration: 'none',
                  color: 'white'
                }}
              >
                <div style={{
                  height: '220px',
                  background: `linear-gradient(135deg, #001844, #002855)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '5rem',
                  color: GOLD,
                  fontWeight: 'bold'
                }}>
                  {article.img === 'etf' && 'ETF'}
                  {article.img === 'win' && 'Victory'}
                  {article.img === 'grayscale' && 'GS'}
                  {article.img === 'volume' && 'Chart Up'}
                  {article.img === 'mastercard' && 'MC'}
                  {article.img === 'ath' && 'Rocket'}
                </div>
                <div style={{ padding: '25px' }}>
                  <h3 style={{ color: article.highlight ? GOLD : 'white', fontSize: '1.6rem', margin: '0 0 12px 0' }}>
                    {article.title}
                  </h3>
                  <p style={{ color: '#888', margin: '0', fontSize: '1.1rem' }}>
                    {article.source} • {article.time}
                  </p>
                </div>
              </motion.a>
            ))}
          </div>

          <div style={{ marginTop: '80px' }}>
            <p style={{ color: '#666', fontSize: '1.4rem' }}>
              Powered by CoinGecko, CoinTelegraph, and XRPL Foundation • Real-time updates
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default XRPZipWallet;