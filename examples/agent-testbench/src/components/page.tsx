import { Pause } from "lucide-react";

export function Page({
  children,
  title,
}: React.PropsWithChildren<{ title: string }>) {
  return (
    <div className="h-screen flex flex-col w-7xl mx-auto px-2">
      <section className="p-10 text-center">
        <div className="flex flex-row items-center justify-center gap-4">
          <h1 className="text-xl md:text-xl font-black">
            <Pause
              fill="currentColor"
              stroke="none"
              height="1em"
              width="1em"
              className="inline-block align-[-0.15em]"
            />
            ElevenAgents Testbench
          </h1>
          <h2 className="text-xl">{title}</h2>
        </div>
      </section>
      {children}
    </div>
  );
}
