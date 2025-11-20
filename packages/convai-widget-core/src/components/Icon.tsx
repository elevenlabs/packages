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
  star: StarIcon,
  copy: CopyIcon,
  download: DownloadIcon,
  wrap: WrapTextIcon,
  maximize: MaximizeIcon,
  minimize: MinimizeIcon,
};

const SIZE_CLASSES = {
  sm: "text-xs",
  md: "text-lg",
  lg: "text-xl",
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
      <path d="M2.59413 5.1485C2.04 3.39377 3.86657 1.83482 5.51245 2.65776L16.47 8.13653C18.0055 8.90429 18.0055 11.0955 16.47 11.8633L5.51245 17.3421C3.86656 18.165 2.04 16.6061 2.59413 14.8513L3.86297 10.8333H7.50006C7.9603 10.8333 8.33339 10.4602 8.33339 10C8.33339 9.53976 7.9603 9.16667 7.50006 9.16667H3.86302L2.59413 5.1485Z" />
    </svg>
  );
}

function StarIcon(props: JSX.HTMLAttributes<SVGSVGElement>) {
  return (
    <svg
      height="1em"
      width="1em"
      viewBox="0 0 21 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M11.8621 0.854898C11.3145 -0.284967 9.68804 -0.284965 9.1404 0.854899L6.77181 5.78487C6.77181 5.78487 6.76902 5.78867 6.7646 5.78925L1.31499 6.50272C0.0591912 6.66713 -0.452868 8.21568 0.474832 9.09033L4.45896 12.8466C4.46075 12.8483 4.46059 12.8502 4.46059 12.8502L3.46003 18.2169C3.22657 19.4691 4.55184 20.4152 5.66108 19.8172L10.4957 17.2111C10.4991 17.2093 10.5035 17.2093 10.5068 17.2111L15.3415 19.8172C16.4507 20.4152 17.776 19.4691 17.5425 18.2169L16.542 12.8502C16.542 12.8502 16.5418 12.8483 16.5436 12.8466L20.5277 9.09033C21.4554 8.21568 20.9434 6.66713 19.6876 6.50272L14.2379 5.78925C14.2335 5.78867 14.2307 5.78487 14.2307 5.78487L11.8621 0.854898Z" />
    </svg>
  );
}

function CopyIcon(props: JSX.HTMLAttributes<SVGSVGElement>) {
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
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function DownloadIcon(props: JSX.HTMLAttributes<SVGSVGElement>) {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

function WrapTextIcon(props: JSX.HTMLAttributes<SVGSVGElement>) {
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
      <line x1="3" x2="21" y1="6" y2="6" />
      <path d="M3 12h15a3 3 0 1 1 0 6h-4" />
      <polyline points="16 16 14 18 16 20" />
      <line x1="3" x2="10" y1="18" y2="18" />
    </svg>
  );
}

export function FeedbackIcon({
  orbColor,
  circleBackgroundColor,
  starColor,
  className,
}: {
  orbColor: string;
  circleBackgroundColor: string;
  starColor: string;
  className?: string;
}) {
  return (
    <slot
      name="icon-feedback"
      className={clsx("flex", className)}
      aria-hidden={true}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 82 88"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M9 42C9 59.6731 23.3269 74 41 74C58.6731 74 73 59.6731 73 42C73 24.3269 58.6731 10 41 10C23.3269 10 9 24.3269 9 42ZM29.4529 18.5973C31.1347 18.0574 32.8641 17.5023 34.9844 16.6005C42.2533 13.5091 48.3526 11.9217 51.7782 14.094C53.5063 15.1899 54.4051 16.7749 55.6117 18.9024C56.7969 20.9922 58.279 23.6057 61.1358 26.7937C62.2737 28.0636 63.3886 29.2195 64.4371 30.3064C68.7007 34.7263 71.8645 38.0061 70.9949 43.1697C70.2965 47.316 67.9794 49.4559 65.6038 51.65C63.4317 53.656 61.2107 55.7073 60.1332 59.3786C57.8774 67.0653 53.5327 71.9113 48.3526 72.7468C43.1725 73.5823 36.6555 75.1698 29.8043 70.1567C26.1949 67.5157 25.229 64.3182 24.1947 60.894C23.2657 57.8184 22.2814 54.56 19.2768 51.3577C14.1619 45.9062 10.2533 29.6345 19.2768 23.0339C23.736 20.4327 26.5223 19.5382 29.4529 18.5973Z"
          fill={orbColor}
          fill-opacity="0.15"
          stroke={orbColor}
          stroke-opacity="0.35"
        />
        <path
          d="M43.5 73.4212C40.4387 73.4212 35.0039 71.1025 37.556 56.4696C40.143 41.6365 42.6582 40.577 44.6991 25.744C46.3318 13.8775 41.1635 8.87964 33 10.9988"
          stroke={orbColor}
          stroke-opacity="0.35"
        />
        <path
          d="M43.5 73.4212C40.4387 73.4212 35.0039 71.1025 37.556 56.4696C40.143 41.6365 42.6582 40.577 44.6991 25.744C46.3318 13.8775 41.1635 8.87964 33 10.9988"
          stroke={orbColor}
          stroke-opacity="0.35"
        />
        <path
          d="M21.9366 68.1987C21.3549 66.5119 21.0386 60.9231 28.1376 53.3448C37.0114 43.8719 40.5 43.9579 51.4911 31.7482C59.5691 22.7747 59.1723 17.0524 58.0993 15.4626"
          stroke={orbColor}
          stroke-opacity="0.35"
        />
        <path
          d="M9.26819 42.161C10.4003 43.5337 15.6951 46.3853 25.7661 44.3926C38.3548 41.9018 52.434 40.307 57.694 41.0287C70.352 42.7655 71.4138 51.3035 71.4138 51.3035"
          stroke={orbColor}
          stroke-opacity="0.35"
        />
        <path
          d="M22 16.4916C18.815 21.85 19.6451 26.0591 27.9943 32.0828C38.4307 39.6124 50.2985 48.8304 53.5024 53.1027C58.6684 59.9914 59.5 67.928 59.5 67.928"
          stroke={orbColor}
          stroke-opacity="0.35"
        />
        <rect
          x="9.26099"
          y="10"
          width="63.7129"
          height="63.7129"
          rx="31.8565"
          stroke={orbColor}
          stroke-opacity="0.43"
          stroke-width="1.5"
        />
        <g clip-path="url(#clip0_7006_42127)">
          <circle
            cx="62.4996"
            cy="18.2032"
            r="15.0195"
            transform="rotate(6.27205 62.4996 18.2032)"
            fill={circleBackgroundColor}
          />
          <path
            d="M60.7142 12.1753C62.057 10.0714 65.2294 10.4202 66.0833 12.7654L66.6158 14.2308L68.1251 14.6217C70.5415 15.2484 71.1908 18.3742 69.2237 19.911L67.9944 20.8704L68.0896 22.4262C68.2403 24.9178 65.4681 26.5011 63.3987 25.1056L62.1065 24.2326L60.6555 24.8041C58.3322 25.7172 55.9702 23.5694 56.6585 21.1698L57.0884 19.6717L56.0977 18.4684C54.5112 16.541 55.8231 13.6307 58.318 13.5438L59.8751 13.4899L60.7142 12.1753Z"
            fill={starColor}
            stroke={circleBackgroundColor}
            stroke-width="3.27381"
          />
          <path
            d="M63.925 5.23719C71.0867 6.02431 76.2545 12.4676 75.4676 19.6293C74.6805 26.7911 68.2364 31.959 61.0746 31.1718C53.9129 30.3845 48.7459 23.9406 49.533 16.7789C50.3203 9.61739 56.7634 4.45029 63.925 5.23719ZM63.6957 7.32326C57.6866 6.66302 52.2797 10.9991 51.6191 17.0082C50.9586 23.0174 55.2946 28.4251 61.3038 29.0858C67.3132 29.7462 72.7211 25.4094 73.3816 19.4C74.0418 13.3908 69.705 7.98372 63.6957 7.32326Z"
            fill={starColor}
            stroke={circleBackgroundColor}
            stroke-width="0.3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </g>
        <ellipse
          cx="41"
          cy="85"
          rx="15"
          ry="3"
          fill={orbColor}
          fill-opacity="0.35"
        />
        <defs>
          <clipPath id="clip0_7006_42127">
            <rect
              width="33"
              height="33"
              fill="white"
              transform="translate(47.9012) rotate(6.27205)"
            />
          </clipPath>
        </defs>
      </svg>
    </slot>
  );
}

function MaximizeIcon(props: JSX.HTMLAttributes<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      {...props}
    >
      <path d="M15 3h6v6" />
      <path d="m21 3-7 7" />
      <path d="m3 21 7-7" />
      <path d="M9 21H3v-6" />
    </svg>
  );
}

function MinimizeIcon(props: JSX.HTMLAttributes<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      {...props}
    >
      <path d="m14 10 7-7" />
      <path d="M20 10h-6V4" />
      <path d="m3 21 7-7" />
      <path d="M4 14h6v6" />
    </svg>
  );
}
