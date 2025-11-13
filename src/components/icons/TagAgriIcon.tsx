import React from "react";

interface TagAgriIconProps {
  className?: string;
  size?: number;
}

const TagAgriIcon: React.FC<TagAgriIconProps> = ({
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
      {/* Tag principale */}
      <path d="M3.5 10.5V6C3.5 5.17157 4.17157 4.5 5 4.5H9.5L17.5 12.5C18.3284 13.3284 18.3284 14.6716 17.5 15.5L15.5 17.5C14.6716 18.3284 13.3284 18.3284 12.5 17.5L3.5 10.5Z" />
      
      {/* Piccola foglia decorativa sull'etichetta */}
      <path d="M9 8.5C9 8.5 10 7.5 11 8.5C12 9.5 11.5 10.5 11 11" />
      <path d="M9.5 9L11 10.5" />
      
      {/* Foro per il filo */}
      <circle cx="7" cy="7" r="1" fill="currentColor" />
    </svg>
  );
};

export default TagAgriIcon;

