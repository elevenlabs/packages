import { useTextContents } from "../contexts/text-contents";
import { useWidgetConfig } from "../contexts/widget-config";
import { useTerms } from "../contexts/terms";
import { Button } from "../components/Button";

export function TermsModal() {
  const text = useTextContents();
  const config = useWidgetConfig();
  const { dismissTerms, acceptTerms } = useTerms();

  return (
    <div className="max-w-[400px] flex flex-col gap-2 bg-base shadow-md pointer-events-auto rounded-sheet p-3 text-sm">
      <div
        className="flex flex-col gap-1 terms p-2 pt-1"
        dangerouslySetInnerHTML={{ __html: config.value.terms_html ?? "" }}
      />
      <div className="flex justify-end gap-2">
        <Button onClick={dismissTerms}>{text.dismiss_terms}</Button>
        <Button onClick={acceptTerms} variant="primary">
          {text.accept_terms}
        </Button>
      </div>
    </div>
  );
}
