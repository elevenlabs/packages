import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { FunnelIcon } from "lucide-react";

import { useLogEntries } from "@/components/log-provider";
import { useConversationStatus } from "@/components/conversation-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import { CallLogEntry } from "@/lib/utils";

function getHiddenMethodsFromStorage() {
  const hiddenMethods = localStorage.getItem("log-table-hidden-methods");
  return hiddenMethods ? JSON.parse(hiddenMethods) : [];
}

function setHiddenMethodsToStorage(hiddenMethods: string[]) {
  localStorage.setItem(
    "log-table-hidden-methods",
    JSON.stringify(hiddenMethods)
  );
}

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

function ArgumentsContent({ entry }: { entry: CallLogEntry }) {
  const formattedArgs = formatArgs(entry.args);
  return <>{formattedArgs}</>;
}

export function LogTable() {
  const containerRef = useRef<HTMLTableElement>(null);
  const { status } = useConversationStatus();
  const [hiddenMethods, setHiddenMethods] = useState<string[]>(
    getHiddenMethodsFromStorage
  );

  useEffect(() => {
    setHiddenMethodsToStorage(hiddenMethods);
  }, [hiddenMethods]);

  const allEntries = useLogEntries();
  const entries = useMemo(() => {
    return allEntries.filter(entry => !hiddenMethods.includes(entry.method));
  }, [allEntries, hiddenMethods]);

  const toggleMethodHidden = useCallback((methodName: string) => {
    setHiddenMethods(prev =>
      prev.includes(methodName)
        ? prev.filter(name => name !== methodName)
        : [...prev, methodName]
    );
  }, []);

  const allMethodNames = useMemo(() => {
    return [...new Set(allEntries.map(entry => entry.method))];
  }, [allEntries]);

  const scrollToEvents = useEffectEvent(() => {
    const { current: table } = containerRef;
    if (table) {
      const { parentElement, lastElementChild } = table;
      if (!parentElement || !lastElementChild) return;
      // Targeting parent instead of the table, since the table's height doesn't extend until it has content
      if (parentElement.clientHeight > lastElementChild.clientHeight) {
        parentElement.scrollIntoView({
          behavior: "smooth",
          block: "end",
          inline: "end",
        });
      } else {
        lastElementChild.scrollIntoView({
          behavior: "smooth",
          block: "end",
          inline: "start",
        });
      }
    }
  });

  // Scroll the the bottom when connecting, connected or when new entries are added
  useEffect(() => {
    if (status === "connecting" || status === "connected") {
      scrollToEvents();
    }
  }, [status, entries]);

  return (
    <Table
      containerClassName="h-full"
      className="relative overflow-y-auto"
      ref={containerRef}
    >
      <TableHeader className="sticky top-0 bg-background z-10">
        <TableRow>
          <TableHead className="w-[100px]">Part</TableHead>
          <TableHead className="w-[100px]">
            Method
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="link" size="icon">
                  <FunnelIcon className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Methods</DropdownMenuLabel>
                  {allMethodNames.map(methodName => (
                    <DropdownMenuCheckboxItem
                      key={methodName}
                      checked={!hiddenMethods.includes(methodName)}
                      onCheckedChange={() => toggleMethodHidden(methodName)}
                    >
                      {methodName}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setHiddenMethods([])}>
                    Show all
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setHiddenMethods(allMethodNames)}
                  >
                    Hide all
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableHead>
          <TableHead>Arguments</TableHead>
          <TableHead className="w-[100px] text-right">Δt [ms]</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="font-mono">
        {entries.map((entry, index) => {
          const previousEntry = entries[index - 1];
          const delta = previousEntry ? entry.when - previousEntry.when : 0;
          return (
            <TableRow key={index}>
              <TableCell className="font-medium">{entry.part}</TableCell>
              <TableCell className="font-medium">{entry.method}</TableCell>
              <TableCell className="truncate max-w-0">
                <ArgumentsContent entry={entry} />
              </TableCell>
              <TableCell className="text-right">{delta}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
