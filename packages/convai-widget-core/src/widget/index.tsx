import { Style } from "../styles/Style";
import { AttributesProvider } from "../contexts/attributes";
import { LanguageConfigProvider } from "../contexts/language-config";
import { WidgetConfigProvider } from "../contexts/widget-config";
import { MicConfigProvider } from "../contexts/mic-config";
import { ServerLocationProvider } from "../contexts/server-location";
import { SessionConfigProvider } from "../contexts/session-config";
import { ConversationProvider } from "../contexts/conversation";
import { TextContentsProvider } from "../contexts/text-contents";
import { AvatarConfigProvider } from "../contexts/avatar-config";
import { TermsProvider } from "../contexts/terms";
import { CustomAttributes } from "../types/attributes";
import { Wrapper } from "./Wrapper";
import { SheetContentProvider } from "../contexts/sheet-content";
import { FeedbackProvider } from "../contexts/feedback";
import { WidgetSizeProvider } from "../contexts/widget-size";

export function ConvAIWidget(attributes: CustomAttributes) {
  return (
    <AttributesProvider value={attributes}>
      <ServerLocationProvider>
        <WidgetConfigProvider>
          <WidgetSizeProvider>
            <TermsProvider>
              <LanguageConfigProvider>
                <MicConfigProvider>
                  <SessionConfigProvider>
                    <ConversationProvider>
                      <TextContentsProvider>
                        <AvatarConfigProvider>
                          <SheetContentProvider>
                            <FeedbackProvider>
                              <Style />
                              <Wrapper />
                            </FeedbackProvider>
                          </SheetContentProvider>
                        </AvatarConfigProvider>
                      </TextContentsProvider>
                    </ConversationProvider>
                  </SessionConfigProvider>
                </MicConfigProvider>
              </LanguageConfigProvider>
            </TermsProvider>
          </WidgetSizeProvider>
        </WidgetConfigProvider>
      </ServerLocationProvider>
    </AttributesProvider>
  );
}
