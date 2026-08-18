export type AiDraftSaveReceipt = {
  messageId: string;
  transactionId: string;
};

type Listener = (receipt: AiDraftSaveReceipt) => void;

const pendingReceipts = new Map<string, AiDraftSaveReceipt>();
const listeners = new Set<Listener>();

export function recordAiDraftSave(receipt: AiDraftSaveReceipt) {
  pendingReceipts.set(receipt.messageId, receipt);
  listeners.forEach((listener) => listener(receipt));
}

export function consumeAiDraftSaves() {
  const receipts = [...pendingReceipts.values()];
  pendingReceipts.clear();
  return receipts;
}

export function subscribeToAiDraftSaves(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
