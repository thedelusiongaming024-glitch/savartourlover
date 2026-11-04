/**
 * bKash SMS Parser
 *
 * Extracts TrxID, Amount, Sender Phone, and Balance from official bKash SMS formats:
 * - "You have received Tk 2,050.00 from 018XXXXXXXX. Ref STL-2026-00010. Fee Tk 0.00. Balance Tk ... TrxID BLA9X1K8O2 at 20/10/2026 16:15."
 * - "You have received deposit of Tk 2,050.00 from 018XXXXXXXX. Fee Tk 0.00. Balance Tk ... TrxID BLA9X1K8O2"
 * - "Cash In Tk 2,050.00 from 018XXXXXXXX successful. Fee Tk 0.00. Balance Tk ... TrxID BLA9X1K8O2"
 * - "Payment Tk 2,050.00 received from 018XXXXXXXX. TrxID: BLA9X1K8O2"
 * - "Received Tk 2,050.00 from 018XXXXXXXX. TrxID BLA9X1K8O2"
 */

export interface ParsedBkashSms {
  isBkash: boolean;
  trxId: string | null;
  amount: number | null;
  senderPhone: string | null;
  balance: number | null;
  rawText: string;
}

export function parseBkashSms(rawText: string): ParsedBkashSms {
  const text = (rawText || "").trim();
  if (!text) {
    return {
      isBkash: false,
      trxId: null,
      amount: null,
      senderPhone: null,
      balance: null,
      rawText: "",
    };
  }

  // 1. Extract Transaction ID (TrxID / TxnId / Trx / TranID)
  let trxId: string | null = null;
  const trxMatch = text.match(
    /(?:TrxID|TrxId|TRXID|Trx\s*ID|TxnId|TxnID|TXN\s*ID|TranID|Tran\s*ID|Trans\s*ID)[:\s]+([A-Za-z0-9_-]+)/i
  );
  if (trxMatch && trxMatch[1]) {
    trxId = trxMatch[1].trim().toUpperCase();
  }

  // 2. Extract Amount (Tk 2,050.00 / BDT 2050 / etc.)
  let amount: number | null = null;
  const amtMatch =
    text.match(/(?:received|payment|deposit\s+of|of)?\s*(?:Tk|BDT|Tk\.)\s*([\d,]+(?:\.\d{1,2})?)/i) ||
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
    /(?:from|from\s+A\/C|from\s+account|from\s+A\/c|থেকে)\s+([0-9+\-]{10,16})/i
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
  const hasBkashKeywords =
    lower.includes("trxid") ||
    lower.includes("txnid") ||
    lower.includes("tranid") ||
    lower.includes("bkash") ||
    lower.includes("16247") ||
    lower.includes("received") ||
    lower.includes("পেয়েছেন");

  const isBkash = Boolean(trxId && amount && hasBkashKeywords);

  return {
    isBkash,
    trxId,
    amount,
    senderPhone,
    balance,
    rawText: text,
  };
}
