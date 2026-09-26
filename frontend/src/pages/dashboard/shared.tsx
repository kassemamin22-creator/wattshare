import { useEffect, useState } from "react";
import { animate } from "framer-motion";

interface CountUpValueProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

export function CountUpValue({ value, decimals = 0, prefix = "", suffix = "" }: CountUpValueProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (latest) => setDisplayValue(latest),
    });

    return () => controls.stop();
  }, [value]);

  return (
    <>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </>
  );
}
