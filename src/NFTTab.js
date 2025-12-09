import React, { useState } from "react";
import { motion } from "framer-motion";
import * as xrpl from "xrpl";

export default function NFTTab() {
  const [nftFile, setNftFile] = useState(null);
  const [nftName, setNftName] = useState("");
  const [nftDescription, setNftDescription] = useState("");
  const [mintStatus, setMintStatus] = useState("");
  const [myNfts, setMyNfts] = useState([]);
  const [loading, setLoading] = useState(false);

  async function viewMyNFTs() {
    try {
      setLoading(true);
      setMintStatus("Fetching your NFTs...");
      const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
      await client.connect();

      const wallet = xrpl.Wallet.fromSeed("sEdTZKvtWSHNYHcfiLm5ZE4LPYrrfJ2");

      const response = await client.request({
        command: "account_nfts",
        account: wallet.classicAddress
      });

      setMyNfts(response.result.account_nfts);
      setMintStatus(`Found ${response.result.account_nfts.length} NFTs`);
      await client.disconnect();
    } catch (err) {
      console.error(err);
      setMintStatus("Error fetching NFTs");
    } finally {
      setLoading(false);
    }
  }

  async function mintNFT() {
    try {
      setLoading(true);
      setMintStatus("Connecting to XRPL Testnet...");
      const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
      await client.connect();

      const wallet = xrpl.Wallet.fromSeed("sEdTZKvtWSHNYHcfiLm5ZE4LPYrrfJ2");

      setMintStatus("Preparing NFT mint transaction...");

      const imageUrl = `https://www.tommylkerr.com/images/${nftFile?.name || "placeholder.jpg"}`;

      const uri = xrpl.convertStringToHex(
        JSON.stringify({
          name: nftName,
          description: nftDescription,
          image: imageUrl
        })
      );

      const tx = {
        TransactionType: "NFTokenMint",
        Account: wallet.classicAddress,
        URI: uri,
        Flags: 8,
        NFTokenTaxon: 0
      };

      const result = await client.submitAndWait(tx, { wallet });
      setMintStatus(`NFT minted! Transaction hash: ${result.result.hash}`);

      // Auto-refresh NFT list after minting
      await viewMyNFTs();

      await client.disconnect();
    } catch (err) {
      console.error(err);
      setMintStatus("Error minting NFT");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "40px", maxWidth: "700px", margin: "0 auto" }}>
      <h2 style={{ color: "gold", textAlign: "center", fontSize: "3.5rem" }}>NFTs</h2>

      {/* Inputs for file, name, description */}
      <input
        type="file"
        accept="image/*"
        onChange={e => setNftFile(e.target.files[0])}
      />
      <input
        placeholder="NFT Name"
        value={nftName}
        onChange={e => setNftName(e.target.value)}
      />
      <textarea
        placeholder="NFT Description"
        value={nftDescription}
        onChange={e => setNftDescription(e.target.value)}
      />

      {/* Buttons side by side */}
      <div style={{ marginTop: "20px" }}>
        <motion.button whileTap={{ scale: 0.95 }} onClick={mintNFT}>
          Mint NFT
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={viewMyNFTs}
          style={{ marginLeft: "10px" }}
        >
          View My NFTs
        </motion.button>
      </div>

      {/* Status message */}
      <p style={{ marginTop: "20px", color: "white" }}>{mintStatus}</p>

      {/* Spinner shows while loading */}
      {loading && (
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <div
            style={{
              border: "4px solid #f3f3f3",
              borderTop: "4px solid gold",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              animation: "spin 1s linear infinite",
              margin: "0 auto"
            }}
          />
          <p style={{ color: "white" }}>Loading...</p>
        </div>
      )}

      {/* NFT list */}
      <div style={{ marginTop: "20px" }}>
        {myNfts.map((nft, index) => {
          let metadata = {};
          try {
            metadata = JSON.parse(xrpl.convertHexToString(nft.URI));
          } catch (e) {
            console.error("Failed to parse NFT metadata", e);
          }

          return (
            <div
              key={index}
              style={{
                marginBottom: "20px",
                border: "1px solid gold",
                padding: "10px"
              }}
            >
              <h3 style={{ color: "gold" }}>{metadata.name || "Unnamed NFT"}</h3>
              <p style={{ color: "white" }}>
                {metadata.description || "No description"}
              </p>
              {metadata.image && (
                <img
                  src={metadata.image}
                  alt={metadata.name}
                  style={{ maxWidth: "200px", border: "1px solid white" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}