import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  createChatSocket,
  fetchThreadMessages,
  markThreadAsRead,
  sendMessage,
  fetchConversations,
  fetchSupportAdmin,
  createConversation,
} from '../../services/messageApi';
import { fetchRoomContact } from '../../services/roomApi';
import { 
  MessageCircle, 
  X, 
  Send, 
  ChevronLeft, 
  Search, 
  CheckCheck,
  Check,
  ExternalLink,
  User as UserIcon,
  Home
} from 'lucide-react';

const CHAT_CONTEXT_KEY = 'trohub_chat_context';

function toContext(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const roomId = raw.roomId ? Number(raw.roomId) : null;
  const receiverId = Number(raw.receiverId);
  if (!Number.isFinite(receiverId)) return null;
  return {
    roomId,
    receiverId,
    receiverName: raw.receiverName || `User #${receiverId}`,
    roomTitle: raw.roomTitle || (roomId ? `Phòng #${roomId}` : 'Trò chuyện'),
  };
}

function readStoredContext() {
  const raw = localStorage.getItem(CHAT_CONTEXT_KEY);
  if (!raw) return null;
  try {
    return toContext(JSON.parse(raw));
  } catch {
    return null;
  }
}

function storeContext(context) {
  if (!context) {
    localStorage.removeItem(CHAT_CONTEXT_KEY);
    return;
  }
  localStorage.setItem(CHAT_CONTEXT_KEY, JSON.stringify(context));
}

function formatTime(value) {
  try {
    const date = new Date(value);
    const now = new Date();
    const isToday = date.getDate() === now.getDate() && 
                    date.getMonth() === now.getMonth() && 
                    date.getFullYear() === now.getFullYear();
    if (isToday) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  } catch {
    return '';
  }
}

function extractField(line, label) {
  const match = line.match(new RegExp(`${label}\\s+([^;\\n]+)`, 'i'));
  return match?.[1]?.trim() || '';
}

function normalizeAddressPiece(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^(thành phố|tp\.?)\s+/i, '');
}

function sanitizeAddress(address = '') {
  const parts = String(address)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return '';

  const deduped = [];
  parts.forEach((part) => {
    const normalized = normalizeAddressPiece(part);
    const prevNormalized = normalizeAddressPiece(deduped[deduped.length - 1] || '');
    if (normalized && normalized === prevNormalized) return;
    deduped.push(part);
  });
  return deduped.join(', ');
}

function extractChatCards(content = '') {
  return String(content)
    .split('\n')
    .map((line) => line.trim().replace(/^\d+[\.)]\s*/, ''))
    .map((line) => {
      const roomMatch = line.match(/^#(\d+)\s*-\s*([^;]+)/);
      if (roomMatch) {
        const roomId = roomMatch[1];
        return {
          type: 'room',
          key: `room-${roomId}-${line}`,
          title: roomMatch[2].trim(),
          href: `/room/${roomId}`,
          badge: `#${roomId}`,
          price: extractField(line, 'giá'),
          area: extractField(line, 'diện tích'),
          address: sanitizeAddress(extractField(line, 'địa chỉ')),
          source: extractField(line, 'nguồn'),
        };
      }

      const crawlMatch = line.match(/^(?:Tin crawl|crawl:\S+)\s*-\s*([^;]+)/i);
      if (crawlMatch) {
        const urlMatch = line.match(/(?:link nguồn\s+|crawl:)(https?:\/\/[^\s;]+)/i);
        return {
          type: 'crawl',
          key: `crawl-${urlMatch?.[1] || crawlMatch[1]}-${line}`,
          title: crawlMatch[1].trim(),
          href: urlMatch?.[1] || '',
          badge: 'Tin crawl',
          price: extractField(line, 'giá'),
          area: extractField(line, 'diện tích'),
          address: sanitizeAddress(extractField(line, 'địa chỉ')),
          phone: line.match(/SĐT nguồn:\s*([^;\n]+)/i)?.[1]?.trim() || '',
        };
      }

      return null;
    })
    .filter(Boolean)
    .slice(0, 5);
}

function renderLinkedText(content, mine) {
  const text = String(content || '');
  const pattern = /(https?:\/\/[^\s;]+|\/room\/\d+)/g;
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    if (!part) return null;
    if (part.startsWith('/room/')) {
      return (
        <a
          key={`${part}-${index}`}
          href={part}
          className={mine ? 'underline decoration-white/60 underline-offset-2' : 'text-blue-600 font-medium underline underline-offset-2'}
        >
          {part}
        </a>
      );
    }
    if (/^https?:\/\//i.test(part)) {
      return (
        <a
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          className={mine ? 'underline decoration-white/60 underline-offset-2 break-all' : 'text-blue-600 font-medium underline underline-offset-2 break-all'}
        >
          nguồn
        </a>
      );
    }
    return <React.Fragment key={`${index}-${part.slice(0, 8)}`}>{part}</React.Fragment>;
  });
}

function ChatSuggestionCards({ cards }) {
  if (!cards.length) return null;

  return (
    <div className="mt-2 space-y-2">
      {cards.map((card) => (
        <div key={card.key} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${card.type === 'room' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                  <Home size={11} />
                  {card.badge}
                </span>
                {card.source && <span className="text-[10px] text-slate-400 truncate">{card.source}</span>}
              </div>
              <h4 className="text-[13px] font-semibold text-slate-900 leading-snug break-words">{card.title}</h4>
            </div>
            {card.href && (
              <a
                href={card.href}
                target={card.type === 'crawl' ? '_blank' : undefined}
                rel={card.type === 'crawl' ? 'noreferrer' : undefined}
                className="shrink-0 w-8 h-8 rounded-full bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 flex items-center justify-center"
                aria-label={card.type === 'room' ? 'Xem chi tiết phòng' : 'Mở nguồn tin'}
              >
                <ExternalLink size={15} />
              </a>
            )}
          </div>

          <div className="mt-2 space-y-1 text-[11px] text-slate-600">
            {(card.price || card.area) && (
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {card.price && <span>{card.price}</span>}
                {card.area && <span>{card.area}</span>}
              </div>
            )}
            {card.address && <div className="line-clamp-2">{card.address}</div>}
            {card.phone && <div className="font-medium text-slate-700">{card.phone}</div>}
          </div>

          {card.href && (
            <a
              href={card.href}
              target={card.type === 'crawl' ? '_blank' : undefined}
              rel={card.type === 'crawl' ? 'noreferrer' : undefined}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
            >
              {card.type === 'room' ? 'Xem chi tiết' : 'Mở nguồn'} <ExternalLink size={12} />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ChatWidget() {
  const { user } = useAuth();
  
  // UI State
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'chat'
  
  // Chat State
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([]);
  const [context, setContext] = useState(() => readStoredContext());
  
  // Conversations State
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Network/Status State
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  
  const socketRef = useRef(null);
  const listRef = useRef(null);

  const canChat = Boolean(user?.id && context?.receiverId);

  // Sorting and filtering
  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()),
    [messages],
  );

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const lower = searchQuery.toLowerCase();
    return conversations.filter(c => 
      c.other_user_name?.toLowerCase().includes(lower) || 
      c.last_message?.toLowerCase().includes(lower)
    );
  }, [conversations, searchQuery]);

  const totalUnread = useMemo(() => {
    return conversations.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);
  }, [conversations]);

  // Load conversations when opening the widget or going to list view
  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConversations(true);
    try {
      const data = await fetchConversations(50);
      setConversations(data || []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

  // Handle cross-tab/component open-chat events
  useEffect(() => {
    const handler = async (event) => {
      const nextContext = toContext(event.detail);
      if (!nextContext) return;

      if (nextContext.roomId) {
        try {
          const contact = await fetchRoomContact(nextContext.roomId);
          if (contact.isCrawled) {
            setError('Tin từ nguồn crawl — vui lòng liên hệ qua số điện thoại trên trang chi tiết phòng.');
            setOpen(true);
            setViewMode('list');
            storeContext(null);
            setContext(null);
            return;
          }
        } catch {
          // Nếu không gọi được contact API, vẫn thử mở chat (backend sẽ chặn nếu là crawl)
        }
      }

      setContext(nextContext);
      storeContext(nextContext);
      setViewMode('chat');
      setOpen(true);
      setError('');
    };
    window.addEventListener('trohub:open-chat', handler);
    return () => window.removeEventListener('trohub:open-chat', handler);
  }, []);

  // Sync stored context on mount if it exists and we're not explicitly in list mode
  useEffect(() => {
    if (context && open && viewMode === 'chat') {
      // already handled
    }
  }, [context, open, viewMode]);

  // Fetch conversations when opening list
  useEffect(() => {
    if (open && viewMode === 'list') {
      loadConversations();
    }
  }, [open, viewMode, loadConversations]);

  // Fetch messages when entering chat view
  useEffect(() => {
    if (!open || viewMode !== 'chat' || !canChat) return;
    let active = true;
    setLoading(true);
    setError('');

    if (context.roomId && user?.id) {
      createConversation({
        userId: user.id,
        otherUserId: context.receiverId,
        roomId: context.roomId,
      }).catch(() => {});
    }

    fetchThreadMessages({
      otherUserId: context.receiverId,
      roomId: context.roomId,
      limit: 100,
    })
      .then((data) => {
        if (!active) return;
        setMessages(Array.isArray(data) ? data : []);
        // Also mark as read
        return markThreadAsRead({ otherUserId: context.receiverId, roomId: context.roomId }).catch(() => {});
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Không tải được lịch sử tin nhắn.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, viewMode, canChat, context?.receiverId, context?.roomId, user?.id]);

  // WebSocket for active chat
  useEffect(() => {
    if (!open || viewMode !== 'chat' || !canChat) return undefined;

    // Create a unique channel for direct messages
    const socketRoomId = context.roomId || `dm_${Math.min(user.id, context.receiverId)}_${Math.max(user.id, context.receiverId)}`; 

    const socket = createChatSocket({
      roomId: socketRoomId,
      senderId: user.id,
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
      onError: () => setConnected(false),
      onMessage: (payload) => {
        if (payload?.type === 'error') {
          setError(payload.message || 'Lỗi kết nối chat realtime.');
          return;
        }
        if (payload?.type !== 'message' || !payload?.id) return;
        
        const isCurrentThread =
          (payload.room_id == context.roomId)
          && (
            (Number(payload.sender_id) === Number(user.id) && Number(payload.receiver_id) === Number(context.receiverId))
            || (Number(payload.sender_id) === Number(context.receiverId) && Number(payload.receiver_id) === Number(user.id))
          );
          
        if (!isCurrentThread) return;

        setMessages((prev) => {
          if (prev.some((msg) => msg.id === payload.id)) return prev;
          return [...prev, payload];
        });
        
        if (Number(payload.sender_id) === Number(context.receiverId)) {
          markThreadAsRead({ otherUserId: context.receiverId, roomId: context.roomId }).catch(() => {});
        }
      },
    });

    socketRef.current = socket;
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setConnected(false);
    };
  }, [open, viewMode, canChat, context?.roomId, context?.receiverId, user?.id]);

  // Auto-scroll chat
  useEffect(() => {
    if (open && viewMode === 'chat' && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [open, viewMode, sortedMessages.length]);

  const submitMessage = async () => {
    if (!canChat || sending) return;
    const content = draft.trim();
    if (!content) return;

    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          receiver_id: context.receiverId,
          content,
        }),
      );
      setDraft('');
      return;
    }

    setSending(true);
    setError('');
    try {
      const created = await sendMessage({
        receiverId: context.receiverId,
        roomId: context.roomId,
        content,
      });
      setMessages((prev) => [...prev, created]);
      setDraft('');
      // AI trả lời qua REST (không qua WS) — tải lại thread sau vài giây
      window.setTimeout(async () => {
        try {
          const thread = await fetchThreadMessages({
            otherUserId: context.receiverId,
            roomId: context.roomId,
            limit: 100,
          });
          if (Array.isArray(thread)) setMessages(thread);
        } catch {
          /* bỏ qua */
        }
      }, 1500);
    } catch (err) {
      setError(err.message || 'Gửi tin nhắn thất bại.');
    } finally {
      setSending(false);
    }
  };

  const handleOpenWidget = () => {
    if (!open) {
      setOpen(true);
      if (context) {
        setViewMode('chat');
      } else {
        setViewMode('list');
      }
    } else {
      setOpen(false);
    }
  };

  const goToList = () => {
    setViewMode('list');
    setContext(null);
    storeContext(null);
    setMessages([]);
  };

  const handleChatWithAdmin = async () => {
    try {
      const admin = await fetchSupportAdmin();
      const newCtx = {
        roomId: null,
        receiverId: admin.id,
        receiverName: 'Hỗ trợ trực tuyến (Admin)',
        roomTitle: 'Hỗ trợ trực tuyến',
      };
      setContext(newCtx);
      storeContext(newCtx);
      setViewMode('chat');
    } catch (err) {
      console.error('Không thể lấy thông tin admin:', err);
      alert('Không tìm thấy Quản trị viên nào đang trực tuyến.');
    }
  };

  return (
    <div className="fixed right-4 bottom-4 sm:right-6 sm:bottom-6 z-[999]">
      {/* Widget Container */}
      <div 
        className={`
          absolute bottom-20 right-0 w-[350px] sm:w-[380px] bg-white rounded-2xl shadow-2xl 
          border border-slate-100 overflow-hidden flex flex-col transition-all duration-300 origin-bottom-right
          ${open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-90 opacity-0 pointer-events-none'}
        `}
        style={{ height: '550px', maxHeight: 'calc(100vh - 100px)' }}
      >
        
        {/* --- LIST VIEW --- */}
        {viewMode === 'list' && (
          <>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 shrink-0 shadow-sm relative z-10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg tracking-tight">Tin nhắn</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200" />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-black/10 border border-white/20 text-white placeholder-blue-200 text-sm rounded-full py-1.5 pl-9 pr-4 outline-none focus:bg-black/20 focus:border-white/40 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
              {!user ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-500 flex-1">
                  <MessageCircle size={40} className="text-slate-300 mb-3" />
                  <p className="text-sm">Vui lòng đăng nhập để xem tin nhắn</p>
                </div>
              ) : (
                <>
                  <div className="p-3 border-b border-slate-100 bg-white shrink-0">
                    <button 
                      onClick={handleChatWithAdmin}
                      className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <UserIcon size={16} /> Liên hệ với Quản trị viên
                    </button>
                  </div>
                  
                  {loadingConversations && conversations.length === 0 ? (
                    <div className="flex items-center justify-center p-6 flex-1">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 flex-1">
                      <MessageCircle size={40} className="text-slate-300 mb-3" />
                      <p className="text-sm">{searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có cuộc trò chuyện nào'}</p>
                    </div>
                  ) : (
                <div className="divide-y divide-slate-100">
                  {filteredConversations.map(conv => (
                    <button
                      key={`${conv.other_user_id}-${conv.room_id}`}
                      className="w-full p-3 flex items-start gap-3 hover:bg-blue-50/50 transition-colors text-left"
                      onClick={() => {
                        const newCtx = {
                          roomId: conv.room_id,
                          receiverId: conv.other_user_id,
                          receiverName: conv.other_user_name,
                          roomTitle: conv.room_id ? `Phòng #${conv.room_id}` : 'Trò chuyện',
                        };
                        setContext(newCtx);
                        storeContext(newCtx);
                        setViewMode('chat');
                      }}
                    >
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-blue-600 font-semibold shadow-inner">
                          {conv.other_user_name?.charAt(0).toUpperCase() || <UserIcon size={20} />}
                        </div>
                        {conv.unread_count > 0 && (
                          <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
                            {conv.unread_count > 99 ? '99+' : conv.unread_count}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h4 className={`text-sm truncate pr-2 ${conv.unread_count > 0 ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                            {conv.other_user_name}
                          </h4>
                          <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
                            {formatTime(conv.last_message_at)}
                          </span>
                        </div>
                        <p className={`text-xs truncate ${conv.unread_count > 0 ? 'font-medium text-slate-800' : 'text-slate-500'}`}>
                          {conv.last_message}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
              )}
            </div>
          </>
        )}

        {/* --- CHAT VIEW --- */}
        {viewMode === 'chat' && (
          <>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 shrink-0 shadow-sm z-10 flex items-center gap-3">
              <button
                onClick={goToList}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors shrink-0"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[15px] leading-tight truncate">
                  {context?.receiverName || 'Đang tải...'}
                </h3>
                <div className="flex items-center gap-1.5 text-blue-100 text-[11px] mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]' : 'bg-red-400'}`}></span>
                  <span className="truncate">{context?.roomTitle}</span>
                </div>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div 
              ref={listRef} 
              className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-4 relative"
              style={{
                backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}
            >
              {!user ? (
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center text-sm text-slate-600 shadow-sm">
                  Vui lòng đăng nhập để sử dụng nhắn tin.
                </div>
              ) : !context ? (
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center text-sm text-slate-600 shadow-sm">
                  Vui lòng chọn người để nhắn tin.
                </div>
              ) : loading ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : sortedMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <MessageCircle size={48} className="mb-3 opacity-20" />
                  <p className="text-sm">Chưa có tin nhắn.</p>
                  <p className="text-xs mt-1">Hãy gửi lời chào đầu tiên!</p>
                </div>
              ) : (
                <div className="flex flex-col space-y-3 pb-2">
                  {sortedMessages.map((item, index) => {
                    const mine = Number(item.sender_id) === Number(user?.id);
                    const showAvatar = !mine && (index === 0 || Number(sortedMessages[index - 1]?.sender_id) !== Number(item.sender_id));
                    const suggestionCards = mine ? [] : extractChatCards(item.content);
                    
                    return (
                      <div key={item.id} className={`flex w-full ${mine ? 'justify-end' : 'justify-start'}`}>
                        {!mine && (
                          <div className="w-7 shrink-0 mr-2 flex flex-col justify-end pb-1">
                            {showAvatar && (
                              <div className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden shadow-sm">
                                {context?.receiverName?.charAt(0).toUpperCase() || 'U'}
                              </div>
                            )}
                          </div>
                        )}
                        <div
                          className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-[14px] shadow-sm relative group ${
                            mine
                              ? 'bg-blue-600 text-white rounded-br-sm'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                          }`}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap break-words">
                            {renderLinkedText(item.content, mine)}
                          </p>
                          <ChatSuggestionCards cards={suggestionCards} />
                          <div className={`flex items-center justify-end gap-1 mt-1 ${mine ? 'text-blue-200' : 'text-slate-400'}`}>
                            <span className="text-[10px] select-none">
                              {formatTime(item.sent_at)}
                            </span>
                            {mine && (
                              item.is_read ? <CheckCheck size={12} className="text-blue-200" /> : <Check size={12} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3 bg-white border-t border-slate-100 shrink-0">
              {error && (
                <div className="mb-2 text-[11px] bg-red-50 border border-red-100 text-red-600 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                  {error}
                </div>
              )}
              <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-2xl focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <textarea
                  placeholder={canChat ? 'Nhắn tin...' : 'Không thể nhắn tin'}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      submitMessage();
                    }
                  }}
                  disabled={!canChat || sending}
                  rows={1}
                  className="flex-1 bg-transparent px-3 py-1.5 text-sm outline-none resize-none max-h-[100px] disabled:opacity-50 scrollbar-hide"
                  style={{ minHeight: '36px' }}
                />
                <button
                  type="button"
                  onClick={submitMessage}
                  disabled={!canChat || sending || !draft.trim()}
                  className="shrink-0 w-9 h-9 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-blue-600 shadow-sm"
                >
                  <Send size={16} className={sending ? 'animate-pulse' : 'ml-0.5'} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* FAB Button */}
      <div className="relative">
        <button
          type="button"
          onClick={handleOpenWidget}
          className={`
            relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300
            ${open 
              ? 'bg-slate-800 hover:bg-slate-900 text-white rotate-90 scale-95' 
              : 'bg-gradient-to-tr from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 text-white hover:scale-105 hover:shadow-blue-500/30'
            }
          `}
          aria-label="Mở chat"
        >
          {open ? (
            <X size={26} className="-rotate-90 transition-transform duration-300" />
          ) : (
            <MessageCircle size={26} className={totalUnread > 0 ? 'animate-pulse' : ''} />
          )}
        </button>
        
        {/* Unread Badge on FAB */}
        {!open && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 border-2 border-white rounded-full text-white text-[11px] font-bold flex items-center justify-center shadow-sm animate-bounce">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </div>
    </div>
  );
}
