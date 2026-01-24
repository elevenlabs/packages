import { useEffect, use } from "react";

import { useLogControls } from "./log-provider";

const permissionStatus = navigator.permissions.query({ name: 'microphone' });

export function PermissionsLogger() {
    const permissions = use(permissionStatus);
    const { appendLogEntry } = useLogControls();
    useEffect(() => {
        function listener(...args: unknown[]) {
            console.log('permission change', args);
            appendLogEntry({
                part: 'permissions',
                method: 'change',
                args: [{ state: permissions.state }],
                when: Date.now()
            });
        }
        permissions.addEventListener('change', listener);
        return () => permissions.removeEventListener('change', listener);
    }, [permissions, appendLogEntry]);
    return null;
}