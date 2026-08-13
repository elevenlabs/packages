import { Button } from "../components/Button";
import { useConversation } from "../contexts/conversation";

export interface MessageButton {
  type: "message";
  label: string;
  message: string;
}

export interface LinkButton {
  type: "link";
  label: string;
  link: string;
}

export type RichContentButton = MessageButton | LinkButton;

export interface ButtonGroupProps {
  buttons: RichContentButton[];
}

export function ButtonGroup({ buttons }: ButtonGroupProps) {
  const { sendUserMessage, status } = useConversation();
  const disabled = status.value !== "connected";

  if (buttons.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map((button, index) =>
        button.type === "link" ? (
          <Button key={index} as="a" variant="outline" href={button.link}>
            {button.label}
          </Button>
        ) : (
          <Button
            key={index}
            variant="outline"
            disabled={disabled}
            onClick={() => sendUserMessage(button.message)}
          >
            {button.label}
          </Button>
        )
      )}
    </div>
  );
}
