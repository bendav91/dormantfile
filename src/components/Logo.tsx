interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 24, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Document body with folded corner */}
      <path
        d="M7 4C7 2.89543 7.89543 2 9 2H19L25 8V28C25 29.1046 24.1046 30 23 30H9C7.89543 30 7 29.1046 7 28V4Z"
        fill="#2563EB"
      />
      {/* Folded corner */}
      <path
        d="M19 2L25 8H21C19.8954 8 19 7.10457 19 6V2Z"
        fill="#1D4ED8"
      />
      {/* Crescent moon */}
      <path
        d="M18.5 16C18.5 19.038 16.538 21.598 13.8 22.6C14.51 22.86 15.27 23 16.07 23C19.93 23 23.07 19.86 23.07 16C23.07 12.14 19.93 9 16.07 9C15.27 9 14.51 9.14 13.8 9.4C16.538 10.402 18.5 12.962 18.5 16Z"
        fill="#DBEAFE"
      />
    </svg>
  );
}
