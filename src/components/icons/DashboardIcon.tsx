import React from "react";

interface DashboardIconProps {
  className?: string;
  size?: number;
}

const DashboardIcon: React.FC<DashboardIconProps> = ({
  className = "",
  size = 24,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Quadrato in alto a sinistra */}
      <rect
        x="4"
        y="4"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        fill="none"
      />

      {/* Quadrato in alto a destra (ruotato) */}
      <rect
        x="13"
        y="4"
        width="7"
        height="7"
        rx="1.5"
        transform="rotate(45 16.5 7.5)"
        stroke="currentColor"
        fill="none"
      />

      {/* Quadrato in basso a sinistra */}
      <rect
        x="4"
        y="13"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        fill="none"
      />

      {/* Quadrato in basso a destra */}
      <rect
        x="13"
        y="13"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        fill="none"
      />
    </svg>
  );
};

export default DashboardIcon;
