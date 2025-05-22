import { useComputed, useSignalEffect } from "@preact/signals";
import { useCallback, useEffect, useRef, useState } from "preact/compat";

import { useAvatarConfig } from "../contexts/avatar-config";
import { useConversation } from "../contexts/conversation";
import { Orb } from "../orb/Orb";
import { clsx } from "clsx";

const SIZE_CLASSES = {
  sm: "w-9 h-9",
  lg: "w-48 h-48",
};

interface AvatarProps {
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function Avatar({ size = "sm", className }: AvatarProps) {
  const { getInputVolume, getOutputVolume, isSpeaking, isDisconnected } =
    useConversation();
  const { config } = useAvatarConfig();
  const backgroundRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useSignalEffect(() => {
    if (isDisconnected.value) {
      backgroundRef.current!.style.transform = "";
      imageRef.current!.style.transform = "";

      return;
    }

    let id: number;
    function draw() {
      const inputVolume = getInputVolume();
      const outputVolume = getOutputVolume();

      const inputScale = isSpeaking.peek() ? 1 : 1 - inputVolume * 0.4;
      const outputScale = !isSpeaking.peek() ? 1 : 1 + outputVolume * 0.4;

      backgroundRef.current!.style.transform = `scale(${outputScale})`;
      imageRef.current!.style.transform = `scale(${inputScale})`;

      id = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(id);
    };
  });

  const style = useComputed(() => ({
    backgroundImage:
      config.value.type === "image"
        ? `url(${config.value.url})`
        : config.value.type === "url"
          ? `url(${config.value.custom_url})`
          : undefined,
  }));

  return (
    <div className={clsx("relative shrink-0", SIZE_CLASSES[size], className)}>
      <div
        ref={backgroundRef}
        className="absolute inset-0 rounded-full bg-base-border"
      />
      <div
        ref={imageRef}
        style={style}
        className="absolute inset-0 rounded-full overflow-hidden bg-base bg-cover"
      >
        {config.value.type === "orb" && (
          <OrbCanvas
            color1={config.value.color_1}
            color2={config.value.color_2}
          />
        )}
      </div>
    </div>
  );
}

function OrbCanvas({ color1, color2 }: { color1: string; color2: string }) {
  const { canvasUrl } = useAvatarConfig();
  const [orb, setOrb] = useState<Orb | null>(null);
  useEffect(() => {
    if (orb) {
      orb.updateColors(color1, color2);
      orb.render();
      canvasUrl.value = orb.toDataURL();
    }
  }, [orb, color1, color2]);

  const setupOrb = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (canvas) {
        const reference = new Orb(canvas);
        setOrb(reference);
        return () => reference.dispose();
      } else {
        setOrb(null);
      }
    },
    [setOrb]
  );

  return <canvas className="w-full h-full" ref={setupOrb} />;
}
