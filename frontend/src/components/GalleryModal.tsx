import React, { useState, useEffect, useCallback, useRef } from "react";

export interface GalleryModalProps {
    images: string[];
    open: boolean;
    onClose: () => void;
    initialIndex?: number;
}

export const GalleryModal: React.FC<GalleryModalProps> = ({
    images,
    open,
    onClose,
    initialIndex = 0,
}) => {
    const [current, setCurrent] = useState(initialIndex);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open) {
            setCurrent(initialIndex);
            modalRef.current?.focus(); // Focus on the modal when it opens
        }
    }, [open, initialIndex]);

    // Keyboard navigation
    const handleKey = useCallback(
        (e: KeyboardEvent) => {
            if (!open) return;
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") setCurrent((c) => Math.max(0, c - 1));
            if (e.key === "ArrowRight") setCurrent((c) => Math.min(images.length - 1, c + 1));
        },
        [open, images.length, onClose]
    );
    useEffect(() => {
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [handleKey]);

    if (!open || !images.length) return null;

    return (
        <div
            ref={modalRef}
            tabIndex={-1} // Make the div focusable
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 22222,
                background: "rgba(38,40,43,0.93)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.4s",
                backdropFilter: "blur(4px)",
            }}
            onClick={onClose}
        >
            <div
                style={{
                    position: "relative",
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: 18,
                    boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
                    padding: "36px 22px 22px 22px",
                    minWidth: 320,
                    minHeight: 340,
                    maxWidth: "90vw",
                    maxHeight: "90vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    outline: "none",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Exit Button */}
                <button
                    dir="rtl"
                    onClick={onClose}
                    style={{
                        position: "absolute",
                        top: 14,
                        left: 14,
                        zIndex: 2,
                        background: "linear-gradient(90deg,#ff7043,#ff9800)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "50%",
                        width: 44,
                        height: 44,
                        fontSize: 23,
                        fontWeight: 800,
                        boxShadow: "0 2px 10px rgba(255,87,34,0.23)",
                        cursor: "pointer",
                        transition: "background 0.18s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                    aria-label="סגור"
                >
                    ×
                </button>
                {/* Image & Arrows */}
                <div
                    style={{
                        width: "100%",
                        minWidth: 320,
                        minHeight: 300,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        gap: 0,
                    }}
                >
                    {/* Left arrow */}
                    <button
                        dir="rtl"
                        style={{
                            position: "absolute",
                            left: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: current === 0 ? "rgba(0,0,0,0.15)" : "rgba(255,87,34,0.4)",
                            border: "none",
                            borderRadius: "50%",
                            color: "#fff",
                            fontSize: 30,
                            width: 50,
                            height: 50,
                            zIndex: 3,
                            cursor: current === 0 ? "not-allowed" : "pointer",
                            opacity: current === 0 ? 0.5 : 1,
                            transition: "opacity 0.2s, background 0.2s",
                        }}
                        disabled={current === 0}
                        onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                        aria-label="הקודם"
                    >
                        {">"}
                    </button>
                    {/* Image */}
                    <img
                        src={images[current]}
                        alt={`gallery-${current}`}
                        style={{
                            maxHeight: "62vh",
                            maxWidth: "74vw",
                            borderRadius: 13,
                            boxShadow: "0 2px 18px rgba(255,87,34,0.13)",
                            background: "#fff",
                            objectFit: "contain",
                            margin: "0 auto",
                            display: "block",
                            transition: "box-shadow 0.2s",
                        }}
                    />
                    {/* Right arrow */}
                    <button
                        dir="rtl"
                        style={{
                            position: "absolute",
                            right: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: current === 0 ? "rgba(0,0,0,0.15)" : "rgba(255,87,34,0.4)",
                            border: "none",
                            borderRadius: "50%",
                            color: "#fff",
                            fontSize: 30,
                            width: 50,
                            height: 50,
                            zIndex: 3,
                            cursor: current === images.length - 1 ? "not-allowed" : "pointer",
                            opacity: current === images.length - 1 ? 0.5 : 1,
                            transition: "opacity 0.2s, background 0.2s",
                        }}
                        disabled={current === images.length - 1}
                        onClick={() => setCurrent((c) => Math.min(images.length - 1, c + 1))}
                        aria-label="הבא"
                    >
                        {"<"}
                    </button>
                </div>
                {/* Counter */}
                <div
                    style={{
                        marginTop: 26,
                        color: "#ff5722",
                        background: "rgba(255,255,255,0.93)",
                        padding: "7px 23px",
                        borderRadius: 10,
                        fontWeight: 800,
                        fontSize: 18,
                        letterSpacing: 1,
                        boxShadow: "0 2px 8px rgba(255,87,34,0.13)",
                        userSelect: "none",
                    }}
                >
                    {current + 1} / {images.length}
                </div>
            </div>
        </div>
    );
};
