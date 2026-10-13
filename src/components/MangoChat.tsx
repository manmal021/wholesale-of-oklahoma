import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Send,
  ShoppingBag,
  Phone,
  MessageCircle,
  ChevronRight,
  Package,
  Search,
  Trash2,
  Check,
  Plus,
  User,
  Mail,
  Building,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Lock,
  UserCheck,
} from 'lucide-react';
import './MangoChat.css';
import {
  sendMangoMessage,
  getDraftOrder,
  getDraftOrderTotal,
  clearDraftOrder,
  addToOrderDirect,
  removeFromOrderDirect,
  type ChatMessage,
  type MangoToolResult,
  type DraftOrderItem,
} from '../lib/mangoAI';
import type { WholesaleProduct } from '../lib/productDatabase';

// ─── Sub-components ────────────────────────────────────────────────────────

const TypingIndicator: React.FC = () => (
  <div className="flex items-end gap-2 mango-msg">
    <img
      src="/mango-avatar.jpg"
      alt="Mango"
      className="w-7 h-7 rounded-full object-cover shrink-0 border-2 border-white shadow-sm"
    />
    <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-neutral-100 flex items-center gap-1.5">
      <span className="mango-dot" />
      <span className="mango-dot" />
      <span className="mango-dot" />
    </div>
  </div>
);

// ─── Sub-components ────────────────────────────────────────────────────────

// ─── Order Summary Bubble Card ─────────────────────────────────────────────

interface OrderSummaryProps {
  items: DraftOrderItem[];
  total: number;
  onGoToCart: () => void;
  onClear: () => void;
  onAddMore?: () => void;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ items, onGoToCart, onClear, onAddMore }) => {
  if (items.length === 0) {
    return (
      <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-4 text-center text-xs text-neutral-400">
        Your cart is empty. Ask Mango to show products!
      </div>
    );
  }

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="mango-card bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShoppingBag className="w-3.5 h-3.5 text-[#F97316]" />
          <span className="text-xs font-bold text-[#0f172A]">Your Wholesale Draft Cart</span>
        </div>
        <button onClick={onClear} className="text-[10px] text-neutral-400 hover:text-rose-500 transition-colors flex items-center gap-0.5 cursor-pointer">
          <Trash2 className="w-3 h-3" /> Clear Cart
        </button>
      </div>

      <div className="px-4 py-2 space-y-2 max-h-40 overflow-y-auto mango-messages-scroll">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-neutral-50 last:border-0">
            <div className="min-w-0">
              <span className="font-semibold text-[#0f172A] block truncate">{item.product.name}</span>
              {item.flavor && <span className="text-neutral-400 text-[10px]">{item.flavor}</span>}
            </div>
            <div className="text-right shrink-0">
              <span className="font-bold text-[#F97316]">{item.quantity}× units</span>
              <span className="text-neutral-400 text-[10px] block">Call for Price</span>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-neutral-100 bg-slate-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Items</span>
          <span className="text-base font-bold text-[#0f172A]">{totalUnits} units</span>
        </div>

        <div className="text-[11px] text-[#F97316] font-semibold text-center mb-3 bg-orange-50/80 py-1 px-2 rounded-lg border border-orange-100 flex items-center justify-center gap-1">
          <Phone className="w-3 h-3 text-[#F97316]" />
          <span>Call <strong>(405) 768-2975</strong> for wholesale pricing</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {onAddMore && (
            <button
              type="button"
              onClick={onAddMore}
              className="py-2 bg-white border border-neutral-200 hover:bg-neutral-100 text-[#0f172A] text-[11px] font-bold rounded-full transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-[#F97316]" />
              Add More Items
            </button>
          )}
          <button
            type="button"
            onClick={onGoToCart}
            className={`py-2 bg-[#F97316] hover:bg-[#ea580c] text-white text-[11px] font-bold rounded-full transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm ${!onAddMore ? 'col-span-2' : ''
              }`}
          >
            <Send className="w-3.5 h-3.5" />
            Submit Order Request
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Wholesale Catalog Gateway Component ─────────────────────────────

interface InventoryGatewayProps {
  hasCatalogAccess: boolean;
  onClose: () => void;
  onOpenLogin?: () => void;
  onOpenApplication?: () => void;
}

const InventoryGatewayView: React.FC<InventoryGatewayProps> = ({
  hasCatalogAccess,
  onClose,
  onOpenLogin,
  onOpenApplication,
}) => {
  if (hasCatalogAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-5 bg-[#F8FAFC]">
        <div className="w-16 h-16 rounded-3xl bg-orange-100 border border-orange-200 text-[#FF6B00] flex items-center justify-center shadow-xs">
          <Package className="w-8 h-8 stroke-[2.2]" />
        </div>
        <div className="space-y-1.5 max-w-xs">
          <h3 className="text-base font-black text-slate-900">Live Wholesale Catalog</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            900+ Zoho master SKUs with verified retailer tier pricing and active case inventory.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onClose();
            const el = document.getElementById('catalog');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="w-full max-w-xs py-3.5 px-6 bg-[#FF6B00] hover:bg-[#E85F00] text-white text-xs font-bold rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Package className="w-4 h-4" />
          <span>Browse 900+ Master SKUs</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-5 bg-[#F8FAFC]">
      <div className="w-16 h-16 rounded-3xl bg-slate-100 border border-slate-200 text-[#FF6B00] flex items-center justify-center shadow-xs">
        <Lock className="w-8 h-8 stroke-[2.2]" />
      </div>
      <div className="space-y-1.5 max-w-xs">
        <h3 className="text-base font-black text-slate-900">Approved Account Required</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Wholesale catalog access, live inventory, and volume pricing are restricted to verified B2B retail accounts in Oklahoma.
        </p>
      </div>
      <div className="w-full max-w-xs space-y-2.5">
        <button
          type="button"
          onClick={() => {
            onClose();
            if (onOpenLogin) onOpenLogin();
          }}
          className="w-full py-3 px-6 bg-[#FF6B00] hover:bg-[#E85F00] text-white text-xs font-bold rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Lock className="w-4 h-4" />
          <span>Customer Login</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            if (onOpenApplication) onOpenApplication();
          }}
          className="w-full py-3 px-6 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
        >
          <UserCheck className="w-4 h-4 text-[#FF6B00]" />
          <span>Apply for Wholesale Account</span>
        </button>
      </div>
    </div>
  );
};

// ─── Quick Actions ─────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: '📍', label: 'Store Location', prompt: 'Where are you located?' },
  { icon: '⏰', label: 'Store Hours', prompt: 'What are your store hours?' },
  { icon: '📦', label: 'Wholesale Info', prompt: 'How does wholesale work and what are your prices?' },
  { icon: '🚚', label: 'Pickup & Delivery', prompt: 'Do you offer same-day OKC pickup or metro delivery?' },
  { icon: '📞', label: 'Contact Store', prompt: 'What is your phone number and contact info?' },
];

// ─── Message Bubble ────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: ChatMessage;
  toolResults: MangoToolResult[];
  onAddToOrder: (product: WholesaleProduct, qty: number) => void;
  onGoToCart: () => void;
  onClearOrder: () => void;
  onAddMore: () => void;
  draftItems: DraftOrderItem[];
  draftTotal: number;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  toolResults,
  onAddToOrder,
  onGoToCart,
  onClearOrder,
  onAddMore,
  draftItems,
  draftTotal,
}) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-end gap-2 mango-msg ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <img
          src="/mango-avatar.jpg"
          alt="Mango"
          className="w-7 h-7 rounded-full object-cover shrink-0 border-2 border-white shadow-sm"
        />
      )}

      <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {message.text && (
          <div
            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isUser
              ? 'bg-[#0f172A] text-white rounded-br-sm'
              : 'bg-white text-[#0f172A] rounded-bl-sm border border-neutral-100'
              }`}
            dangerouslySetInnerHTML={{
              __html: message.text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br/>'),
            }}
          />
        )}

        {/* Render tool results inline (Order summaries only) */}
        {toolResults.map((result, i) => {
          if (result.type === 'order_updated' || result.type === 'order_summary') {
            return (
              <OrderSummary
                key={i}
                items={result.orderItems ?? draftItems}
                total={result.orderTotal ?? draftTotal}
                onGoToCart={onGoToCart}
                onClear={onClearOrder}
                onAddMore={onAddMore}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};

interface MangoChatProps {
  currentUser?: {
    role?: string;
    has_pricing_access?: boolean;
    businessName?: string;
  } | null;
  onOpenLogin?: () => void;
  onOpenApplication?: () => void;
}

export default function MangoChat({ currentUser, onOpenLogin, onOpenApplication }: MangoChatProps = {}) {
  const hasCatalogAccess = Boolean(
    currentUser &&
    (currentUser.role === 'approved_customer' || currentUser.role === 'admin') &&
    currentUser.has_pricing_access
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'inventory'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: 'Hello! Woof woof! 🐕 This is Mango AI, your virtual assistant of Wholesale of Oklahoma. How can I help you today?',
      timestamp: Date.now(),
    },
  ]);
  const [messageToolResults, setMessageToolResults] = useState<Map<number, MangoToolResult[]>>(
    new Map()
  );
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [draftItems, setDraftItems] = useState<DraftOrderItem[]>([]);
  const [draftTotal, setDraftTotal] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const syncDraftOrder = useCallback(() => {
    setDraftItems([...getDraftOrder()]);
    setDraftTotal(getDraftOrderTotal());
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, isTyping, activeTab]);

  useEffect(() => {
    syncDraftOrder();
    const handleCartUpdated = () => syncDraftOrder();
    window.addEventListener('mango-cart-updated', handleCartUpdated);
    return () => {
      window.removeEventListener('mango-cart-updated', handleCartUpdated);
    };
  }, [syncDraftOrder]);

  const handleOpen = () => {
    setIsOpen(true);
    setIsAnimatingOut(false);
    setActiveTab('chat');
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsAnimatingOut(false);
    }, 200);
  };

  const handleClearOrder = useCallback(() => {
    clearDraftOrder();
    syncDraftOrder();
  }, [syncDraftOrder]);

  const handleRemoveItem = useCallback(
    (productId: string) => {
      removeFromOrderDirect(productId);
      syncDraftOrder();
    },
    [syncDraftOrder]
  );

  const handleAddToOrder = useCallback(
    (product: WholesaleProduct, qty: number) => {
      // 1. Directly add to draft cart
      addToOrderDirect(product.id, qty);
      syncDraftOrder();

      // 2. Fetch fresh cart state
      const currentCart = getDraftOrder();
      const totalUnits = currentCart.reduce((sum, item) => sum + item.quantity, 0);

      // 3. Format current items in cart
      const cartList = currentCart
        .map((i) => `• **${i.quantity}x** ${i.product.name}`)
        .join('\n');

      // 4. Construct clear, helpful notification
      const botMsg: ChatMessage = {
        role: 'model',
        text: `✅ Added **${qty}x ${product.name}** to your cart! 🐕\n\n📦 **Current Cart (${totalUnits} units total):**\n${cartList}\n\nCall **(405) 768-2975** for immediate wholesale pricing. You can add more items or click **Submit Order Request** below to finish!`,
        toolResults: [
          {
            type: 'order_summary',
            orderItems: [...currentCart],
            orderTotal: totalUnits,
          },
        ],
        timestamp: Date.now(),
      };

      setMessages((prev) => {
        const next = [...prev, botMsg];
        setMessageToolResults((prevMap) => {
          const newMap = new Map(prevMap);
          newMap.set(next.length - 1, botMsg.toolResults || []);
          return newMap;
        });
        return next;
      });
    },
    [syncDraftOrder]
  );

  const handleAddMore = useCallback(() => {
    setActiveTab('inventory');
  }, []);

  const handleGoToCart = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-cart'));
  }, []);

  const handleOrderSubmitted = useCallback(
    (customerName: string, customerPhone: string) => {
      clearDraftOrder();
      syncDraftOrder();

      // Post celebration in chat
      const confirmationMsg: ChatMessage = {
        role: 'model',
        text: `🎉 **Order Request Submitted!** Woof! Thank you, **${customerName}**! Our dispatch team has received your order request and will reach out to **${customerPhone}** shortly to confirm pricing and pickup/delivery. 🐕`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, confirmationMsg]);
    },
    [syncDraftOrder]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isTyping) return;

      setActiveTab('chat');
      setShowQuickActions(false);
      const userMsg: ChatMessage = { role: 'user', text: text.trim(), timestamp: Date.now() };
      const userIdx = messages.length;

      setMessages((prev) => {
        const next = [...prev, userMsg];
        setMessageToolResults((prevMap) => {
          const newMap = new Map(prevMap);
          newMap.set(userIdx, []);
          return newMap;
        });
        return next;
      });
      setInputValue('');
      setIsTyping(true);

      try {
        const result = await sendMangoMessage(text.trim(), messages);
        syncDraftOrder();

        const botMsg: ChatMessage = { role: 'model', text: result.text, toolResults: result.toolResults, timestamp: Date.now() };
        setMessages((prev) => {
          const next = [...prev, botMsg];
          const botIdx = next.length - 1;
          setMessageToolResults((prevMap) => {
            const newMap = new Map(prevMap);
            newMap.set(botIdx, result.toolResults);
            return newMap;
          });
          return next;
        });
      } catch {
        const errorMsg: ChatMessage = {
          role: 'model',
          text: "Oops, I ran into a snag! Please call us directly at **(405) 768-2975**. 🐕",
          timestamp: Date.now(),
        };
        setMessages((prev) => {
          const next = [...prev, errorMsg];
          setMessageToolResults((prevMap) => {
            const newMap = new Map(prevMap);
            newMap.set(next.length - 1, []);
            return newMap;
          });
          return next;
        });
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping, messages, syncDraftOrder]
  );

  const handleQuickAction = useCallback(
    (prompt: string) => {
      sendMessage(prompt);
    },
    [sendMessage]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(inputValue);
    },
    [inputValue, sendMessage]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const orderItemCount = draftItems.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <>
      {/* ── Floating Trigger Button ── */}
      <div
        className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
        style={{ pointerEvents: 'none' }}
      >
        <button
          id="mango-chat-trigger"
          onClick={isOpen ? handleClose : handleOpen}
          aria-label={isOpen ? 'Close Mango chat' : 'Open Mango chat'}
          aria-expanded={isOpen}
          style={{ pointerEvents: 'auto' }}
          className={`mango-avatar-btn group relative flex items-center gap-2.5 bg-[#0f172A] hover:bg-[#1e293b] text-white pl-1.5 pr-4 py-1.5 rounded-full shadow-xl border border-white/10 transition-all duration-300 cursor-pointer select-none ${
            !isOpen ? 'mango-pulse' : ''
          }`}
        >
          <div className="relative">
            <img
              src="/mango-avatar.jpg"
              alt="Mango Mascot"
              className="w-9 h-9 rounded-full object-cover border-2 border-[#F97316] shadow-sm group-hover:scale-105 transition-transform"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#0f172A] rounded-full" />
          </div>

          <div className="text-left leading-tight hidden sm:block">
            <div className="text-xs font-bold text-white flex items-center gap-1">
              <span>Mango</span>
              <span className="text-[10px]">🐕</span>
            </div>
            <div className="text-[10px] text-[#F97316] font-medium">Wholesale Assistant</div>
          </div>

          {isOpen && <X className="w-3.5 h-3.5 ml-0.5 text-neutral-400 group-hover:text-white transition-colors" />}
        </button>
      </div>

      {/* ── Chat & Inventory Window ── */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Mango Virtual Assistant"
          aria-modal="true"
          className={`fixed z-50
            /* Mobile: full-width bottom sheet */
            bottom-0 left-0 right-0 h-[92dvh]
            /* Desktop: positioned above button */
            sm:bottom-24 sm:right-6 sm:left-auto sm:w-[420px] sm:h-[640px] sm:max-h-[90dvh]
            flex flex-col bg-[#F8FAFC] overflow-hidden
            /* Rounded corners */
            rounded-t-3xl sm:rounded-3xl
            shadow-2xl border border-white/20
            ${isAnimatingOut ? 'mango-chat-exit' : 'mango-chat-enter'}`}
        >
          {/* ── Chat Header ── */}
          <div className="bg-[#0f172A] px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="relative">
              <img
                src="/mango-avatar.jpg"
                alt="Mango"
                className="w-10 h-10 rounded-full object-cover border-2 border-[#F97316]/40 shadow"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#0f172A] rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm flex items-center gap-1.5">
                <span>Mango</span>
                <span className="text-xs">🐕</span>
              </div>
              <div className="text-[#F97316] text-[10px] font-medium">Wholesale of Oklahoma Assistant</div>
            </div>

            <a
              href="tel:4057682975"
              title="Call Store Directly"
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
              aria-label="Close Mango"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── View Navigation Tabs ── */}
          <div className="bg-[#0f172A] px-3 pb-2 flex items-center gap-1 border-b border-white/10 shrink-0">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#F97316]" />
              <span>Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-[#F97316]" />
              <span>{hasCatalogAccess ? 'Catalog' : 'Wholesale'}</span>
            </button>

            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-cart'));
              }}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-slate-300 hover:text-white hover:bg-white/10"
              title="Open Wholesale Shopping Cart"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#F97316]" />
              <span>View Cart</span>
              {orderItemCount > 0 && (
                <span className="bg-[#F97316] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full ml-0.5">
                  {orderItemCount}
                </span>
              )}
            </button>
          </div>

          {/* ── TAB CONTENT: CHAT ── */}
          {activeTab === 'chat' && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 mango-messages-scroll">
                {messages.map((msg, idx) => (
                  <MessageBubble
                    key={idx}
                    message={msg}
                    toolResults={messageToolResults.get(idx) ?? []}
                    onAddToOrder={handleAddToOrder}
                    onGoToCart={handleGoToCart}
                    onClearOrder={handleClearOrder}
                    onAddMore={handleAddMore}
                    draftItems={draftItems}
                    draftTotal={draftTotal}
                  />
                ))}

                {/* Typing indicator */}
                {isTyping && <TypingIndicator />}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Actions */}
              {showQuickActions && (
                <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="mango-chip flex items-center gap-1 text-[11px] font-semibold text-[#0f172A] bg-white border border-neutral-200 px-3 py-1.5 rounded-full shadow-sm cursor-pointer"
                    >
                      <span>{action.icon}</span>
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Input Bar */}
              <div className="p-3 bg-white border-t border-neutral-200 shrink-0">
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Mango or search products..."
                    className="flex-1 bg-neutral-50 border border-neutral-200 rounded-full px-4 py-2.5 text-xs text-[#0f172A] placeholder-neutral-400 focus:outline-none focus:border-[#F97316] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isTyping}
                    className="w-8 h-8 rounded-full bg-[#F97316] hover:bg-[#ea580c] disabled:opacity-30 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </form>
                <div className="text-[9px] text-neutral-400 text-center mt-1">
                  Mango wholesale assistant · Call (405) 768-2975 for direct pricing
                </div>
              </div>
            </div>
          )}

          {/* ── TAB CONTENT: INVENTORY BROWSE ── */}
          {activeTab === 'inventory' && (
            <InventoryGatewayView
              hasCatalogAccess={hasCatalogAccess}
              onClose={handleClose}
              onOpenLogin={onOpenLogin}
              onOpenApplication={onOpenApplication}
            />
          )}
        </div>
      )}
    </>
  );
}
