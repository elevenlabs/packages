import { clsx } from "clsx";
import { JSX } from "preact";

const ICON_MAP = {
  phone: PhoneIcon,
  "phone-off": PhoneSlashIcon,
  chat: ChatIcon,
  mic: MicIcon,
  "mic-off": MicOffIcon,
  check: CheckIcon,
  "chevron-down": ChevronDownIcon,
  "chevron-up": ChevronUpIcon,
  send: SendIcon,
};

const SIZE_CLASSES = {
  sm: "text-xs",
  md: "text-lg",
};

export type IconName = keyof typeof ICON_MAP;

interface IconProps {
  name: IconName;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function Icon({ name, size = "md", className }: IconProps) {
  const DefaultIcon = ICON_MAP[name];
  return (
    <slot
      name={`icon-${name}`}
      className={clsx("flex", SIZE_CLASSES[size], className)}
      aria-hidden={true}
    >
      <DefaultIcon />
    </slot>
  );
}

function PhoneIcon(props: JSX.HTMLAttributes<SVGSVGElement>) {
  return (
    <svg
      height="1em"
      width="1em"
      viewBox="0 0 18 18"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M3.7489 2.25C2.93286 2.25 2.21942 2.92142 2.27338 3.7963C2.6686 10.2041 7.79483 15.3303 14.2026 15.7255C15.0775 15.7795 15.7489 15.066 15.7489 14.25V11.958C15.7489 11.2956 15.3144 10.7116 14.6799 10.5213L12.6435 9.91035C12.1149 9.75179 11.542 9.89623 11.1518 10.2864L10.5901 10.8482C9.15291 10.0389 7.95998 8.84599 7.15074 7.40881L7.71246 6.84709C8.10266 6.45689 8.24711 5.88396 8.08854 5.35541L7.47761 3.31898C7.28727 2.6845 6.70329 2.25 6.04087 2.25H3.7489Z" />
    </svg>
  );
}

function PhoneSlashIcon(props: JSX.HTMLAttributes<SVGSVGElement>) {
  return (
    <svg
      height="1em"
      width="1em"
      viewBox="0 0 19 18"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M16.0303 3.53033C16.3232 3.23744 16.3232 2.76256 16.0303 2.46967C15.7374 2.17678 15.2626 2.17678 14.9697 2.46967L8.6271 8.81224C8.25925 8.3778 7.93185 7.90804 7.65074 7.40881L8.21246 6.84709C8.60266 6.45689 8.74711 5.88396 8.58854 5.35541L7.97761 3.31898C7.78727 2.6845 7.20329 2.25 6.54087 2.25H4.2489C3.43286 2.25 2.71942 2.92142 2.77338 3.7963C2.95462 6.73468 4.13069 9.40357 5.96899 11.4703L2.96967 14.4697C2.67678 14.7626 2.67678 15.2374 2.96967 15.5303C3.26256 15.8232 3.73744 15.8232 4.03033 15.5303L16.0303 3.53033Z" />
      <path d="M14.7026 15.7255C12.2994 15.5773 10.0765 14.7636 8.21584 13.4665L10.9278 10.7545C10.9815 10.7863 11.0356 10.8175 11.0901 10.8482L11.6518 10.2864C12.042 9.89623 12.6149 9.75179 13.1435 9.91035L15.1799 10.5213C15.8144 10.7116 16.2489 11.2956 16.2489 11.958V14.25C16.2489 15.066 15.5775 15.7795 14.7026 15.7255Z" />
    </svg>
  );
}

function ChatIcon(props: JSX.HTMLAttributes<SVGSVGElement>) {
  return (
    <svg
      height="1em"
      width="1em"
      viewBox="0 0 19 18"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M1.5 6.75C1.5 4.26472 3.51472 2.25 6 2.25H12C14.4853 2.25 16.5 4.26472 16.5 6.75V11.25C16.5 13.7353 14.4853 15.75 12 15.75H2.25C1.83579 15.75 1.5 15.4142 1.5 15V6.75ZM6 9.9375C5.48223 9.9375 5.0625 9.51777 5.0625 9C5.0625 8.48223 5.48223 8.0625 6 8.0625C6.51777 8.0625 6.9375 8.48223 6.9375 9C6.9375 9.51777 6.51777 9.9375 6 9.9375ZM9 9.9375C8.48223 9.9375 8.0625 9.51777 8.0625 9C8.0625 8.48223 8.48223 8.0625 9 8.0625C9.51777 8.0625 9.9375 8.48223 9.9375 9C9.9375 9.51777 9.51777 9.9375 9 9.9375ZM11.0625 9C11.0625 9.51777 11.4822 9.9375 12 9.9375C12.5178 9.9375 12.9375 9.51777 12.9375 9C12.9375 8.48223 12.5178 8.0625 12 8.0625C11.4822 8.0625 11.0625 8.48223 11.0625 9Z"
      />
    </svg>
  );
}

function MicIcon(props: JSX.HTMLAttributes<SVGSVGElement>) {
  return (
    <svg
      height="1em"
      width="1em"
      viewBox="0 0 19 18"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M9.50008 1.5C7.42901 1.5 5.75008 3.17893 5.75008 5.25V8.25C5.75008 10.3211 7.42901 12 9.50008 12C11.5712 12 13.2501 10.3211 13.2501 8.25V5.25C13.2501 3.17893 11.5712 1.5 9.50008 1.5Z" />
      <path d="M4.88997 10.8417C4.66448 10.4943 4.20002 10.3954 3.85256 10.6209C3.50509 10.8463 3.40621 11.3108 3.63169 11.6583C4.47442 12.9569 6.08493 14.6838 8.75008 14.9616V15.75C8.75008 16.1642 9.08587 16.5 9.50008 16.5C9.9143 16.5 10.2501 16.1642 10.2501 15.75V14.9616C12.9152 14.6838 14.5257 12.9569 15.3685 11.6583C15.594 11.3108 15.4951 10.8463 15.1476 10.6209C14.8001 10.3954 14.3357 10.4943 14.1102 10.8417C13.3305 12.0432 11.9002 13.5 9.50008 13.5C7.1 13.5 5.66968 12.0432 4.88997 10.8417Z" />
    </svg>
  );
}

function MicOffIcon(props: JSX.HTMLAttributes<SVGSVGElement>) {
  return (
    <svg
      height="1em"
      width="1em"
      viewBox="0 0 19 18"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M13.25 8.25C13.25 8.64791 13.188 9.03135 13.0732 9.39119L6.57947 2.8975C7.26687 2.04521 8.31974 1.5 9.49995 1.5C11.571 1.5 13.25 3.17893 13.25 5.25V8.25Z" />
      <path d="M2.21967 1.71967C2.51256 1.42678 2.98744 1.42678 3.28033 1.71967L16.7803 15.2197C17.0732 15.5126 17.0732 15.9874 16.7803 16.2803C16.4874 16.5732 16.0126 16.5732 15.7197 16.2803L13.2828 13.8435C12.4719 14.4022 11.4678 14.8338 10.25 14.9614V15.75C10.25 16.1642 9.91422 16.5 9.50001 16.5C9.08579 16.5 8.75001 16.1642 8.75001 15.75V14.9616C6.08485 14.6838 4.47434 12.9569 3.63162 11.6583C3.40614 11.3108 3.50502 10.8463 3.85248 10.6209C4.19995 10.3954 4.66441 10.4943 4.88989 10.8417C5.6696 12.0432 7.09993 13.5 9.50001 13.5C10.5978 13.5 11.4845 13.1981 12.1992 12.7598L11.0875 11.6482C10.605 11.8739 10.0667 12 9.50001 12C7.42894 12 5.75001 10.3211 5.75001 8.25V6.31067L2.21967 2.78033C1.92678 2.48744 1.92678 2.01256 2.21967 1.71967Z" />
    </svg>
  );
}

function ChevronDownIcon(props: JSX.HTMLAttributes<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="1em"
      width="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      {...props}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ChevronUpIcon(props: JSX.HTMLAttributes<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="1em"
      width="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      {...props}
    >
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function CheckIcon(props: JSX.HTMLAttributes<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="1em"
      width="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      {...props}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function SendIcon(props: JSX.HTMLAttributes<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="1em"
      width="1em"
      viewBox="0 0 20 20"
      fill="currentColor"
      {...props}
    >
      <path
        d="M2.59413 5.1485C2.04 3.39377 3.86657 1.83482 5.51245 2.65776L16.47 8.13653C18.0055 8.90429 18.0055 11.0955 16.47 11.8633L5.51245 17.3421C3.86656 18.165 2.04 16.6061 2.59413 14.8513L3.86297 10.8333H7.50006C7.9603 10.8333 8.33339 10.4602 8.33339 10C8.33339 9.53976 7.9603 9.16667 7.50006 9.16667H3.86302L2.59413 5.1485Z"
        fill="black"
      />
    </svg>
  );
}
