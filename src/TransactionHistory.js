import React, { useState } from "react";

export default function TransactionHistory({ activeTab, transactions, wallet, xrpPrice }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (activeTab !== "History") return null;

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      <h2
        style={{
          color: "#FFD700",
          textAlign: "center",
          fontSize: "3.5rem",
          marginBottom: "40px",
        }}
      >
        TRANSACTION HISTORY
      </h2>

      {!transactions || transactions.length === 0 ? (
        <p style={{ textAlign: "center", color: "#888", fontSize: "1.4rem" }}>
          No transactions yet
        </p>
      ) : (
        transactions.map((item, i) => {
          const tx = item.tx_json;
          if (!tx) return null;

          const isSent = wallet && tx.Account === wallet.classicAddress;
          const amountXRP = parseFloat(item.meta?.delivered_amount || tx.Amount || tx.DeliverMax) / 1_000_000; // drops → XRP
          const amountUSD = (amountXRP * xrpPrice).toFixed(2);
          const date = item.close_time_iso || "Unknown time";

          return (
            <div
              key={i}
              style={{
                background: "#001133",
                color: "white",
                padding: "15px",
                marginBottom: "15px",
                borderRadius: "12px",
                border: "2px solid #FFD700",
                cursor: "pointer",
              }}
              onClick={() => toggleExpand(i)}
            >
              {/* Summary row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: "bold", color: isSent ? "#FF6347" : "#32CD32" }}>
                  {isSent ? "SENT" : "RECEIVED"}
                </span>
                <span>
                  {amountXRP.toFixed(6)} XRP ≈ ${amountUSD} USD
                </span>
                <span style={{ fontSize: "0.9rem", color: "#ccc" }}>{date}</span>
              </div>

              {/* Expanded details */}
              {expandedIndex === i && (
                <div style={{ marginTop: "10px", fontSize: "0.9rem" }}>
                  <p><strong>Type:</strong> {tx.TransactionType}</p>
                  <p><strong>Hash:</strong> {item.hash}</p>
                  <p><strong>From:</strong> {tx.Account}</p>
                  <p><strong>To:</strong> {tx.Destination || "N/A"}</p>
                  <p><strong>Fee:</strong> {tx.Fee} drops</p>
                  <p><strong>Ledger Index:</strong> {item.ledger_index}</p>
                  <p><strong>Validated:</strong> {item.validated ? "Yes" : "No"}</p>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}