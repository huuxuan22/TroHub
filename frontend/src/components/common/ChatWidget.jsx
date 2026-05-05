import React, { useState } from 'react';

const QUICK_MESSAGES = [
  {
    id: 1,
    sender: 'bot',
    content: 'Chao ban! TroHub co the ho tro tim phong, dang tin va giai dap hop dong.',
    time: '10:30',
  },
  {
    id: 2,
    sender: 'user',
    content: 'Minh can tim phong duoi 4 trieu o quan Binh Thanh.',
    time: '10:31',
  },
  {
    id: 3,
    sender: 'bot',
    content: 'Ban hay mo trang Tim phong, loc gia <= 4 trieu va khu vuc Binh Thanh de xem ket qua.',
    time: '10:31',
  },
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <div className="fixed right-5 bottom-5 z-50">
      {open && (
        <div className="mb-3 w-[320px] sm:w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">TroHub Chat</h3>
              <p className="text-xs text-blue-100">Ho tro nhanh 24/7</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/90 hover:text-white text-lg leading-none"
              aria-label="Dong khung chat"
            >
              ×
            </button>
          </div>

          <div className="h-72 overflow-y-auto bg-slate-50 px-3 py-3 space-y-2">
            {QUICK_MESSAGES.map((item) => (
              <div
                key={item.id}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  item.sender === 'bot'
                    ? 'bg-white border border-gray-200 text-gray-700'
                    : 'ml-auto bg-blue-600 text-white'
                }`}
              >
                <p>{item.content}</p>
                <p
                  className={`mt-1 text-[11px] ${
                    item.sender === 'bot' ? 'text-gray-400' : 'text-blue-100'
                  }`}
                >
                  {item.time}
                </p>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Nhap tin nhan..."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              />
              <button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded-lg transition-colors"
              >
                Gui
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
        <span className="text-2xl">💬</span>
        {!open && (
          <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
        )}
      </button>
    </div>
  );
}
