const registered = [];

export function RegisterUICallback(name, cb) {
    AddEventHandler(`_npx_uiReq:${name}`, cb);

    if (GetResourceState('np-ui') === 'started') exports['np-ui'].RegisterUIEvent(name);

    registered.push(name);
}

export function SendUIMessage(data) {
    exports['np-ui'].SendUIMessage(data);
}

export function SetUIFocus(hasFocus, hasCursor) {
    exports['np-ui'].SetUIFocus(hasFocus, hasCursor);
}

export function GetUIFocus() {
    return exports['np-ui'].GetUIFocus();
}

AddEventHandler('_npx_uiReady', () => {
    registered.forEach((eventName) => exports['np-ui'].RegisterUIEvent(eventName));
});