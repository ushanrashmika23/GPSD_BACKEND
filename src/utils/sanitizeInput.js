exports.onlyLettersAndNumbers = (input) => {
    const lastDot = input.lastIndexOf(".");

    if (lastDot === -1) {
        return input.replace(/[^a-zA-Z0-9]/g, "");
    }

    const name = input.slice(0, lastDot).replace(/[^a-zA-Z0-9]/g, "");
    const extension = input.slice(lastDot + 1).replace(/[^a-zA-Z0-9]/g, "");

    return `${name}.${extension}`;
};