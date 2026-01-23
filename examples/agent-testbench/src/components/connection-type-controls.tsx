import type { ConnectionType } from '@elevenlabs/client'

import {
    Field,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"

export type ConnectionTypeControlsProps = {
    value: ConnectionType;
    onChange: (connectionType: ConnectionType) => void;
}

export function ConnectionTypeControls({ value, onChange }: ConnectionTypeControlsProps) {
    return (
        <FieldGroup>
            <Field>
                <FieldLabel>Connection Type</FieldLabel>
                <Tabs defaultValue={value} onValueChange={(value) => onChange(value as ConnectionType)}>
                    <TabsList>
                        <TabsTrigger value="webrtc">WebRTC</TabsTrigger>
                        <TabsTrigger value="websocket">WebSocket</TabsTrigger>
                    </TabsList>
                </Tabs>
            </Field>
        </FieldGroup>
    )
}