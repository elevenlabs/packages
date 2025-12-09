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
import { ShadowHostProvider } from "../contexts/shadow-host";

export function ConvAIWidget(attributes: CustomAttributes) {
  return (
    <ShadowHostProvider>
      <AttributesProvider value={attributes}>
        <ServerLocationProvider>
          <WidgetConfigProvider>
            <LanguageConfigProvider>
              <TermsProvider>
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
              </TermsProvider>
            </LanguageConfigProvider>
          </WidgetConfigProvider>
        </ServerLocationProvider>
      </AttributesProvider>
    </ShadowHostProvider>
  );
}
