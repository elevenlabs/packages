import { HTMLAttributes, useContext, useEffect, useRef } from "preact/compat";
import { useSignal } from "@preact/signals";
import { StreamdownRuntimeContext } from "../index";
import { Button } from "../../components/Button";
import { ContentBlock } from "./ContentBlock";
import { cn } from "../../utils/cn";

function extractTableDataFromElement(tableElement: HTMLElement) {
  const headers: string[] = [];
  const rows: string[][] = [];

  // Extract headers
  const headerCells = tableElement.querySelectorAll("thead th");
  for (const cell of Array.from(headerCells)) {
    headers.push(cell.textContent?.trim() || "");
  }

  // Extract rows
  const bodyRows = tableElement.querySelectorAll("tbody tr");
  for (const row of Array.from(bodyRows)) {
    const rowData: string[] = [];
    const cells = row.querySelectorAll("td");
    for (const cell of Array.from(cells)) {
      rowData.push(cell.textContent?.trim() || "");
    }
    rows.push(rowData);
  }

  return { headers, rows };
}

function tableDataToMarkdown(data: { headers: string[]; rows: string[][] }) {
  const { headers, rows } = data;

  if (headers.length === 0) {
    return "";
  }

  const markdownRows: string[] = [];

  // Add headers
  const escapedHeaders = headers.map(h => h.replace(/\|/g, "\\|"));
  markdownRows.push(`| ${escapedHeaders.join(" | ")} |`);

  // Add separator row
  markdownRows.push(`| ${headers.map(() => "---").join(" | ")} |`);

  // Add data rows
  for (const row of rows) {
    // Pad row with empty strings if it's shorter than headers
    const paddedRow = [...row];
    while (paddedRow.length < headers.length) {
      paddedRow.push("");
    }
    const escapedRow = paddedRow.map(cell => cell.replace(/\|/g, "\\|"));
    markdownRows.push(`| ${escapedRow.join(" | ")} |`);
  }

  return markdownRows.join("\n");
}

export function useCopyTable({
  onCopy,
  onError,
  timeout = 2000,
}: {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
} = {}) {
  const isCopied = useSignal<boolean>(false);
  const timeoutRef = useRef(0);
  const { isAnimating } = useContext(StreamdownRuntimeContext);

  const copyTableData = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (typeof window === "undefined" || !navigator?.clipboard?.write) {
      onError?.(new Error("Clipboard API not available"));
      return;
    }

    try {
      if (!isCopied.value) {
        // Find the closest table element
        const button = event.currentTarget;
        const tableWrapper = button.closest(
          '[data-streamdown="table-wrapper"]'
        );
        const tableElement = tableWrapper?.querySelector(
          "table"
        ) as HTMLTableElement;

        if (!tableElement) {
          onError?.(new Error("Table not found"));
          return;
        }

        const tableData = extractTableDataFromElement(tableElement);
        const clipboardItemData = new ClipboardItem({
          "text/plain": tableDataToMarkdown(tableData),
          "text/html": new Blob([tableElement.outerHTML], {
            type: "text/html",
          }),
        });

        await navigator.clipboard.write([clipboardItemData]);
        isCopied.value = true;
        onCopy?.();
        timeoutRef.current = window.setTimeout(
          () => (isCopied.value = false),
          timeout
        );
      }
    } catch (error) {
      onError?.(error as Error);
    }
  };

  useEffect(() => {
    return () => {
      window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return {
    isCopied,
    copyTableData,
    disabled: isAnimating,
  };
}

export const TableComponent = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLTableElement>) => {
  const { isCopied, copyTableData, disabled } = useCopyTable();

  return (
    <ContentBlock data-streamdown="table-wrapper">
      <ContentBlock.Actions>
        <Button
          aria-label={isCopied.value ? "Copied" : "Copy table as markdown"}
          disabled={disabled}
          icon={isCopied.value ? "check" : "copy"}
          onClick={copyTableData}
          variant="md-button"
        >
          {isCopied.value ? "Copied" : "Copy"}
        </Button>
      </ContentBlock.Actions>
      <ContentBlock.Content className="overflow-x-auto">
        <table
          className={cn(
            "w-full border-collapse border border-base-border",
            className
          )}
          data-streamdown="table"
          {...props}
        >
          {children}
        </table>
      </ContentBlock.Content>
    </ContentBlock>
  );
};