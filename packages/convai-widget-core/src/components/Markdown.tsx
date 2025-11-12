import { Streamdown } from "../markdown";

export const Markdown = ({ text }: { text: string }) => {
  return <Streamdown>{text}</Streamdown>;
};
