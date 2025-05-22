import { ImgHTMLAttributes } from "preact/compat";
import { clsx } from "clsx";

const SIZE_CLASSES = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
};

interface FlagProps extends ImgHTMLAttributes<HTMLImageElement> {
  size?: keyof typeof SIZE_CLASSES;
  flagCode: string;
}

export function Flag({
  size = "md",
  flagCode,
  className,
  ...props
}: FlagProps) {
  return (
    <img
      className={clsx(
        "rounded-full object-cover",
        SIZE_CLASSES[size],
        className
      )}
      src={`https://storage.googleapis.com/eleven-public-cdn/images/flags/circle-flags/${flagCode}.svg`}
      alt={`${flagCode.toUpperCase()} flag`}
      {...props}
    />
  );
}
