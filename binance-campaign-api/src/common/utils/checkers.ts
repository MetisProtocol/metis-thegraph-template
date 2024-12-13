export function isArrayOfStrings(value: string) {
    try {
        const arr = JSON.parse(value);
        return (
            Array.isArray(arr) && arr.every(elem => typeof elem === 'string')
        );
    } catch {
        return false;
    }
}

const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;
export function isEvmAddress(value: string) {
    return new RegExp(evmAddressRegex).test(value);
}

export function arrayHasAllowedValues(
    arr: unknown[],
    allowedValues: unknown[],
) {
    return arr.every(elem => allowedValues.includes(elem));
}
