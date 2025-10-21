import React from "react";

interface FarmIconProps {
  className?: string;
  size?: number;
}

const FarmIcon: React.FC<FarmIconProps> = ({ className = "", size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Base del terreno con effetto 3D */}
      <path d="M3 19L21 19" stroke="currentColor" strokeWidth="1.5" />

      {/* Fienile - struttura principale con effetto 3D */}
      <path
        d="M6 19V12L12 8L18 12V19H6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />

      {/* Tetto del fienile con ombra per effetto 3D */}
      <path d="M6 12L12 8L18 12" stroke="currentColor" strokeWidth="1.5" />

      {/* Porta del fienile */}
      <rect
        x="10"
        y="15"
        width="4"
        height="4"
        stroke="currentColor"
        strokeWidth="1.25"
        fill="none"
      />

      {/* Silos cilindrico con effetto 3D */}
      <path
        d="M19 19V11.5C19 10.5 20 10 20 10V19"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />

      {/* Parte superiore curva del silos */}
      <path
        d="M19 11C19 10 20 10 20 10C20 10 21 10 21 11"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      {/* Anelli del silos per effetto 3D */}
      <path d="M19 13H21M19 16H21" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
};

export default FarmIcon;
