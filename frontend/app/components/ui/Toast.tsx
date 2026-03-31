import React, { useState, useImperativeHandle, forwardRef } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastHandle {
  show: (message: string, type?: ToastType) => void;
  hide: () => void;
}

const config = {
  success: {
    bg: "bg-green-500",
    icon: (
      <svg
        className="w-3 h-3 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
          d="M5 13l4 4L19 7"
        />
      </svg>
    ),
  },
  error: {
    bg: "bg-red-500",
    icon: (
      <svg
        className="w-3 h-3 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    ),
  },
  info: {
    bg: "bg-blue-500",
    icon: (
      <svg
        className="w-3 h-3 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
};

export const Toast = forwardRef<ToastHandle, {}>((_, ref) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ToastType>("success");
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const hide = () => {
    setVisible(false);
    if (timer) {
      clearTimeout(timer);
      setTimer(null);
    }
  };

  useImperativeHandle(ref, () => ({
    show(msg: string, t: ToastType = "success") {
      if (timer) clearTimeout(timer);

      setMessage(msg);
      setType(t);
      setVisible(true);

      // Ошибки не закрываем автоматически, остальные — через 3 секунды
      if (t !== "error") {
        const newTimer = setTimeout(() => setVisible(false), 3000);
        setTimer(newTimer);
      } else {
        setTimer(null);
      }
    },
    hide,
  }));

  const currentConfig = config[type];

  return (
    <div
      className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-out 
      ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"}
      w-[calc(100%-2rem)] max-w-md`}
    >
      <div className="bg-slate-900/95 backdrop-blur-sm text-white px-5 py-4 rounded-2xl shadow-2xl flex items-start gap-3 border border-white/10 relative group">
        {/* Индикатор статуса */}
        <div
          className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 mt-0.5 ${currentConfig.bg}`}
        >
          {currentConfig.icon}
        </div>

        {/* Текст (многострочный) */}
        <span className="text-sm font-medium tracking-wide break-words flex-1 pr-1">
          {message}
        </span>

        {/* Кнопка закрытия (только для ошибок) */}
        {type === "error" && (
          <button
            onClick={hide}
            className="shrink-0 p-1 -mr-1 -mt-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Закрыть"
          >
            <svg
              className="w-4 h-4 text-white/40 group-hover:text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
});

Toast.displayName = "Toast";
