import React, { useState } from "react";
import { GalleryModal } from "./GalleryModal";

interface StackedImagesGalleryProps {
    images: string[];
}

const COLORS = [
    "rgba(255,107,53,0.95)",
    "rgba(255,87,34,0.88)",
    "rgba(255,138,101,0.92)",
];

export const StackedImagesGallery: React.FC<StackedImagesGalleryProps> = ({ images }) => {
    const [open, setOpen] = useState(false);
    const [modalKey, setModalKey] = useState(0); // To force remount for focus

    if (!images?.length) return null;
    const maxShow = 5;
    const showImages = images.slice(0, maxShow);
    const extra = images.length - maxShow;

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                width: "100%",
                maxWidth: 400,
                cursor: "pointer",
            }}
            tabIndex={0}
            onClick={() => {
                setOpen(true);
                setModalKey((k) => k + 1); // Force GalleryModal remount for focus
            }}
            title="לחץ כדי להציג את כל התמונות"
        >
            {/* Images Stack */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    minHeight: 72,
                    marginLeft: 160,
                    userSelect: "none",
                }}
            >
                {showImages.map((src, idx) => (
                    <div
                        key={idx}
                        style={{
                            position: "absolute",
                            right: idx * 24,
                            zIndex: showImages.length - idx,
                            transform: `rotate(${(idx - 2) * 3}deg) scale(${1 - idx * 0.05})`,
                            boxShadow: `0 2px 12px ${COLORS[idx % COLORS.length]}`,
                            borderRadius: 8,
                            border: "2px solid #fff",
                            overflow: "hidden",
                            background: "#fff",
                            width: 64,
                            height: 64,
                            transition: "box-shadow 0.2s, transform 0.2s",
                        }}
                    >
                        <img
                            src={src}
                            alt={`image-${idx}`}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block",
                            }}
                        />
                    </div>
                ))}
                {extra > 0 && (
                    <div
                        style={{
                            position: "absolute",
                            right: showImages.length * 24,
                            zIndex: 1,
                            width: 60,
                            height: 60,
                            borderRadius: 8,
                            background: "linear-gradient(135deg, #fff3e0, #ff7043)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#ff5722",
                            fontWeight: 700,
                            fontSize: 18,
                            border: "2px solid #fff",
                            boxShadow: "0 2px 8px rgba(255, 87, 34, 0.15)",
                        }}
                    >
                        +{extra}
                    </div>
                )}
            </div>

            {/* Centered Button */}
            <div
                style={{
                    fontWeight: 700,
                    fontSize: 18,
                    color: "#ffffff",
                    padding: "10px 20px",
                    borderRadius: 24,
                    background: "linear-gradient(90deg, #ff6f61, #ff8a50)",
                    boxShadow: "0 4px 12px rgba(255, 87, 34, 0.3)",
                    marginTop: 16,
                    letterSpacing: 0.8,
                    textAlign: "center",
                    transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.05)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(255, 87, 34, 0.4)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 87, 34, 0.3)";
                }}
                onClick={() => setOpen(true)}
            >
                צפה בתמונות
            </div>

            {/* Modal */}
            <GalleryModal
                key={modalKey}
                images={images}
                open={open}
                onClose={() => setOpen(false)}
            />
        </div>
    );
};
