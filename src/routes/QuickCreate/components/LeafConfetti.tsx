import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const LEAF_COLORS = [
  "#22c55e", // green-500
  "#16a34a", // green-600
  "#15803d", // green-700
  "#4ade80", // green-400
  "#86efac", // green-300
  "#166534", // green-800
];

const LEAF_COUNT = 25;

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

interface Leaf {
  id: number;
  x: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  drift: number;
  rotation: number;
}

function generateLeaves(): Leaf[] {
  return Array.from({ length: LEAF_COUNT }, (_, i) => ({
    id: i,
    x: randomBetween(5, 95),
    color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
    size: randomBetween(16, 32),
    delay: randomBetween(0, 1.5),
    duration: randomBetween(2.5, 4.5),
    drift: randomBetween(-60, 60),
    rotation: randomBetween(360, 720),
  }));
}

function LeafSvg({ color, size }: { color: string; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8 20C19 20 22 3 22 3C21 5 14 5.25 9 6.25C4 7.25 2 11.5 2 13.5C2 15.5 3.75 17.25 3.75 17.25C7 8 17 8 17 8Z"
        fill={color}
      />
    </svg>
  );
}

export default function LeafConfetti() {
  const [leaves, setLeaves] = useState<Leaf[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setLeaves(generateLeaves());

    const timer = setTimeout(() => {
      setVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {leaves.map((leaf) => (
            <motion.div
              key={leaf.id}
              initial={{
                y: -50,
                x: `${leaf.x}vw`,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                y: "110vh",
                x: `calc(${leaf.x}vw + ${leaf.drift}px)`,
                rotate: leaf.rotation,
                opacity: [1, 1, 0.8, 0],
              }}
              transition={{
                duration: leaf.duration,
                delay: leaf.delay,
                ease: "easeIn",
              }}
              style={{ position: "absolute" }}
            >
              <LeafSvg color={leaf.color} size={leaf.size} />
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
