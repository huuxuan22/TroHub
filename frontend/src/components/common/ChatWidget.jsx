import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  createChatSocket,
  fetchThreadMessages,
  markThreadAsRead,
  sendMessage,
} from '../../services/messageApi';

const CHAT_CONTEXT_KEY = 'trohub_chat_context';

function toContext(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const roomId = Number(raw.roomId);
  const receiverId = Number(raw.receiverId);
  if (!Number.isFinite(roomId) || !Number.isFinite(receiverId)) return null;
  return {
    roomId,
    receiverId,
    receiverName: raw.receiverName || `User #${receiverId}`,
    roomTitle: raw.roomTitle || `Phong #${roomId}`,
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
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([]);
  const [context, setContext] = useState(() => readStoredContext());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef(null);
  const listRef = useRef(null);

  const canChat = Boolean(user?.id && context?.receiverId && context?.roomId);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()),
    [messages],
  );

  useEffect(() => {
    const handler = (event) => {
      const nextContext = toContext(event.detail);
      if (!nextContext) return;
      setContext(nextContext);
      storeContext(nextContext);
      setOpen(true);
      setError('');
    };
    window.addEventListener('trohub:open-chat', handler);
    return () => window.removeEventListener('trohub:open-chat', handler);
  }, []);

  useEffect(() => {
    if (!open || !canChat) return;
    let active = true;
    setLoading(true);
    setError('');

    fetchThreadMessages({
      otherUserId: context.receiverId,
      roomId: context.roomId,
      limit: 100,
    })
      .then((data) => {
        if (!active) return;
        setMessages(Array.isArray(data) ? data : []);
        return markThreadAsRead({ otherUserId: context.receiverId, roomId: context.roomId }).catch(() => {});
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Khong tai duoc lich su tin nhan.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, canChat, context?.receiverId, context?.roomId]);

  useEffect(() => {
    if (!open || !canChat) return undefined;

    const socket = createChatSocket({
      roomId: context.roomId,
      senderId: user.id,
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
      onError: () => setConnected(false),
      onMessage: (payload) => {
        if (payload?.type === 'error') {
          setError(payload.message || 'Loi ket noi chat realtime.');
          return;
        }
        if (payload?.type !== 'message' || !payload?.id) return;
        const isCurrentThread =
          Number(payload.room_id) === Number(context.roomId)
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
  }, [open, canChat, context?.roomId, context?.receiverId, user?.id]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, sortedMessages.length]);

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
    } catch (err) {
      setError(err.message || 'Gui tin nhan that bai.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed right-5 bottom-5 z-50">
      {open && (
        <div className="mb-3 w-[320px] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">TroHub Chat</h3>
              <p className="text-xs text-blue-100">
                {context ? `${context.receiverName} - ${context.roomTitle}` : 'Nhan tin voi chu phong'}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/90 hover:text-white text-lg leading-none"
              aria-label="Dong khung chat"
            >
              x
            </button>
          </div>

          <div className="px-3 py-2 border-b border-gray-100 text-[11px] text-gray-500 flex items-center justify-between">
            <span>{connected ? 'Realtime: da ket noi' : 'Realtime: dang offline'}</span>
            {context && (
              <button
                type="button"
                onClick={() => {
                  setContext(null);
                  setMessages([]);
                  storeContext(null);
                }}
                className="text-blue-600 hover:underline"
              >
                Xoa ngu canh
              </button>
            )}
          </div>

          <div ref={listRef} className="h-72 overflow-y-auto bg-slate-50 px-3 py-3 space-y-2">
            {!user && (
              <div className="text-sm text-gray-600 bg-white border border-gray-200 rounded-xl p-3">
                Vui long dang nhap de su dung nhan tin.
              </div>
            )}
            {user && !context && (
              <div className="text-sm text-gray-600 bg-white border border-gray-200 rounded-xl p-3">
                Mo trang chi tiet phong va bam nut "Nhan tin" de bat dau.
              </div>
            )}
            {user && context && loading && (
              <div className="text-sm text-gray-500">Dang tai lich su tin nhan...</div>
            )}
            {user && context && !loading && sortedMessages.length === 0 && (
              <div className="text-sm text-gray-500 bg-white border border-gray-200 rounded-xl p-3">
                Chua co tin nhan. Hay gui loi chao dau tien.
              </div>
            )}

            {sortedMessages.map((item) => {
              const mine = Number(item.sender_id) === Number(user?.id);
              return (
                <div
                  key={item.id}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    mine
                      ? 'ml-auto bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-700'
                  }`}
                >
                  <p>{item.content}</p>
                  <p className={`mt-1 text-[11px] ${mine ? 'text-blue-100' : 'text-gray-400'}`}>
                    {formatTime(item.sent_at)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="p-3 border-t border-gray-100">
            {error && (
              <p className="mb-2 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg px-2.5 py-2">
                {error}
              </p>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={canChat ? 'Nhap tin nhan...' : 'Chon ngu canh chat tu trang phong'}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    submitMessage();
                  }
                }}
                disabled={!canChat || sending}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 disabled:bg-gray-100"
              />
              <button
                type="button"
                onClick={submitMessage}
                disabled={!canChat || sending}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
              >
                {sending ? 'Dang gui...' : 'Gui'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-colors"
        aria-label="Mo chat ho tro"
      >
        <span className="text-2xl">...</span>
        {!open && (
          <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
        )}
      </button>
    </div>
  );
}
