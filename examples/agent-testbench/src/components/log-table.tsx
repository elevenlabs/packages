

import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useLogEntries } from "./log-provider";

function formatArgs(args: unknown[]) {
    return args.map(arg => {
        if (typeof arg === 'object') {
            return JSON.stringify(arg);
        }
        return String(arg);
    }).join(", ");
}

export function EventTable() {
    const entries = useLogEntries();
    return (
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
                    return (
                        <TableRow key={index}>
                            <TableCell className="font-medium">{entry.part}</TableCell>
                            <TableCell className="font-medium">{entry.method}</TableCell>
                            <TableCell className="truncate max-w-0">{formatArgs(entry.args)}</TableCell>
                            <TableCell className="text-right">{delta}</TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    )
}