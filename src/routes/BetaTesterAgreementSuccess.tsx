import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const LEAF_COUNT = 30;

const LEAF_COLORS = [
  "#22c55e",
  "#16a34a",
  "#4ade80",
  "#86efac",
  "#15803d",
  "#a3e635",
  "#65a30d",
];

type Leaf = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  rotation: number;
  swayAmplitude: number;
};

function generateLeaves(): Leaf[] {
  return Array.from({ length: LEAF_COUNT }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 4,
    duration: 4 + Math.random() * 4,
    size: 12 + Math.random() * 14,
    color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
    rotation: Math.random() * 360,
    swayAmplitude: 20 + Math.random() * 40,
  }));
}

function FallingLeaf({ leaf }: { leaf: Leaf }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${leaf.left}%`,
        top: "-30px",
        animation: `leafFall ${leaf.duration}s ease-in ${leaf.delay}s infinite, leafSway ${leaf.duration * 0.5}s ease-in-out ${leaf.delay}s infinite alternate`,
      }}
    >
      <svg
        width={leaf.size}
        height={leaf.size}
        viewBox="0 0 24 24"
        fill={leaf.color}
        style={{
          transform: `rotate(${leaf.rotation}deg)`,
          opacity: 0.85,
        }}
      >
        <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20c4 0 8.71-3 11-8a3.13 3.13 0 0 0 .18-2.82A3.13 3.13 0 0 0 17 8z" />
        <path d="M11 2C7 2 3.29 5 1 10a3.13 3.13 0 0 0-.18 2.82A3.13 3.13 0 0 0 3 14c9-2 11.1-8.17 13.18-13.34L14.29 0l-1 2.3A4.49 4.49 0 0 0 12 2z" opacity="0.5" />
      </svg>
    </div>
  );
}

type LocationState = {
  pdfBlob?: number[];
  pdfFileName?: string;
};

export default function BetaTesterAgreementSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  const [showContent, setShowContent] = useState(false);

  const leaves = useMemo(() => generateLeaves(), []);

  useEffect(() => {
    if (!state?.pdfBlob || !state?.pdfFileName) {
      navigate("/diventa-beta-tester", { replace: true });
      return;
    }
    const timeout = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timeout);
  }, [state, navigate]);

  const handleDownloadPdf = useCallback(() => {
    if (!state?.pdfBlob || !state?.pdfFileName) return;
    const blob = new Blob([new Uint8Array(state.pdfBlob)], {
      type: "application/pdf",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = state.pdfFileName;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  }, [state]);

  if (!state?.pdfBlob) return null;

  return (
    <div className="relative min-h-screen bg-white overflow-hidden flex items-center justify-center px-4">
      <style>{`
        @keyframes leafFall {
          0% { transform: translateY(-30px); opacity: 0; }
          10% { opacity: 0.85; }
          90% { opacity: 0.85; }
          100% { transform: translateY(105vh); opacity: 0; }
        }
        @keyframes leafSway {
          0% { margin-left: -30px; }
          100% { margin-left: 30px; }
        }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Falling leaves */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {leaves.map((leaf) => (
          <FallingLeaf key={leaf.id} leaf={leaf} />
        ))}
      </div>

      {/* Content */}
      <div
        className="relative z-10 text-center max-w-lg mx-auto space-y-8"
        style={{
          animation: showContent ? "fadeInUp 0.8s ease-out forwards" : "none",
          opacity: showContent ? undefined : 0,
        }}
      >
        <div className="space-y-4">
          <div className="text-6xl md:text-7xl">🌿</div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Grazie!
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Il tuo accordo Beta Tester è stato inviato correttamente.
            <br />
            Riceverai una copia via email.
          </p>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="w-full py-4 px-6 rounded-2xl bg-agri-green-600 text-white font-semibold text-lg hover:bg-agri-green-700 transition shadow-lg hover:shadow-xl"
          >
            Scarica PDF del contratto firmato
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full py-3 px-6 rounded-2xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
          >
            Torna alla home
          </button>
        </div>
      </div>
    </div>
  );
}
