import { useCallback, useContext } from "preact/compat";
import type { DetailedHTMLProps, ImgHTMLAttributes } from "react";
import type { ExtraProps } from "react-markdown";
import { cn } from "../../utils/cn";
import { StreamdownRuntimeContext } from "../index";
import { save } from "../utils/utils";
import { ContentBlock } from "./ContentBlock";
import { Button } from "../../components/Button";
import { useTextContents } from "../../contexts/text-contents";

function useDownloadImage({
  src,
  alt,
  onError,
}: {
  src: string;
  alt?: string;
  onError?: (error: Error) => void;
}) {
  const { isAnimating } = useContext(StreamdownRuntimeContext);

  const downloadImage = useCallback(async () => {
    if (!src) {
      return;
    }

    try {
      const response = await fetch(src.toString());
      const blob = await response.blob();

      // Extract filename from URL or use alt text with proper extension
      const urlPath = new URL(src.toString(), window.location.origin).pathname;
      const originalFilename = urlPath.split("/").pop() || "";
      const hasExtension =
        originalFilename.includes(".") &&
        originalFilename.split(".").pop()?.length! <= 4;

      let filename = "";

      if (hasExtension) {
        filename = originalFilename;
      } else {
        // Determine extension from blob type
        const mimeType = blob.type;
        let extension = "png"; // default

        if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
          extension = "jpg";
        } else if (mimeType.includes("png")) {
          extension = "png";
        } else if (mimeType.includes("svg")) {
          extension = "svg";
        } else if (mimeType.includes("gif")) {
          extension = "gif";
        } else if (mimeType.includes("webp")) {
          extension = "webp";
        }

        const baseName = alt || originalFilename || "image";
        filename = `${baseName.toString().replace(/\.[^/.]+$/, "")}.${extension}`;
      }

      save(filename, blob, blob.type);
    } catch (error) {
      console.error("Failed to download image:", error);
      onError?.(error as Error);
    }
  }, [src, alt, onError]);

  return {
    downloadImage,
    disabled: isAnimating,
  };
}

type ImageComponentProps = DetailedHTMLProps<
  ImgHTMLAttributes<HTMLImageElement>,
  HTMLImageElement
> &
  ExtraProps;

export const ImageComponent = ({
  node,
  className,
  src,
  alt,
  ...props
}: ImageComponentProps) => {
  const { downloadImage, disabled } = useDownloadImage({
    src: src?.toString() || "",
    alt: alt?.toString(),
  });
  const textContents = useTextContents();

  if (!src) {
    return null;
  }

  return (
    <ContentBlock className="inline-block self-auto" data-streamdown="image-wrapper">
      <ContentBlock.Actions>
        <Button
          aria-label={textContents.download.value}
          disabled={disabled}
          icon="download"
          onClick={downloadImage}
          variant="md-button"
        >
          {textContents.download.value}
        </Button>
      </ContentBlock.Actions>
      <ContentBlock.Content>
        <img
          alt={alt}
          className={cn("max-w-full", className)}
          data-streamdown="image"
          src={src}
          {...props}
        />
      </ContentBlock.Content>
    </ContentBlock>
  );
};
