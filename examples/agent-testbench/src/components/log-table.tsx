import { useCallback, useEffect, useRef } from "react";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useLogEntries } from "@/components/log-provider";
import { useConversationStatus } from "@/components/conversation-provider";

function formatArgs(args: unknown[]) {
  return args
    .map(arg => {
      if (typeof arg === "object") {
        return JSON.stringify(arg, null, 2);
      }
      return String(arg);
    })
    .join(", ");
}

export function LogTable() {
  const entries = useLogEntries();
  const containerRef = useRef<HTMLDivElement>(null);
  const status = useConversationStatus();

  const scrollToEvents = useCallback(() => {
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
  }, [containerRef]);

  useEffect(() => {
    if (status.status === "connecting") {
      scrollToEvents();
    }
  }, [status.status, scrollToEvents]);

  return (
    <div className="basis-0 grow overflow-y-auto" ref={containerRef}>
      <Table>
        <TableCaption>Log of events from the conversation</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Part</TableHead>
            <TableHead className="w-[100px]">Method</TableHead>
            <TableHead>Arguments</TableHead>
            <TableHead className="w-[100px] text-right">Δt [ms]</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry, index) => {
            const previousEntry = entries[index - 1];
            const delta = previousEntry ? entry.when - previousEntry.when : 0;
            const formattedArgs = formatArgs(entry.args);
            return (
              <TableRow key={index}>
                <TableCell className="font-medium">{entry.part}</TableCell>
                <TableCell className="font-medium">{entry.method}</TableCell>
                <TableCell className="truncate max-w-0" title={formattedArgs}>
                  {formattedArgs}
                </TableCell>
                <TableCell className="text-right">{delta}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
