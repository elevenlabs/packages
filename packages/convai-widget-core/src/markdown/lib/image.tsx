import { DownloadIcon } from "lucide-react";
import type { DetailedHTMLProps, ImgHTMLAttributes } from "react";
import type { ExtraProps } from "react-markdown";
import { useContext } from "preact/compat";
import { cn, save } from "./utils";
import { Button } from "../../components/Button";
import { StreamdownRuntimeContext } from "../index";
import { FloatingCard } from "./floating-card";

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
  const { isAnimating } = useContext(StreamdownRuntimeContext);

  const downloadImage = async () => {
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
    }
  };

  if (!src) {
    return null;
  }

  return (
    <FloatingCard
      containerClassName="inline-block self-auto"
      data-streamdown="image-wrapper"
      actions={
        <Button
          aria-label="Download image"
          disabled={isAnimating}
          icon="download"
          onClick={downloadImage}
          variant="md-button"
        >
          Download
        </Button>
      }
    >
      <img
        alt={alt}
        className={cn("max-w-full rounded-bubble", className)}
        data-streamdown="image"
        src={src}
        {...props}
      />
    </FloatingCard>
  );
};
