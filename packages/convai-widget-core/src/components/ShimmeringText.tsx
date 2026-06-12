import { cn } from "../utils/cn";

export function ShimmeringText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return <span className={cn("animate-text", className)}>{text}</span>;
}
