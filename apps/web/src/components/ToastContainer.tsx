import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "../hooks/useToast";
import ToastItem from "./ToastItem";

const ToastContainer: React.FC = () => {
  const { toasts, remove, removeAll, pauseToast, resumeToast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        removeAll();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [removeAll]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed z-[9999] top-0 right-0 p-4 sm:p-6
                 flex flex-col gap-2 sm:gap-[8px]
                 items-end sm:items-end
                 left-0 sm:left-auto
                 pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 120, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 120, scale: 0.85, transition: { duration: 0.25 } }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
              mass: 0.8,
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x > 80 || info.velocity.x > 500) {
                remove(toast.id);
              }
            }}
            className="pointer-events-auto w-full sm:w-[360px]"
          >
            <ToastItem
              toast={toast}
              onRemove={() => remove(toast.id)}
              onPause={() => pauseToast(toast.id)}
              onResume={() => resumeToast(toast.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
