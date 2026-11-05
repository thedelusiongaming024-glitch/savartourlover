/**
 * Dutch-Bangla Bank (DBBL) Rocket SMS Parser
 *
 * Extracts TrxID, Amount, Sender Phone, and Balance from official Rocket SMS formats:
 * - "Tk 2,030.00 received from 018XXXXXXXX for payment. Fee Tk 0.00. Balance Tk ... TxnId 2938475891 at 20/10/2026 16:15."
 * - "You have received Tk 2,030.00 from 018XXXXXXXX. Ref: STL-2026-00010. TxnId: 2938475891. Balance: Tk ..."
 * - "Cash In from 018XXXXXXXX of Tk 2,030.00 successful. Fee Tk 0.00. Balance Tk ... TxnId 2938475891"
 * - "Payment Tk 2,030.00 received from 018XXXXXXXX. TrxID: 2938475891"
 */

export interface ParsedRocketSms {
  isRocket: boolean;
  trxId: string | null;
  amount: number | null;
  senderPhone: string | null;
  balance: number | null;
  rawText: string;
}

export function parseRocketSms(rawText: string): ParsedRocketSms {
  const text = (rawText || "").trim();
  if (!text) {
    return {
      isRocket: false,
      trxId: null,
      amount: null,
      senderPhone: null,
      balance: null,
      rawText: "",
    };
  }

  // 1. Extract Transaction ID (TxnId / TrxID / TranID)
  let trxId: string | null = null;
  const trxMatch = text.match(
    /(?:TxnId|TxnID|TrxID|TrxId|TRXID|TranID|Tran\s*ID|TXN\s*ID|Trans\s*ID|Txn\s*no|Txn)[:\s]+([A-Za-z0-9_-]+)/i
  );
  if (trxMatch && trxMatch[1]) {
    trxId = trxMatch[1].trim().toUpperCase();
  }

  // 2. Extract Amount (Tk 2,030.00 / BDT 2030 / etc.)
  let amount: number | null = null;
  const amtMatch =
    text.match(/(?:received|payment|of)?\s*(?:Tk|BDT|Tk\.)\s*([\d,]+(?:\.\d{1,2})?)/i) ||
    text.match(/(?:Tk|BDT|Tk\.)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (amtMatch && amtMatch[1]) {
    const cleanAmt = parseFloat(amtMatch[1].replace(/,/g, ""));
    if (Number.isFinite(cleanAmt) && cleanAmt > 0) {
      amount = cleanAmt;
    }
  }

  // 3. Extract Sender Phone (from 018XXXXXXXX)
  let senderPhone: string | null = null;
  const phoneMatch = text.match(
    /(?:from|from\s+A\/C|from\s+account|from\s+A\/c)\s+([0-9+\-]{10,16})/i
  );
  if (phoneMatch && phoneMatch[1]) {
    senderPhone = phoneMatch[1].replace(/^\+88/, "").trim();
  }

  // 4. Extract Balance (Balance Tk ...)
  let balance: number | null = null;
  const balMatch = text.match(
    /(?:Balance|Bal)\s*[:\s]*(?:Tk|BDT|Tk\.)?\s*([\d,]+(?:\.\d{1,2})?)/i
  );
  if (balMatch && balMatch[1]) {
    const cleanBal = parseFloat(balMatch[1].replace(/,/g, ""));
    if (Number.isFinite(cleanBal)) {
      balance = cleanBal;
    }
  }

  // 5. Verification heuristic
  const lower = text.toLowerCase();
  const hasRocketKeywords =
    lower.includes("txnid") ||
    lower.includes("trxid") ||
    lower.includes("tranid") ||
    lower.includes("rocket") ||
    lower.includes("dbbl") ||
    lower.includes("received");

  const isRocket = Boolean(trxId && amount && hasRocketKeywords);

  return {
    isRocket,
    trxId,
    amount,
    senderPhone,
    balance,
    rawText: text,
  };
}
