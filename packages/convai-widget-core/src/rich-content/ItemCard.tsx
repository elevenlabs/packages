import { Button } from "../components/Button";
import { useConversation } from "../contexts/conversation";

export interface RichContentButton {
  label: string;
  /** Sent as the user's own turn when the button is pressed. */
  message: string;
}

export interface ItemCardProps {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  description?: string;
  /** Already formatted for the customer's locale and currency by the sender. */
  price?: string;
  buttons: RichContentButton[];
}

export function ItemCard({
  title,
  subtitle,
  imageUrl,
  description,
  price,
  buttons,
}: ItemCardProps) {
  const { sendUserMessage, status } = useConversation();
  const disabled = status.value !== "connected";

  return (
    <div className="flex flex-col gap-3 rounded-bubble border border-base-border bg-base p-3">
      <div className="flex gap-3">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            className="w-16 h-16 shrink-0 rounded-input bg-base-active object-cover"
          />
        )}
        <div className="flex min-w-0 flex-col gap-0.5 text-start">
          <span dir="auto" className="text-sm font-medium wrap-break-word">
            {title}
          </span>
          {subtitle && (
            <span dir="auto" className="text-xs text-base-subtle">
              {subtitle}
            </span>
          )}
          {description && (
            <span
              dir="auto"
              className="text-xs text-base-subtle whitespace-pre-line wrap-break-word"
            >
              {description}
            </span>
          )}
          {price && (
            <span className="mt-1 text-sm font-medium tabular-nums">
              {price}
            </span>
          )}
        </div>
      </div>
      {buttons.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {buttons.map(button => (
            <Button
              key={button.message}
              variant="primary"
              disabled={disabled}
              onClick={() => sendUserMessage(button.message)}
            >
              {button.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
