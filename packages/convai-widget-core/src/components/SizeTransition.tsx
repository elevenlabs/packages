import {
  HTMLAttributes,
  PropsWithoutRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/compat";
import { clsx } from "clsx";
import { useCSSTransition } from "../utils/useCssTransition";
import { useReducedMotion } from "../utils/useReducedMotion";

interface SizeTransitionProps
  extends PropsWithoutRef<HTMLAttributes<HTMLSpanElement>> {
  /**
   * Whether the children should be shown.
   *
   * @remarks
   * When set to `false`, the children will fade out and the size will
   * transition towards `0` to make the element disappear.
   */
  visible?: boolean;
  /**
   * Whether the component should grow to fill the available space in a flex
   * layout.
   */
  grow?: boolean;
  /**
   * A dependency used to detect when the size of the children changes.
   */
  dep?: any;
}

/**
 * A component whose size animates to match its content.
 *
 * @param props
 * @constructor
 */
export function SizeTransition(props: SizeTransitionProps) {
  const Comp = useReducedMotion().value ? Reduced : Animated;
  return <Comp {...props} />;
}

function Reduced({
  visible,
  className,
  grow,
  dep,
  ...rest
}: SizeTransitionProps) {
  return visible ? (
    <div className={clsx(grow && "grow", className)} {...rest} />
  ) : null;
}

function Animated({
  visible,
  children,
  className,
  grow,
  dep,
  ...rest
}: SizeTransitionProps) {
  const [retain, setRetain] = useState(visible);
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [wrapper, setWrapper] = useState<HTMLSpanElement | null>(null);
  const cachedChildren = useRef(children);
  if (visible) {
    cachedChildren.current = children;
  }

  const refCallback = useCallback((node: HTMLDivElement | null) => {
    setNode(node);
    if (node && !visible) {
      node.style.width = "0px";
      node.style.height = "0px";
    }
  }, []);

  useEffect(() => {
    if (wrapper) {
      wrapper.style.transition = "none";
      wrapper.style.opacity = "0";
      wrapper.offsetWidth;
      wrapper.style.transition = "";
      wrapper.style.opacity = "";
    }
  }, [dep]);

  // 1. Take the snapshot of the size right before layout changes are applied
  useMemo(() => {
    if (node) {
      node.style.width = `${node.offsetWidth}px`;
      node.style.height = `${node.offsetHeight}px`;
    }
  }, [
    node,
    visible, // node's visibility changed
    dep, // node's content changed
  ]);

  // 2. Start the size animation right after layout changes are applied
  useEffect(() => {
    if (!node || !wrapper) return;
    if (visible) {
      setRetain(true);
    }

    const targetWidth = visible ? wrapper.offsetWidth : 0;
    const targetHeight = visible ? wrapper.offsetHeight : 0;

    node.style.width =
      !visible || node.offsetWidth !== targetWidth ? `${targetWidth}px` : "";
    node.style.height =
      !visible || node.offsetHeight !== targetHeight ? `${targetHeight}px` : "";
  }, [
    node,
    wrapper,
    visible, // node's visibility changed
    dep, // node's content changed
  ]);

  const { transitioning, handlers } = useCSSTransition({
    onEnd: () => {
      if (visible) {
        node!.style.width = "";
        node!.style.height = "";
      } else {
        setRetain(false);
      }
    },
  });

  return (
    <div
      ref={refCallback}
      className={clsx(
        "relative inline-flex shrink-0 justify-center items-center transition-[opacity,width,height,transform,flex-grow] duration-200 min-w-0",
        !visible && "opacity-0 scale-75",
        visible && grow && "grow",
        visible && retain && !transitioning.value && "z-1"
      )}
      {...handlers}
    >
      <div
        ref={setWrapper}
        className={clsx(
          "shrink-0 min-h-min min-w-min transition-opacity duration-200",
          grow && "grow",
          className
        )}
        {...rest}
      >
        {(visible || retain) && cachedChildren.current}
      </div>
    </div>
  );
}
