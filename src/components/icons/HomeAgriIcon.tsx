import React from "react";

interface HomeAgriIconProps {
  className?: string;
  size?: number;
}

const HomeAgriIcon: React.FC<HomeAgriIconProps> = ({
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
      {/* Tetto del fienile */}
      <path d="M3 9L12 3L21 9" />
      
      {/* Struttura principale */}
      <path d="M4 9V19C4 19.5523 4.44772 20 5 20H9V14C9 13.4477 9.44772 13 10 13H14C14.5523 13 15 13.4477 15 14V20H19C19.5523 20 20 19.5523 20 19V9" />
      
      {/* Finestra superiore del fienile */}
      <circle cx="12" cy="11" r="1.5" fill="currentColor" />
    </svg>
  );
};

export default HomeAgriIcon;

